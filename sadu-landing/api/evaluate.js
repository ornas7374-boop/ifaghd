// sadu — POST /api/evaluate { original, generated, plan } → { status: "succeeded", evaluation }
// Quality Evaluation Engine: compares the original photo, the plan and the result; says what failed and
// whether to regenerate or re-plan. Preservation here is a visual check; pixel checks are reported as not tested.
const { evaluateResult } = require("./_lib/planner/evaluate");
const { readImage } = require("./_lib/imageInput");

function reply(res, code, body) { res.setHeader("Cache-Control", "no-store"); res.status(code).json(body); }

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply(res, 500, { status: "failed", error: "missing_token" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const [original, generated] = await Promise.all([readImage(body.original), readImage(body.generated)]);
    if (!original || !generated) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (original.length + generated.length > 4_200_000) return reply(res, 413, { status: "failed", error: "too_large" });
    const plan = body.plan && typeof body.plan === "object" ? body.plan : null;
    if (!plan || !plan.color_palette || !Array.isArray(plan.furniture_placement)) return reply(res, 400, { status: "failed", error: "bad_plan" });
    const evaluation = await evaluateResult(key, original, generated, plan, { model: process.env.GEMINI_VISION_MODEL || undefined });
    return reply(res, 200, { status: "succeeded", evaluation });
  } catch (e) {
    return reply(res, 502, { status: "failed", error: e.message || "evaluate_failed", detail: e.detail || "" });
  }
};
