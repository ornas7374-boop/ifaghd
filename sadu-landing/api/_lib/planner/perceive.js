// sadu Planning Engine — perception: the ONE vision-model call of the planner.
// The model is asked to OBSERVE and report (with certainty), never to decide placements or prices.
// Its answer is raw input for roomUnderstanding.js and intent.js, which check and normalise it.
const { SPACES, STYLES } = require("../setup");

const SYSTEM = "You are a careful interior surveyor. You look at a photo of a room or corner and report what is visible, " +
  "with honest certainty. You never invent measurements: if something cannot be seen or measured, say so. Answer with JSON only.";

function briefBlock(brief) {
  const d = String((brief && brief.description) || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  return d ? `\nTHE CUSTOMER'S REQUEST (may be Arabic): """${d}"""\n` : "\nThe customer wrote no request.\n";
}

function perceivePrompt(brief, exclude = []) {
  const spaces = Object.entries(SPACES).map(([k, v]) => `${k} (${v.hint})`).join("; ");
  const styles = Object.entries(STYLES).filter(([k]) => !exclude.includes(k)).map(([k, v]) => `${k} (${v.hint})`).join("; ");
  return `Survey this photo for planning a desk / gaming / streaming setup.${briefBlock(brief)}
Coordinates: x is the horizontal position in the image from 0 (left edge) to 1 (right edge); y from 0 (top) to 1 (bottom).
Walls: "left", "back" (facing the camera) and "right" as seen in the photo. Give each visible wall's horizontal extent in the image.
Certainty for every item: "confirmed" (clearly visible), "estimated" (partly visible or inferred) or "unknown".

Report ONLY this JSON:
{
 "space": one of ${Object.keys(SPACES).join(", ")} — ${spaces},
 "style": the setup style that suits THIS room and request, one of ${Object.keys(STYLES).filter(k => !exclude.includes(k)).join(", ")} — ${styles},
 "why": "one or two short sentences in natural Modern Standard Arabic for the owner: what you see and why this style suits it",
 "camera": {"view": "frontal|corner|angled", "height": "eye|high|low", "certainty": "..."},
 "size": {"class": "small|medium|large", "width_m": number or null, "depth_m": number or null, "basis": "what the estimate is based on (e.g. floor tiles 60 cm, door 90 cm) or empty"},
 "surfaces": {"floor": "material, colour, pattern", "walls": "paint colour/texture", "ceiling": "shape and lights"},
 "walls": [{"id": "left|back|right", "x_from": 0-1, "x_to": 0-1, "free_from": 0-1, "free_to": 0-1, "certainty": "..."}],
 "windows": [{"wall": "...", "x0": 0-1, "x1": 0-1, "y0": 0-1, "y1": 0-1, "certainty": "..."}],
 "doors": [{"wall": "...", "x0": 0-1, "x1": 0-1, "y0": 0-1, "y1": 0-1, "certainty": "..."}],
 "outlets": [{"wall": "...", "x": 0-1, "y": 0-1, "certainty": "..."}],
 "furniture": [{"type": "bed|desk|chair|sofa|wardrobe|shelf|tv|tv_unit|dresser|table|plant|other", "wall": "...", "x0": 0-1, "x1": 0-1, "certainty": "..."}],
 "obstacles": [{"what": "radiator, AC unit, column, pipe...", "wall": "...", "x0": 0-1, "x1": 0-1}],
 "light": {"natural": "none|low|medium|high", "window_side": "left|back|right|none", "artificial": ["existing light sources"]},
 "intent": {"use": "gaming|streaming|work|study|mixed", "colors": ["colours the customer wants"], "avoid": ["colours to avoid"], "devices": ["devices mentioned"],
   "style_words": ["minimal, cosy, luxury..."], "keep": ["things the customer keeps or already owns"], "wall_change": true only if they explicitly ask to change a wall,
   "request_en": "the request as short concrete English design instructions (max 60 words), never about changing the floor; empty if no request"}
}
Use empty arrays when nothing is visible. Do not guess positions you cannot see.`;
}

/** Split the model's answer into the parts the engines take. */
function splitPerception(raw) {
  const j = raw && typeof raw === "object" ? raw : {};
  const { intent = {}, space, style, why, ...observations } = j;
  return { observations, aiIntent: intent && typeof intent === "object" ? intent : {}, suggested: { space, style, why: String(why || "").replace(/\s+/g, " ").trim().slice(0, 240) } };
}

function parseJson(text) {
  if (typeof text !== "string") throw new Error("perceive_no_text");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("perceive_no_json");
  try { return JSON.parse(text.slice(a, b + 1)); } catch { throw new Error("perceive_bad_json"); }
}

/** One Gemini call: image + request -> raw observations and intent. */
async function perceive(key, image, brief, opts = {}) {
  const { visionJSON } = require("../gemini");
  const r = await visionJSON(key, image, { system: SYSTEM, prompt: perceivePrompt(brief, opts.exclude || []), model: opts.model, budgetMs: opts.budgetMs || 50000, maxTokens: 3000 });
  return { ...splitPerception(parseJson(r.text)), model: r.model };
}

module.exports = { perceive, perceivePrompt, splitPerception, parseJson, SYSTEM };
