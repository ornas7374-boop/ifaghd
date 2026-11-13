// GET /api/eval/seglab?photo=p1&confirm=1        run segmentation on a bundled test photo (costs one run)
// GET /api/eval/seglab?photo=p1&pred=<id>        re-read an earlier run (free)
// GET /api/eval/seglab?photo=p1&plan=1&desc=...&budget=2000   REAL planner test: Gemini perception (free tier)
//                                                 + the Planning Engine on the photo; no image is generated
// Preview only. Private test photos live in eval-photos-enc/<name>.bin, encrypted with AES-256-GCM
// (iv 12 bytes | tag 16 bytes | ciphertext). The key is only in the preview env (SADU_LAB_KEY), so the
// files in git are unreadable without it.
// Returns a compact class map (run-length encoded) so the result can be drawn and measured offline.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { guard } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");
const seg = require("../_lib/segmentation");
const { buildMasks } = require("../_lib/masks");
const { ADE20K } = require("../_lib/ade20k");

const PHOTO_DIRS = [path.join(__dirname, "..", "..", "eval-photos-enc"), path.join(process.cwd(), "eval-photos-enc")];
const PHOTO_DIR = PHOTO_DIRS.find(d => fs.existsSync(d)) || PHOTO_DIRS[0];
const crypto = require("crypto");

function decrypt(buf, keyB64) {
  const key = Buffer.from(String(keyB64 || ""), "base64");
  if (key.length !== 32) throw new Error("lab_key_missing");
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

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
  const file = path.join(PHOTO_DIR, `${name}.bin`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "photo_not_bundled", looked: PHOTO_DIRS.map(d => ({ dir: d, exists: fs.existsSync(d), files: fs.existsSync(d) ? fs.readdirSync(d) : [] })) });
  try {
    const raw = decrypt(fs.readFileSync(file), process.env.SADU_LAB_KEY);
    // same preparation as the app: max 1024 px JPEG
    const jpg = await sharp(raw).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const meta = await sharp(jpg).metadata();
    if (req.query.plan === "1") {
      if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "missing_gemini_key" });
      const { perceive } = require("../_lib/planner/perceive");
      const { planDesign } = require("../_lib/planner");
      const brief = { description: String(req.query.desc || "").slice(0, 600), budget_sar: Number(req.query.budget) || null,
        changes: String(req.query.changes || "").split(",").filter(Boolean).slice(0, 6) };
      const t0 = Date.now();
      const per = await perceive(process.env.GEMINI_API_KEY, `data:image/jpeg;base64,${jpg.toString("base64")}`, brief, { model: process.env.GEMINI_VISION_MODEL || undefined, budgetMs: 52000 });
      const plan = planDesign({ ...per, brief });
      if (req.query.render === "1") {
        // Paid (~$0.04 on fal): draw the plan, then measure how much the protected areas changed.
        if (req.query.confirm !== "1") return res.status(400).json({ error: "add confirm=1 to start a paid render", plan_passed: plan.validation_results.passed });
        if (!process.env.FAL_KEY) return res.status(500).json({ error: "missing_fal_key" });
        if (!plan.rendering_instructions) return res.status(200).json({ mode: "render", error: "plan_not_validated", validation: plan.validation_results });
        const t1 = Date.now();
        const f = await require("../_lib/fal").falKontext(process.env.FAL_KEY, `data:image/jpeg;base64,${jpg.toString("base64")}`, plan.rendering_instructions.prompt, { timeoutMs: 45000 });
        const render_ms = Date.now() - t1;
        const gen = Buffer.from(await (await fetch(f.output)).arrayBuffer());
        const W = 256, H = Math.round(256 * meta.height / meta.width);
        const px = (b) => sharp(b).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
        const [a, g] = await Promise.all([px(jpg), px(gen)]);
        const er = plan.rendering_instructions.edit_region;
        const zone = (fn) => { let d = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!fn(x / W, y / H)) continue; const i = (y * W + x) * 3; d += Math.abs(a[i] - g[i]) + Math.abs(a[i + 1] - g[i + 1]) + Math.abs(a[i + 2] - g[i + 2]); n += 3; } return n ? +(d / n).toFixed(1) : null; };
        const diff = { outside_edit_region: zone((x) => x < er.x0 || x > er.x1), floor_band_bottom_12pct: zone((x, y) => y > 0.88), ceiling_band_top_10pct: zone((x, y) => y < 0.1), left_wall_window: zone((x) => x < Math.min(er.x0, 0.2)), inside_edit_region: zone((x) => x >= er.x0 && x <= er.x1) };
        const half = 512, hh = Math.round(half * meta.height / meta.width);
        const side = await sharp({ create: { width: half * 2, height: hh, channels: 3, background: "#000" } })
          .composite([{ input: await sharp(jpg).resize(half, hh).toBuffer(), left: 0, top: 0 }, { input: await sharp(gen).resize(half, hh, { fit: "fill" }).toBuffer(), left: half, top: 0 }]).jpeg({ quality: 80 }).toBuffer();
        return res.status(200).json({ mode: "render", provider: "fal", model: f.model, perceive_ms: t1 - t0, render_ms, output: f.output, gen_size: (await sharp(gen).metadata()), mean_abs_diff_0_255: diff, edit_region: er, prompt: plan.rendering_instructions.prompt, side_by_side_jpg_b64: side.toString("base64") });
      }
      return res.status(200).json({ mode: "plan", model: per.model, perceive_ms: Date.now() - t0, image: { w: meta.width, h: meta.height }, raw_perception: per, plan });
    }
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
