// POST /api/eval/segment { image }  → masks (or {status:"processing", id})
// GET  /api/eval/segment?id=...&aspect=1.333 → masks when ready      — preview only
const sharp = require("sharp");
const { guard, body, imageFromDataUri } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");
const seg = require("../_lib/segmentation");
const { buildMasks, encodeMasks } = require("../_lib/masks");

const ROLE_COLOURS = { window: [80, 160, 255], door: [255, 170, 60], ceiling: [200, 200, 200], wall: [150, 120, 255], column: [255, 80, 200], builtin: [255, 80, 200] };

async function preview(m) { // small colour overlay of the protected elements, for a visual check
  const { w, h } = m.editable, px = Buffer.alloc(w * h * 3, 30);
  for (let i = 0; i < w * h; i++) if (m.occluders.data[i]) { px[i * 3] = 90; px[i * 3 + 1] = 90; px[i * 3 + 2] = 90; }
  for (const el of m.elements) {
    const c = ROLE_COLOURS[el.type] || [255, 255, 255];
    for (let i = 0; i < w * h; i++) if (el.mask.data[i]) { px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2]; }
  }
  const png = await sharp(px, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function finish(res, p, aspect, cfg) {
  const s = rep.summarize(p);
  if (p.status === "starting" || p.status === "processing") return res.status(200).json({ status: "processing", id: p.id });
  if (p.status !== "succeeded") return res.status(200).json({ status: "failed", error: s.error || p.status });
  const parsed = await seg.parseOutput(p.output, rep.fetchOutput, cfg, aspect);
  if (!parsed.classMap) return res.status(200).json({ status: "failed", error: "segmentation_output_unsupported", reason: parsed.reason, describe: parsed.describe });
  const m = buildMasks(parsed.classMap, seg.nameOfFactory(cfg));
  res.status(200).json({ status: "succeeded", predictTime: s.predictTime, model: cfg.model, masks: encodeMasks(m), preview: await preview(m) });
}

module.exports = async (req, res) => {
  const token = guard(req, res, { methods: ["POST", "GET"] });
  if (!token) return;
  const cfg = seg.config();
  try {
    if (req.method === "GET") {
      const aspect = Number(req.query.aspect);
      if (!(aspect > 0.2 && aspect < 5)) return res.status(400).json({ error: "bad_aspect" });
      return finish(res, await rep.getPrediction(token, req.query.id), aspect, cfg);
    }
    const { image } = body(req);
    const buf = imageFromDataUri(image);
    const meta = await sharp(buf, { limitInputPixels: 40e6 }).metadata();
    const p = await rep.createPrediction(token, cfg.model, seg.segInput(image, cfg), { waitSec: 50 });
    return finish(res, p, meta.width / meta.height, cfg);
  } catch (e) {
    res.status(e.status && e.status < 500 ? 400 : 502).json({ status: "failed", error: e.message, detail: e.detail });
  }
};
