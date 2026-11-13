// GET /api/eval/seglab?photo=p1&plan=1&desc=...&budget=2000             REAL planner test on a bundled photo:
//                                                                       Gemini perception + the Planning Engine
// GET /api/eval/seglab?photo=p1&plan=1&render=1&confirm=1&desc=...     + draw the plan with Gemini and measure how
//                                                                       much the protected areas changed
// Preview only. Private test photos live in eval-photos-enc/<name>.bin, encrypted with AES-256-GCM
// (iv 12 bytes | tag 16 bytes | ciphertext). The key is only in the preview env (SADU_LAB_KEY).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");
const { guard } = require("../_lib/evalGuard");

const PHOTO_DIRS = [path.join(__dirname, "..", "..", "eval-photos-enc"), path.join(process.cwd(), "eval-photos-enc")];
const PHOTO_DIR = PHOTO_DIRS.find(d => fs.existsSync(d)) || PHOTO_DIRS[0];

function decrypt(buf, keyB64) {
  const key = Buffer.from(String(keyB64 || ""), "base64");
  if (key.length !== 32) throw new Error("lab_key_missing");
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}

module.exports = async (req, res) => {
  if (!guard(req, res, { methods: ["GET"] })) return;
  const name = String(req.query.photo || "");
  if (!/^[a-z0-9_-]{1,20}$/i.test(name)) return res.status(400).json({ error: "bad_photo" });
  const file = path.join(PHOTO_DIR, `${name}.bin`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "photo_not_bundled" });
  try {
    const raw = decrypt(fs.readFileSync(file), process.env.SADU_LAB_KEY);
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
        // Gemini image model (needs billing on the Google project): draw the plan, then measure how much the protected areas changed.
        if (req.query.confirm !== "1") return res.status(400).json({ error: "add confirm=1 to start a paid render", plan_passed: plan.validation_results.passed });
        const prov = "gemini";
        const pkey = process.env.GEMINI_API_KEY;
        if (!pkey) return res.status(500).json({ error: `missing_${prov}_key` });
        if (!plan.rendering_instructions) return res.status(200).json({ mode: "render", error: "plan_not_validated", validation: plan.validation_results });
        const t1 = Date.now();
        const src = `data:image/jpeg;base64,${jpg.toString("base64")}`;
        const f = await require("../_lib/gemini").generateImage(pkey, src, plan.rendering_instructions.prompt, { model: process.env.GEMINI_IMAGE_MODEL || undefined });
        const render_ms = Date.now() - t1;
        const gen = f.output.startsWith("data:") ? Buffer.from(f.output.split(",")[1], "base64") : Buffer.from(await (await fetch(f.output)).arrayBuffer());
        const W = 256, H = Math.round(256 * meta.height / meta.width);
        const px = (b) => sharp(b).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
        const [a, g] = await Promise.all([px(jpg), px(gen)]);
        const er = plan.rendering_instructions.edit_region;
        const zone = (fn) => { let d = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!fn(x / W, y / H)) continue; const i = (y * W + x) * 3; d += Math.abs(a[i] - g[i]) + Math.abs(a[i + 1] - g[i + 1]) + Math.abs(a[i + 2] - g[i + 2]); n += 3; } return n ? +(d / n).toFixed(1) : null; };
        const diff = { outside_edit_region: zone((x) => x < er.x0 || x > er.x1), floor_band_bottom_12pct: zone((x, y) => y > 0.88), ceiling_band_top_10pct: zone((x, y) => y < 0.1), left_wall_window: zone((x) => x < Math.min(er.x0, 0.2)), inside_edit_region: zone((x) => x >= er.x0 && x <= er.x1) };
        const half = 512, hh = Math.round(half * meta.height / meta.width);
        const side = await sharp({ create: { width: half * 2, height: hh, channels: 3, background: "#000" } })
          .composite([{ input: await sharp(jpg).resize(half, hh).toBuffer(), left: 0, top: 0 }, { input: await sharp(gen).resize(half, hh, { fit: "fill" }).toBuffer(), left: half, top: 0 }]).jpeg({ quality: 80 }).toBuffer();
        return res.status(200).json({ mode: "render", provider: prov, model: f.model, perceive_ms: t1 - t0, render_ms, output: f.output.startsWith("data:") ? "(inline image)" : f.output, gen_size: (await sharp(gen).metadata()), mean_abs_diff_0_255: diff, edit_region: er, prompt: plan.rendering_instructions.prompt, side_by_side_jpg_b64: side.toString("base64") });
      }
      return res.status(200).json({ mode: "plan", model: per.model, perceive_ms: Date.now() - t0, image: { w: meta.width, h: meta.height }, raw_perception: per, plan });
    }
    return res.status(400).json({ error: "add plan=1" });
  } catch (e) {
    res.status(502).json({ error: e.message, detail: e.detail });
  }
};
