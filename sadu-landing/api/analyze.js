// sadu — POST /api/analyze { image, exclude?: [styleKeys] }
//   → { status: "succeeded", room, style, why, confidence }
// The AI decides the room type and the most suitable style; the customer only uploads a photo.

const { analyzeRoom } = require("./_lib/roomAnalysis");

function reply(res, code, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  // Provider: Gemini when SADU_PROVIDER=gemini (and GEMINI_API_KEY is set), otherwise Replicate.
  const useGemini = process.env.SADU_PROVIDER === "gemini";
  const token = useGemini ? process.env.GEMINI_API_KEY : process.env.REPLICATE_API_TOKEN;
  if (!token) return reply(res, 500, { status: "failed", error: "missing_token" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { image, exclude, brief } = body;
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });
    const models = process.env.SADU_VISION_MODELS ? process.env.SADU_VISION_MODELS.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    const ex = Array.isArray(exclude) ? exclude.map(String) : [];
    const r = useGemini
      ? await require("./_lib/gemini").analyzeRoomGemini(token, image, { exclude: ex, brief, model: process.env.GEMINI_VISION_MODEL || undefined })
      : await analyzeRoom(token, image, { exclude: ex, brief, models });
    return reply(res, 200, { status: "succeeded", room: r.room, style: r.style, why: r.why, confidence: r.confidence, seen: r.seen, keep: r.keep, request: r.request, wall_change: r.wall_change, use: r.use, placement: r.placement, model: r.model });
  } catch (e) {
    return reply(res, 502, { status: "failed", error: e.message || "analysis_failed", detail: e.detail || "" });
  }
};
