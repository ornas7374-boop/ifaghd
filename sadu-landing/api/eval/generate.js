// POST /api/eval/generate { method:"A"|"C", image, style, room, inpaint?, seed? } — preview only
// GET  /api/eval/generate?id=...   → { status, image } when ready
const sharp = require("sharp");
const { guard, body, imageFromDataUri } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");
const { decodeMask } = require("../_lib/masks");
const { STYLES, ROOM_PIECES, promptA, promptC } = require("../_lib/strictPrompts");
const { MODELS } = require("../_lib/evalModels");

async function maskPng(mask, width, height) { // white = regenerate, black = keep (flux-fill convention)
  const px = Buffer.alloc(mask.w * mask.h);
  for (let i = 0; i < px.length; i++) px[i] = mask.data[i] ? 255 : 0;
  const png = await sharp(px, { raw: { width: mask.w, height: mask.h, channels: 1 } })
    .resize(width, height, { fit: "fill", kernel: "nearest" }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function finish(res, p) {
  const s = rep.summarize(p);
  if (p.status === "starting" || p.status === "processing") return res.status(200).json({ status: "processing", id: p.id });
  if (p.status !== "succeeded") return res.status(200).json({ status: "failed", error: s.error || p.status });
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  const buf = await rep.fetchOutput(url);
  const jpg = await sharp(buf, { limitInputPixels: 40e6 }).jpeg({ quality: 90 }).toBuffer();
  res.status(200).json({ status: "succeeded", predictTime: s.predictTime, image: `data:image/jpeg;base64,${jpg.toString("base64")}` });
}

module.exports = async (req, res) => {
  const token = guard(req, res, { methods: ["POST", "GET"] });
  if (!token) return;
  try {
    if (req.method === "GET") return finish(res, await rep.getPrediction(token, req.query.id));
    const { method, image, style, room, inpaint, seed } = body(req);
    if (!STYLES[style]) return res.status(400).json({ error: "bad_style" });
    const roomKey = ROOM_PIECES[room] ? room : "other";
    const buf = imageFromDataUri(image);
    const seedInput = Number.isInteger(seed) && seed >= 0 && seed < 2 ** 31 ? { seed } : {};
    let p;
    if (method === "A") {
      p = await rep.createPrediction(token, MODELS.A, { prompt: promptA(style, roomKey), input_image: image,
        aspect_ratio: "match_input_image", output_format: "jpg", safety_tolerance: 2, ...seedInput }, { waitSec: 50 });
    } else if (method === "C") {
      const meta = await sharp(buf, { limitInputPixels: 40e6 }).metadata();
      const mask = await maskPng(decodeMask(inpaint), meta.width, meta.height);
      p = await rep.createPrediction(token, MODELS.C, { prompt: promptC(style, roomKey), image, mask,
        output_format: "jpg", safety_tolerance: 2, ...seedInput }, { waitSec: 50 });
    } else return res.status(400).json({ error: "bad_method" });
    return finish(res, p);
  } catch (e) {
    res.status(e.status && e.status < 500 ? 400 : 502).json({ status: "failed", error: e.message, detail: e.detail });
  }
};
