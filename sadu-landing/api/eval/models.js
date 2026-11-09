// GET /api/eval/models?ids=owner/name,owner/name  — preview only, read-only, free.
// Asks the Replicate API (not the marketing page) whether each model exists, its latest version,
// and its real input / output schema. Runs nothing, so it costs nothing.
const { guard } = require("../_lib/evalGuard");
const rep = require("../_lib/replicate");

function schemaOf(info) {
  const s = info && info.latest_version && info.latest_version.openapi_schema;
  const c = s && s.components && s.components.schemas;
  if (!c) return null;
  const input = {};
  for (const [k, v] of Object.entries((c.Input && c.Input.properties) || {})) {
    input[k] = { type: v.type || (v.allOf ? "enum" : undefined), format: v.format, default: v.default, description: (v.description || "").slice(0, 160) };
    if (v.allOf && v.allOf[0] && v.allOf[0].$ref) { const n = v.allOf[0].$ref.split("/").pop(); if (c[n] && c[n].enum) input[k].enum = c[n].enum; }
  }
  // include the component definitions the output refers to (e.g. "Segment"), so the real output shape is visible
  const refs = {};
  JSON.stringify(c.Output || {}).replace(/#\/components\/schemas\/(\w+)/g, (_, n) => { refs[n] = c[n]; return _; });
  return { input, required: (c.Input && c.Input.required) || [], output: c.Output, outputRefs: refs };
}

module.exports = async (req, res) => {
  const token = guard(req, res, { methods: ["GET"] });
  if (!token) return;
  const ids = String(req.query.ids || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 8);
  const out = {};
  for (const id of ids) {
    try {
      const info = await rep.getModel(token, id);
      out[id] = { ok: true, description: (info.description || "").slice(0, 200), runCount: info.run_count, visibility: info.visibility,
        latestVersion: info.latest_version && info.latest_version.id, versionCreated: info.latest_version && info.latest_version.created_at,
        schema: schemaOf(info) };
    } catch (e) { out[id] = { ok: false, error: e.message, detail: e.detail }; }
  }
  res.status(200).json(out);
};
