// sadu — sends the photo of the corner or room and returns the setup design.
// Google Gemini only: the key is read from GEMINI_API_KEY on the server and never reaches the browser.
//
// POST /api/design   { image: "data:image/jpeg;base64,...", plan }  (or the legacy { style, room })
//   -> { status: "succeeded", output: "data:image/...;base64,..." }

// Setup focus: spaces, styles and the preservation rule live in _lib/setup.js (shared with analysis).
const { STYLES, buildPrompt } = require("./_lib/setup");
// Descriptions of the existing floor / walls / ceiling from the analysis step; they are put into
// the prompt as things to keep. Walls stay protected here (no wall change yet).
const briefOf = (b) => ({
  request: typeof b.request === "string" ? b.request : "",
  placement: typeof b.placement === "string" ? b.placement : "",
  use: typeof b.use === "string" ? b.use : "",
  changes: Array.isArray(b.changes) ? b.changes.map(String).filter(x => /^[a-z_]{2,20}$/.test(x)).slice(0, 6) : []
});
// Prompt for a request: a SIGNED plan from /api/plan (the Planning Engine decides, we only draw it),
// or the legacy style path. Returns {prompt} or {error}.
const { verify } = require("./_lib/planner");
const { planSecret } = require("./plan");
function promptFor(b) {
  if (b.plan) {
    const ri = b.plan.rendering_instructions;
    if (!ri || !verify(ri, planSecret())) return { error: "plan_not_signed" };
    return { prompt: ri.prompt };
  }
  if (!STYLES[b.style]) return { error: "bad_style" };
  return { prompt: buildPrompt(b.style, b.room, { keep: keepOf(b.keep), ...briefOf(b) }) };
}
const keepOf = (k) => (k && typeof k === "object" ? { floor: k.floor, walls: k.walls, ceiling: k.ceiling } : {});

function reply(res, code, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json(body);
}

module.exports = async function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) return reply(res, 500, { status: "failed", error: "missing_token" });
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const pr = promptFor(b);
    if (pr.error) return reply(res, 400, { status: "failed", error: pr.error });
    if (typeof b.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.image)) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (b.image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });
    try {
      const g = await require("./_lib/gemini").generateImage(process.env.GEMINI_API_KEY, b.image, pr.prompt, { model: process.env.GEMINI_IMAGE_MODEL || undefined });
      return reply(res, 200, { status: "succeeded", output: g.output });
    } catch (e) {
      return reply(res, 502, { status: "failed", error: e.message || "gemini_failed", detail: e.detail || "" });
    }
  } catch (e) {
    return reply(res, 500, { status: "failed", error: "server_error" });
  }
};
