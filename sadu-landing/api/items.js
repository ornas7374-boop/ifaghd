// sadu — POST /api/items { image } → { status, items[], total_min, total_max }
// "Shop the look": the furnishings in a design image, approximate price in SAR, store search links.
// image: a data URI (the design result from Gemini is also a data URI).

const { shopItems } = require("./_lib/shopItems");

function reply(res, code, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json(body);
}

const { toDataUri } = require("./_lib/imageInput");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply(res, 500, { status: "failed", error: "missing_token" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    let image = body.image;
    if (typeof image === "string" && /^https:\/\//.test(image)) image = await toDataUri(image);
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (image.length > 8_500_000) return reply(res, 413, { status: "failed", error: "too_large" });
    const r = await shopItems(key, image, { model: process.env.GEMINI_VISION_MODEL || undefined, amazonTag: process.env.SADU_AMAZON_TAG || "" });
    return reply(res, 200, { status: "succeeded", items: r.items, total_min: r.total_min, total_max: r.total_max, approximate: true });
  } catch (e) {
    return reply(res, 502, { status: "failed", error: e.message || "items_failed", detail: e.detail || "" });
  }
};
