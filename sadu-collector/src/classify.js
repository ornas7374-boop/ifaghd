// AI vision classification of one interior photo.
// A vision-language model on Replicate returns strict JSON; every field is validated and normalised.
// The output decides: is it a usable interior, which room, which style, what objects, materials,
// colours, lighting, architecture and camera angle, and how good it is.
// The Replicate model ids and input fields are NOT assumed: they are configurable
// (SADU_VISION_MODELS) and `probe` verifies them with a real call before any collection run.

const { CLASSIFY_ROOMS, STYLES, FORBIDDEN_OBJECTS } = require("./config");

const API = "https://api.replicate.com/v1";
const DEFAULT_MODELS = ["anthropic/claude-4.5-sonnet", "anthropic/claude-4-sonnet", "anthropic/claude-3.7-sonnet"];
const SHOTS = ["wide", "medium", "detail", "aerial", "other"];
const sleepDefault = (ms) => new Promise(r => setTimeout(r, ms));

const SYSTEM = "You are an interior design and architecture photo analyst. You describe only what is clearly visible. Answer with JSON only.";

function prompt() {
  return `Analyse this photo for an interior design reference library.

Return ONLY this JSON (no other text):
{
 "is_interior": <true only if it shows the inside of a real room, not an exterior, floor plan, product cut-out, close-up of a single object or a sketch>,
 "shot": "<wide | medium | detail | aerial | other>",
 "room": "<${CLASSIFY_ROOMS.join(" | ")} | other>",
 "room_confidence": <0..1>,
 "style": "<${STYLES.join(" | ")} | other>",
 "quality": <0..1: sharpness, exposure, composition, realism, professional look>,
 "has_people": <true/false>,
 "has_text_or_watermark": <true/false>,
 "objects": [<up to 12 furniture and fixtures actually visible, short lowercase English names, e.g. "sofa","coffee table","kitchen island">],
 "materials": [<up to 8 from: wood, marble, stone, concrete, glass, metal, brass, leather, velvet, linen, boucle, rattan, plaster, tile, fabric>],
 "colors": [<up to 5 dominant colour names>],
 "lighting": "<short: natural daylight | warm evening | cove led | spotlights | mixed ...>",
 "architecture": [<up to 6 fixed elements, e.g. "floor-to-ceiling window","dropped ceiling","wood slats","arched niche","column">],
 "camera": {"angle": "<eye-level | high | low | corner | frontal>", "composition": "<short>"},
 "summary": "<one English sentence>"
}
Rules: "room" is decided by fixed elements (sink, stove, toilet, built-in wardrobe) before furniture. Use "other" when unsure. Never list an object you cannot see.`;
}

const clamp01 = (x, d = null) => { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d; };
const strList = (a, max, len = 40) => (Array.isArray(a) ? a.map(s => String(s).toLowerCase().trim().slice(0, len)).filter(Boolean).slice(0, max) : []);

/** Validate and normalise the model's JSON. Throws on anything unusable. */
function parseAnswer(text) {
  if (typeof text !== "string") throw new Error("classify_no_text");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e <= s) throw new Error("classify_no_json");
  let j; try { j = JSON.parse(text.slice(s, e + 1)); } catch { throw new Error("classify_bad_json"); }
  const room = CLASSIFY_ROOMS.includes(j.room) ? j.room : "other";
  const style = STYLES.includes(j.style) ? j.style : "other";
  const objects = strList(j.objects, 12);
  const conflicts = (FORBIDDEN_OBJECTS[room] || []).filter(f => objects.some(o => o === f || o.includes(f)));
  return {
    isInterior: j.is_interior === true,
    shot: SHOTS.includes(j.shot) ? j.shot : "other",
    room, roomConfidence: clamp01(j.room_confidence, 0),
    style, quality: clamp01(j.quality, 0),
    hasPeople: j.has_people === true,
    hasTextOrWatermark: j.has_text_or_watermark === true,
    objects, materials: strList(j.materials, 8), colors: strList(j.colors, 5),
    lighting: String(j.lighting || "").slice(0, 60),
    architecture: strList(j.architecture, 6, 60),
    camera: { angle: String((j.camera && j.camera.angle) || "").slice(0, 20), composition: String((j.camera && j.camera.composition) || "").slice(0, 80) },
    summary: String(j.summary || "").slice(0, 240),
    conflicts
  };
}

/**
 * Create a classifier bound to a Replicate token.
 * Remembers the model id that worked, retries 429/5xx with backoff, and reports clear errors.
 */
function createClassifier({ token, models, fetchImpl = globalThis.fetch, sleep = sleepDefault, log = () => {} } = {}) {
  if (!token) throw new Error("REPLICATE_API_TOKEN is required for classification");
  const list = models && models.length ? models : DEFAULT_MODELS;
  let working = null;

  async function call(path, body, wait) {
    for (let attempt = 0; ; attempt++) {
      const r = await fetchImpl(API + path, {
        method: body ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(wait ? { Prefer: `wait=${wait}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
      if ((r.status === 429 || r.status >= 500) && attempt < 4) {
        const ra = Number(r.headers && r.headers.get && r.headers.get("retry-after"));
        const ms = Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : Math.min(2000 * 2 ** attempt, 20_000);
        log("warn", "vision_retry", { status: r.status, waitMs: ms }); await sleep(ms); continue;
      }
      const data = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data };
    }
  }

  return {
    get model() { return working; },
    /** @param {string} dataUri a JPEG data URI */
    async classify(dataUri) {
      const order = working ? [working, ...list.filter(m => m !== working)] : list;
      const input = { prompt: prompt(), system_prompt: SYSTEM, image: dataUri, max_tokens: 700 };
      const tried = [];
      for (const model of order) {
        const res = await call(`/models/${model}/predictions`, { input }, 45);
        if (res.status === 404 || res.status === 422) { tried.push(`${model}:${res.status}`); continue; }
        if (res.status === 401) throw Object.assign(new Error("replicate_auth"), { fatal: true });
        if (res.status === 402) throw Object.assign(new Error("replicate_no_credit"), { fatal: true });
        if (!res.ok) throw new Error(`replicate_${res.status}`);
        let p = res.data;
        for (let i = 0; i < 30 && (p.status === "starting" || p.status === "processing"); i++) { await sleep(1500); p = (await call(`/predictions/${p.id}`)).data; }
        if (p.status !== "succeeded") throw new Error(`classify_${p.status || "failed"}`);
        working = model;
        const out = Array.isArray(p.output) ? p.output.join("") : p.output;
        return { ...parseAnswer(out), model };
      }
      throw Object.assign(new Error("vision_model_unavailable"), { fatal: true, detail: tried.join("; ") });
    }
  };
}

module.exports = { createClassifier, parseAnswer, prompt, DEFAULT_MODELS };
