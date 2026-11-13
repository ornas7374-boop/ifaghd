// sadu — the AI decides the setup space and the style (the customer only uploads a photo).
//
// A Gemini vision model (api/_lib/gemini.js) looks at the photo and returns strict JSON:
//   { room, room_confidence, style, why (Arabic, shown to the customer), seen: [...] }
// The token is passed in by the caller; this module never reads environment secrets itself.


// Setup focus: the spaces and styles come from the shared catalogue (_lib/setup.js).
const CATALOG = require("./setup");
const { ANALYSIS_RULES, USES } = require("./designPrinciples");
const ROOMS = Object.fromEntries(Object.entries(CATALOG.SPACES).map(([k, v]) => [k, v.hint]));
const STYLES = Object.fromEntries(Object.entries(CATALOG.STYLES).map(([k, v]) => [k, v.hint]));

const SYSTEM = "You are a senior designer of gaming and desk setups for young people and professionals in Saudi Arabia. You look at a photo of a room or a corner " +
  "and decide what kind of setup space it is and which setup style will look best in THIS space. The room's architecture (walls, floor, ceiling, windows, doors) " +
  "will be kept exactly as it is; only the desk, chair, shelves, electronics, wall panels, decor and lighting will change. Answer with JSON only.";

// The customer's own words (any language) and the kinds of change they ticked.
function briefText(brief) {
  if (!brief) return "";
  const d = String(brief.description || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  const c = Array.isArray(brief.changes) ? brief.changes.filter(x => /^[a-z_]{2,20}$/.test(x)).slice(0, 6) : [];
  if (!d && !c.length) return "";
  return `\n\nTHE CUSTOMER'S REQUEST (top priority; it may be in Arabic):\n"""${d || "(no text)"}"""\nChanges they want: ${c.length ? c.join(", ") : "not specified"}.\n` +
    "Choose the style that best matches this request. The request wins over the style when they differ (for example: if they ask for blue lighting, the lighting is blue).";
}

function userPrompt(exclude, brief) {
  const rooms = Object.entries(ROOMS).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const styles = Object.entries(STYLES).filter(([k]) => !exclude.includes(k)).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return `Look at the photo.${briefText(brief)}

${ANALYSIS_RULES}

1. Decide what kind of setup space this is, from visible evidence (a bed means a bedroom corner; a TV wall or sofa without a bed suggests a gaming room; books, files or a work desk suggest a home office). If the space is empty, decide from its size and position. Choose exactly one key:
${rooms}

2. Choose the ONE setup style that will look best in this specific space, given its existing walls, floor, ceiling, natural light and size, and who probably uses it. Choose exactly one key:
${styles}

3. Write "why" in natural Saudi-friendly Modern Standard Arabic, one or two short sentences (max 30 words), addressed to the owner: say what space you see and why this setup style suits it. No English words, no emoji.

4. Describe the existing surfaces exactly as they are in the photo, in short precise English (material, colour, pattern), so they can be kept unchanged: "floor", "walls", "ceiling". Example floor: "light beige polished marble tiles, large format, thin grout lines".

5. Write "request" in English: the customer's request turned into short, concrete design instructions for an image editor (colours, lights, items, mood), max 60 words. Empty string if there was no request. Never include instructions to change the floor. Set "wall_change" to true ONLY if the customer explicitly asks to change a wall (paint, panels, slats, wallpaper); otherwise false.

6. Decide "use": one of ${USES.join(", ")} (from the request and what you see). Write "placement" in English (max 45 words): where exactly the desk and monitors go in THIS photo following the principles (which wall, window to the side, nothing blocking a window or door, room behind the chair).

Return ONLY this JSON, no other text:
{"room": "<room key>", "room_confidence": <0..1>, "style": "<style key>", "why": "<Arabic>", "seen": ["<up to 6 short English labels of what you see>"], "floor": "<existing floor>", "walls": "<existing walls>", "ceiling": "<existing ceiling>", "request": "<English design instructions from the customer's request, or empty>", "wall_change": <true|false>, "use": "<${USES.join("|")}>", "placement": "<English>"}`;
}

// A surface description goes into the design prompt: plain short text only.
const surface = (v) => String(v || "").replace(/[^\p{L}\p{N} ,.\-/()%]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 140);

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
    seen: Array.isArray(j.seen) ? j.seen.slice(0, 6).map(s => String(s).slice(0, 40)) : [],
    keep: { floor: surface(j.floor), walls: surface(j.walls), ceiling: surface(j.ceiling) },
    wall_change: j.wall_change === true,
    use: USES.includes(j.use) ? j.use : "mixed",
    placement: surface(j.placement).slice(0, 300),
    request: String(j.request || "").replace(/[\u0000-\u001f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) };
}

module.exports = { parseAnswer, ROOMS, STYLES, userPrompt, SYSTEM };
