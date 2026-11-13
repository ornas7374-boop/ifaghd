// sadu — fal.ai client for the design image (same FLUX Kontext Pro model as on Replicate, other host).
// The key is read from FAL_KEY on the server only. ~$0.04 per image (fal price list, flux-pro/kontext).
const MODEL = process.env.FAL_MODEL || "fal-ai/flux-pro/kontext";

/** One synchronous fal call: photo (data URI or URL) + prompt -> { output: imageUrl, model }. */
async function falKontext(key, image, prompt, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 55000);
  try {
    const r = await (opts.fetch || fetch)(`https://fal.run/${opts.model || MODEL}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_url: image, num_images: 1, output_format: "jpeg", safety_tolerance: "2" })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const d = data && (data.detail || data.message || data.error);
      const e = new Error(`fal_${r.status}`);
      e.detail = (typeof d === "string" ? d : JSON.stringify(d || "")).slice(0, 300);
      throw e;
    }
    const url = data && data.images && data.images[0] && data.images[0].url;
    if (!url) { const e = new Error("fal_no_image"); e.detail = JSON.stringify(data).slice(0, 300); throw e; }
    return { output: url, model: opts.model || MODEL };
  } catch (e) {
    if (e.name === "AbortError") { const t = new Error("fal_timeout"); t.detail = "no answer within the time budget"; throw t; }
    throw e;
  } finally { clearTimeout(timer); }
}

module.exports = { falKontext, MODEL };
