// GET /api/eval/seglab?photo=p1&confirm=1        run segmentation on a bundled test photo (costs one run)
// GET /api/eval/seglab?photo=p1&pred=<id>        re-read an earlier run (free)
// Preview only. Test photos are bundled in eval-photos/ at deploy time (never committed to git).
// Returns a compact class map (run-length encoded) so the result can be drawn and measured offline.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { guard } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");
const seg = require("../_lib/segmentation");
const { buildMasks } = require("../_lib/masks");
const { ADE20K } = require("../_lib/ade20k");

const PHOTO_DIR = path.join(process.cwd(), "eval-photos");

function rle(arr) {
  const parts = [];
  for (let i = 0; i < arr.length;) { let j = i; while (j < arr.length && arr[j] === arr[i]) j++; parts.push(`${arr[i]}:${j - i}`); i = j; }
  return parts.join(",");
}

module.exports = async (req, res) => {
  const token = guard(req, res, { methods: ["GET"] });
  if (!token) return;
  const cfg = seg.config();
  const name = String(req.query.photo || "");
  if (!/^[a-z0-9_-]{1,20}$/i.test(name)) return res.status(400).json({ error: "bad_photo" });
  const file = ["jpg", "jpeg", "png", "webp"].map(e => path.join(PHOTO_DIR, `${name}.${e}`)).find(f => fs.existsSync(f));
  if (!file) return res.status(404).json({ error: "photo_not_bundled", available: fs.existsSync(PHOTO_DIR) ? fs.readdirSync(PHOTO_DIR) : [] });
  try {
    const raw = fs.readFileSync(file);
    // same preparation as the app: max 1024 px JPEG
    const jpg = await sharp(raw).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const meta = await sharp(jpg).metadata();
    let p;
    if (req.query.pred) p = await rep.getPrediction(token, String(req.query.pred));
    else {
      if (req.query.confirm !== "1") return res.status(400).json({ error: "add confirm=1 to start a paid run" });
      p = await rep.createPrediction(token, cfg.model, seg.segInput(`data:image/jpeg;base64,${jpg.toString("base64")}`, cfg), { waitSec: 50 });
    }
    const s = rep.summarize(p);
    const base = { model: cfg.model, predictionId: p.id, status: p.status, predictTime: s.predictTime, error: s.error, image: { w: meta.width, h: meta.height } };
    if (p.status !== "succeeded") return res.status(200).json(base);
    const out = p.output;
    base.rawOutput = Array.isArray(out)
      ? { kind: `array(${out.length})`, first: out[0] && typeof out[0] === "object" ? Object.fromEntries(Object.entries(out[0]).map(([k, v]) => [k, typeof v === "string" ? `${v.slice(0, 60)}… (${v.length} chars)` : v])) : String(out[0]).slice(0, 80),
          labels: out.map(o => o && typeof o === "object" ? { label: o.label, score: o.score } : null) }
      : { kind: typeof out, preview: JSON.stringify(out).slice(0, 200) };
    const parsed = await seg.parseOutput(out, rep.fetchOutput, cfg, meta.width / meta.height);
    base.parsed = { kind: parsed.kind, reason: parsed.reason, segments: parsed.segments, unmatched: parsed.unmatched };
    if (!parsed.classMap) return res.status(200).json(base);
    const cm = parsed.classMap, counts = new Map();
    for (const v of cm.data) counts.set(v, (counts.get(v) || 0) + 1);
    base.classes = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, name: id === seg.UNKNOWN ? "unknown" : ADE20K[id - cfg.offset] || `#${id}`, share: +(n / cm.data.length).toFixed(4) }));
    const m = buildMasks(cm, seg.nameOfFactory(cfg));
    base.masks = { quality: m.quality, elements: m.elements.map(e => ({ type: e.type, label: e.label, area: e.area })) };
    base.classMap = { w: cm.w, h: cm.h, unknownId: seg.UNKNOWN, rle: rle(cm.data) };
    res.status(200).json(base);
  } catch (e) {
    res.status(502).json({ error: e.message, detail: e.detail });
  }
};
