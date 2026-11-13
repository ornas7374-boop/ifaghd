// sadu — Segmind client for the design image (FLUX Kontext on Segmind). Key: SEGMIND_API_KEY (server only).
const MODEL = process.env.SEGMIND_MODEL || "flux-kontext-pro";
const API = "https://api.segmind.com/v1";

async function call(key, path, opts = {}, f = fetch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 55000);
  try {
    return await f(`${API}/${path}`, { ...opts, signal: ctrl.signal, headers: { "x-api-key": key, "Content-Type": "application/json", ...(opts.headers || {}) } });
  } catch (e) {
    if (e.name === "AbortError") { const t = new Error("segmind_timeout"); t.detail = "no answer within the time budget"; throw t; }
    throw e;
  } finally { clearTimeout(timer); }
}

/** Remaining credits (free call, used to check the key). */
async function credits(key, opts = {}) {
  const r = await call(key, "get-user-credits", { method: "GET", timeoutMs: 15000 }, opts.fetch);
  const text = await r.text();
  return { status: r.status, body: text.slice(0, 400) };
}

/** Photo (data URI) + prompt -> { output: data URI of the edited image, model }. */
async function segmindKontext(key, image, prompt, opts = {}) {
  const model = opts.model || MODEL;
  const b64 = String(image).replace(/^data:image\/[a-z]+;base64,/, "");
  const r = await call(key, model, {
    method: "POST", timeoutMs: opts.timeoutMs,
    body: JSON.stringify({ prompt, input_image: b64, aspect_ratio: "match_input_image", output_format: "jpg", safety_tolerance: 2, base64: true })
  }, opts.fetch);
  const type = (r.headers && r.headers.get && r.headers.get("content-type")) || "";
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const e = new Error(`segmind_${r.status}`); e.detail = t.slice(0, 300); throw e;
  }
  if (/^image\//.test(type)) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { output: `data:${type.split(";")[0]};base64,${buf.toString("base64")}`, model };
  }
  const data = await r.json().catch(() => ({}));
  const img = data.image || data.output || (Array.isArray(data.images) && data.images[0]);
  if (typeof img === "string" && /^https?:/.test(img)) return { output: img, model };
  if (typeof img === "string" && img.length > 100) return { output: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`, model };
  const e = new Error("segmind_no_image"); e.detail = JSON.stringify(data).slice(0, 300); throw e;
}

module.exports = { segmindKontext, credits, MODEL };
