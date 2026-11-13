// sadu — POST /api/plan { image, brief: {description, budget_sar, changes}, exclude?: [styleKeys] }
//   → { status: "succeeded", plan }   (the Planning Engine: observe once, then plan / validate in code)
// The plan's rendering instruction is signed with a server-only secret; /api/design draws only signed plans.
const crypto = require("crypto");
const { perceive } = require("./_lib/planner/perceive");
const { planDesign } = require("./_lib/planner");
const { readImage } = require("./_lib/imageInput");

function reply(res, code, body) { res.setHeader("Cache-Control", "no-store"); res.status(code).json(body); }

/** Server-only signing secret derived from a server key (never sent to the browser). */
function planSecret(env = process.env) {
  const base = env.SADU_PLAN_SECRET || env.GEMINI_API_KEY || "";
  return base ? crypto.createHash("sha256").update(`sadu-plan:${base}`).digest("hex") : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply(res, 500, { status: "failed", error: "missing_token" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const image = await readImage(body.image);
    if (!image) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });
    const b = body.brief && typeof body.brief === "object" ? body.brief : {};
    const brief = { description: typeof b.description === "string" ? b.description.slice(0, 600) : "", budget_sar: Number(b.budget_sar) || null,
      changes: Array.isArray(b.changes) ? b.changes.map(String).slice(0, 6) : [] };
    const exclude = Array.isArray(body.exclude) ? body.exclude.map(String).slice(0, 10) : [];
    const p = await perceive(key, image, brief, { exclude, model: process.env.GEMINI_VISION_MODEL || undefined });
    const plan = planDesign({ ...p, brief, secret: planSecret(), amazonTag: process.env.SADU_AMAZON_TAG || "" });
    return reply(res, 200, { status: "succeeded", plan, model: p.model });
  } catch (e) {
    return reply(res, 502, { status: "failed", error: e.message || "plan_failed", detail: e.detail || "" });
  }
};
module.exports.planSecret = planSecret;
