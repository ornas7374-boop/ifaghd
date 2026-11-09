// POST /api/eval/probe  { image }  — preview only.
// Confirms the models exist, shows their input/output schemas, runs segmentation once and
// reports exactly what the segmentation model returns, so its format is verified, not assumed.
const sharp = require("sharp");
const { guard, body, imageFromDataUri } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");
const seg = require("../_lib/segmentation");
const { buildMasks } = require("../_lib/masks");
const { MODELS } = require("../_lib/evalModels");

function schemaOf(info) {
  const s = info && info.latest_version && info.latest_version.openapi_schema;
  const c = s && s.components && s.components.schemas;
  return c ? { input: c.Input && c.Input.properties, output: c.Output } : null;
}

module.exports = async (req, res) => {
  const token = guard(req, res);
  if (!token) return;
  const cfg = seg.config();
  const report = { models: {}, segmentation: null };
  for (const [key, model] of Object.entries({ segmentation: cfg.model, methodA: MODELS.A, methodC: MODELS.C })) {
    try { const info = await rep.getModel(token, model); report.models[key] = { model, ok: true, latestVersion: info.latest_version && info.latest_version.id, schema: schemaOf(info) }; }
    catch (e) { report.models[key] = { model, ok: false, error: e.message, detail: e.detail }; }
  }
  const { image } = body(req);
  if (image) {
    try {
      const buf = imageFromDataUri(image);
      const meta = await sharp(buf).metadata();
      let p = await rep.createPrediction(token, cfg.model, seg.segInput(image, cfg), { waitSec: 55 });
      const sum = rep.summarize(p);
      const out = { prediction: { status: sum.status, error: sum.error, predictTime: sum.predictTime,
        outputShape: Array.isArray(p.output) ? `array(${p.output.length})` : typeof p.output,
        outputPreview: JSON.stringify(p.output).slice(0, 600) } };
      if (p.status === "succeeded") {
        const parsed = await seg.parseOutput(p.output, rep.fetchOutput, cfg, meta.width / meta.height);
        out.parsed = { kind: parsed.kind, reason: parsed.reason, shape: parsed.shape, describe: parsed.describe, tried: parsed.tried };
        if (parsed.classMap) {
          const m = buildMasks(parsed.classMap, seg.nameOfFactory(cfg));
          out.masks = { quality: m.quality, topClasses: m.topClasses, elements: m.elements.map(e => ({ label: e.label, area: e.area })) };
        }
      }
      report.segmentation = out;
    } catch (e) { report.segmentation = { error: e.message, detail: e.detail }; }
  }
  res.status(200).json(report);
};
