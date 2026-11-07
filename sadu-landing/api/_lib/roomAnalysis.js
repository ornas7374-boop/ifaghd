// sadu — the AI decides the room type and the style (the customer only uploads a photo).
//
// A vision-language model on Replicate looks at the photo and returns strict JSON:
//   { room, room_confidence, style, why (Arabic, shown to the customer), seen: [...] }
// Model ids are tried in order until one exists on the account (SADU_VISION_MODELS overrides).
// The token is passed in by the caller; this module never reads environment secrets itself.

const API = "https://api.replicate.com/v1";
const DEFAULT_MODELS = ["anthropic/claude-4.5-sonnet", "anthropic/claude-4-sonnet", "anthropic/claude-3.7-sonnet"];

const ROOMS = {
  majlis_men: "Saudi men's majlis: formal guest room, seating along the walls, often near the entrance",
  majlis_women: "Saudi women's majlis: formal guest sitting room for women, softer and more decorative",
  living: "family living room / lounge with sofas and a TV",
  bedroom: "bedroom (bed, wardrobe, bedside tables)",
  annex: "guest annex (mulhaq) or outdoor-adjacent lounge, casual gathering space",
  dining: "dining room / muqallat (dining table or floor dining area)",
  kitchen: "kitchen (cabinets, counters, sink, stove, appliances)",
  bathroom: "bathroom (toilet, sink, shower or tub)",
  dressing: "walk-in dressing room / closet",
  office: "home office or study (desk, chair, shelves)"
};

// When each style suits a room. The architecture is preserved, so the style must harmonise
// with the existing floor, walls, ceiling and light.
const STYLES = {
  night_luxury: "dark, dramatic, warm low lighting: bedrooms, media/living rooms, evening majlis; rooms with little daylight or dark existing finishes",
  warm_luxury: "light cream/beige, wood, marble, gold accents: bright rooms with daylight, living rooms, women's majlis, dining rooms, light kitchens",
  quiet_luxury: "calm monochrome greige, soft and minimal: bedrooms, dressing rooms, small or medium rooms",
  najdi: "traditional Najdi: men's majlis, annex, rooms with earthy or traditional character",
  hijazi: "traditional Hijazi with carved wood and teal: majlis or living rooms that suit wood and pattern",
  gulf_modern: "modern Gulf, neutral and elegant: versatile for living rooms, majlis and offices",
  classic_luxury: "grand classic Arabian: large formal majlis or dining rooms with generous ceiling height",
  neoclassic: "refined light neoclassical: bright formal rooms, especially with existing mouldings",
  calm_modern: "simple calm modern, natural wood and linen: small rooms, kids' rooms, offices, practical spaces",
  boho_gulf: "relaxed Gulf bohemian with rugs and natural materials: annex, casual lounges",
  emirati: "contemporary heritage with palm-weave textures: majlis and living rooms"
};

const SYSTEM = "You are a senior interior architect for homes in Saudi Arabia. You look at a photo of an existing room and decide " +
  "what the room is and which interior style will look best in THIS room. The room's architecture (walls, floor, ceiling, windows, doors) " +
  "will be kept exactly as it is; only furniture, textiles, lighting fixtures and decor will change. Answer with JSON only.";

function userPrompt(exclude) {
  const rooms = Object.entries(ROOMS).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const styles = Object.entries(STYLES).filter(([k]) => !exclude.includes(k)).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return `Look at the photo.

1. Decide the room type from visible evidence (fixed elements such as a sink, stove, toilet or built-in wardrobe count more than movable furniture). If the room is empty, decide from its size, windows, doors, finishes and position. Choose exactly one key:
${rooms}

2. Choose the ONE style that will look best in this specific room, given its existing floor, wall colour, ceiling, natural light and size, and given how the room is used. Choose exactly one key:
${styles}

3. Write "why" in natural Saudi-friendly Modern Standard Arabic, one or two short sentences (max 30 words), addressed to the homeowner: say what room you see and why this style suits it. No English words, no emoji.

Return ONLY this JSON, no other text:
{"room": "<room key>", "room_confidence": <0..1>, "style": "<style key>", "why": "<Arabic>", "seen": ["<up to 6 short English labels of what you see>"]}`;
}

/** Extract and validate the model's JSON answer. */
function parseAnswer(text, exclude = []) {
  if (typeof text !== "string") throw new Error("analysis_no_text");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("analysis_no_json");
  let j;
  try { j = JSON.parse(text.slice(start, end + 1)); } catch { throw new Error("analysis_bad_json"); }
  const room = String(j.room || "").trim(), style = String(j.style || "").trim();
  if (!ROOMS[room]) throw new Error("analysis_bad_room");
  if (!STYLES[style] || exclude.includes(style)) throw new Error("analysis_bad_style");
  let why = String(j.why || "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (!why) why = "";
  const conf = Number(j.room_confidence);
  return { room, style, why, confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : null,
    seen: Array.isArray(j.seen) ? j.seen.slice(0, 6).map(s => String(s).slice(0, 40)) : [] };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function call(token, path, body, wait) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(wait ? { Prefer: `wait=${wait}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      // rate limited (Replicate is strict on low-credit accounts): wait as asked, then retry
      const ra = Number(r.headers && r.headers.get && r.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 12) * 1000 : 2000 * 2 ** attempt);
      continue;
    }
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
}

// The model id that worked last time on this server instance is tried first, so a normal
// request costs one call instead of walking the fallback list.
let workingModel = null;

const outputText = (out) => (Array.isArray(out) ? out.join("") : typeof out === "string" ? out : "");

/**
 * @param {string} token  Replicate token
 * @param {string} image  data URI of the room photo
 * @param {{exclude?: string[], models?: string[]}} opts
 */
async function analyzeRoom(token, image, opts = {}) {
  const exclude = (opts.exclude || []).filter(s => STYLES[s]).slice(0, 10);
  if (exclude.length >= Object.keys(STYLES).length) exclude.length = 0;
  let models = opts.models && opts.models.length ? opts.models : DEFAULT_MODELS;
  if (workingModel && models.includes(workingModel)) models = [workingModel, ...models.filter(m => m !== workingModel)];
  const input = { prompt: userPrompt(exclude), system_prompt: SYSTEM, image, max_tokens: 400 };
  const tried = [];
  for (const model of models) {
    const res = await call(token, `/models/${model}/predictions`, { input }, 45);
    if (res.status === 404 || res.status === 422) { tried.push(`${model}: ${res.status}`); await sleep(1200); continue; }
    if (!res.ok) { const e = new Error(`replicate_${res.status}`); e.detail = String(res.data.detail || "").slice(0, 200); throw e; }
    let p = res.data;
    for (let i = 0; i < 20 && (p.status === "starting" || p.status === "processing"); i++) {
      await new Promise(r => setTimeout(r, 1500));
      p = (await call(token, `/predictions/${p.id}`)).data;
    }
    if (p.status !== "succeeded") { const e = new Error("analysis_failed"); e.detail = String(p.error || p.status).slice(0, 200); throw e; }
    workingModel = model;
    return { ...parseAnswer(outputText(p.output), exclude), model };
  }
  const e = new Error("analysis_model_unavailable");
  e.detail = tried.join("; ");
  throw e;
}

module.exports = { _resetWorkingModel: () => { workingModel = null; }, analyzeRoom, parseAnswer, ROOMS, STYLES, DEFAULT_MODELS, userPrompt, SYSTEM };
