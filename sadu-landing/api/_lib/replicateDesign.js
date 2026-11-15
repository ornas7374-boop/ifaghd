// sadu — the design image on Replicate (FLUX Kontext Pro, ~$0.04 per image, prepaid credit).
// Gemini keeps the analysis; Replicate only draws the signed plan. Key: REPLICATE_API_TOKEN (server only).
const API = "https://api.replicate.com/v1";
const MODEL = process.env.REPLICATE_MODEL || "black-forest-labs/flux-kontext-pro";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function call(token, path, opts = {}, f = fetch) {
  for (let attempt = 0; ; attempt++) {
    const r = await f(API + path, { ...opts, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
    if ((r.status === 429 || r.status >= 500) && attempt < 2) { await sleep(2000 * 2 ** attempt); continue; }
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
}

/** photo (data URI) + prompt -> { output: image URL } or { status: "processing", id }. */
async function replicateKontext(token, image, prompt, opts = {}) {
  const f = opts.fetch || fetch, t0 = Date.now(), budget = opts.budgetMs || 50000;
  const r = await call(token, `/models/${opts.model || MODEL}/predictions`, {
    method: "POST", headers: { Prefer: "wait=45" },
    body: JSON.stringify({ input: { prompt, input_image: image, aspect_ratio: "match_input_image", output_format: "jpg", safety_tolerance: 2 } })
  }, f);
  if (!r.ok) { const e = new Error(`replicate_${r.status}`); e.detail = String(r.data.detail || r.data.title || "").slice(0, 300); throw e; }
  let p = r.data;
  while ((p.status === "starting" || p.status === "processing") && Date.now() - t0 < budget) { await sleep(2000); p = (await call(token, `/predictions/${p.id}`, {}, f)).data; }
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (p.status === "succeeded" && out) return { status: "succeeded", output: out, model: opts.model || MODEL };
  if (p.status === "failed" || p.status === "canceled") { const e = new Error("replicate_failed"); e.detail = String(p.error || p.status).slice(0, 300); throw e; }
  return { status: "processing", id: p.id };
}

async function getPrediction(token, id, f = fetch) {
  if (!/^[a-z0-9]{8,64}$/i.test(String(id))) throw new Error("bad_id");
  const r = await call(token, `/predictions/${id}`, {}, f);
  if (!r.ok) throw new Error(`replicate_${r.status}`);
  const p = r.data, out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (p.status === "succeeded" && out) return { status: "succeeded", output: out };
  if (p.status === "failed" || p.status === "canceled") return { status: "failed", error: "replicate_failed", detail: String(p.error || "").slice(0, 300) };
  return { status: "processing", id: p.id };
}

module.exports = { replicateKontext, getPrediction, MODEL };
