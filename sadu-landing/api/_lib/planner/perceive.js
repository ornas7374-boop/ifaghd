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

Fill in this JSON. It is an EXAMPLE with made-up values: replace every value with what you see, keep the same keys, numbers as plain numbers between 0 and 1.
Field rules:
- space: one of ${Object.keys(SPACES).join(", ")} (${spaces})
- style: one of ${Object.keys(STYLES).filter(k => !exclude.includes(k)).join(", ")} (${styles})
- why: one or two short sentences in natural Modern Standard Arabic for the owner: what you see and why this style suits it
- camera.view: frontal|corner|angled; camera.height: eye|high|low
- size.class: small|medium|large; width_m / depth_m: a number only if you can base it on something visible (say what in "basis"), otherwise null
- furniture.type: bed|desk|chair|sofa|wardrobe|shelf|tv|tv_unit|dresser|table|plant|other
- intent.use: gaming|streaming|work|study|mixed; intent.wall_change: true only if the customer explicitly asks to change a wall
- intent.request_en: the customer's request as short concrete English design instructions (max 60 words), never about changing the floor; "" if none

Return ONLY valid JSON, no comments, no text around it:
{"space":"setup_corner","style":"grey_tech","why":"...",
"camera":{"view":"frontal","height":"eye","certainty":"estimated"},
"size":{"class":"medium","width_m":null,"depth_m":null,"basis":""},
"surfaces":{"floor":"light grey porcelain tiles","walls":"white matte paint","ceiling":"flat white with recessed spots"},
"walls":[{"id":"left","x_from":0.0,"x_to":0.2,"free_from":0.0,"free_to":0.2,"certainty":"confirmed"},{"id":"back","x_from":0.2,"x_to":0.8,"free_from":0.25,"free_to":0.8,"certainty":"confirmed"}],
"windows":[{"wall":"left","x0":0.03,"x1":0.17,"y0":0.1,"y1":0.6,"certainty":"confirmed"}],
"doors":[],
"outlets":[{"wall":"back","x":0.3,"y":0.65,"certainty":"estimated"}],
"furniture":[],
"obstacles":[],
"light":{"natural":"medium","window_side":"left","artificial":["recessed spots"]},
"intent":{"use":"mixed","colors":[],"avoid":[],"devices":[],"style_words":[],"keep":[],"wall_change":false,"request_en":""}}
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
  const fail = (code) => { const e = new Error(code); e.detail = `len ${text.length}; start: ${text.slice(0, 160)} … end: ${text.slice(-160)}`; return e; };
  if (a < 0 || b <= a) throw fail("perceive_no_json");
  const body = text.slice(a, b + 1);
  try { return JSON.parse(body); } catch { /* try a tolerant read below */ }
  // common model slips: comments, trailing commas, ranges like 0-1 copied from instructions
  const cleaned = body.replace(/\/\/[^\n]*/g, "").replace(/,\s*([}\]])/g, "$1").replace(/:\s*0-1\b/g, ": null");
  try { return JSON.parse(cleaned); } catch { throw fail("perceive_bad_json"); }
}

/** One Gemini call: image + request -> raw observations and intent. */
async function perceive(key, image, brief, opts = {}) {
  const { visionJSON } = require("../gemini");
  const r = await visionJSON(key, image, { system: SYSTEM, prompt: perceivePrompt(brief, opts.exclude || []), model: opts.model, budgetMs: opts.budgetMs || 50000, maxTokens: 6000 });
  return { ...splitPerception(parseJson(r.text)), model: r.model };
}

module.exports = { perceive, perceivePrompt, splitPerception, parseJson, SYSTEM };
