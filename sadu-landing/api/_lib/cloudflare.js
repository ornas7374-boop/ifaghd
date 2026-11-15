// sadu — free drawing on Cloudflare Workers AI (daily free allowance), mask path only:
// Stable Diffusion inpainting redraws the planned box; the result box is pasted back onto the ORIGINAL
// photo at full size, so every pixel outside the box stays the customer's photo.
// Key: CLOUDFLARE_API_TOKEN (server only). CLOUDFLARE_ACCOUNT_ID is optional (looked up once if missing).
const API = "https://api.cloudflare.com/client/v4";
const MODEL = process.env.CLOUDFLARE_INPAINT_MODEL || "@cf/runwayml/stable-diffusion-v1-5-inpainting";
let accountCache = null;

async function cf(token, path, opts = {}, f = fetch) {
  const r = await f(API + path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  return r;
}

async function accountId(token, f = fetch) {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  if (accountCache) return accountCache;
  const r = await cf(token, "/accounts?per_page=5", {}, f);
  const d = await r.json().catch(() => ({}));
  const id = d && d.result && d.result[0] && d.result[0].id;
  if (!id) { const e = new Error(`cloudflare_${r.status === 200 ? "no_account" : r.status}`); e.detail = JSON.stringify(d.errors || d).slice(0, 300); throw e; }
  return (accountCache = id);
}

/** Free checks only (no drawing): token valid? account? is the inpainting model listed? */
async function check(token, f = fetch, term = "inpainting") {
  const v = await (await cf(token, "/user/tokens/verify", {}, f)).json().catch(() => ({}));
  let acct = null, models = null, err = null;
  try {
    acct = await accountId(token, f);
    const m = await (await cf(token, `/accounts/${acct}/ai/models/search?search=${encodeURIComponent(term)}&per_page=50`, {}, f)).json().catch(() => ({}));
    models = (m.result || []).map(x => ({ name: x.name, task: x.task && x.task.name, desc: String(x.description || "").slice(0, 160), props: (x.properties || []).map(p => `${p.property_id}=${String(p.value).slice(0, 40)}`).slice(0, 6) }));
  } catch (e) { err = `${e.message} ${e.detail || ""}`; }
  return { token_status: v && v.result && v.result.status, token_ok: !!(v && v.success), account_found: !!acct, inpaint_models: models, error: err };
}

/** photo (data URI) + box + prompt -> { status, output: data URI (full-size original with the box redrawn) } */
async function cfInpaint(token, image, region, prompt, opts = {}) {
  const sharp = require("sharp"), f = opts.fetch || fetch;
  const orig = Buffer.from(String(image).split(",")[1] || "", "base64");
  const { width: W, height: H } = await sharp(orig).metadata();
  // the model works near 512-768 px; sizes must be multiples of 8
  const s = Math.min(1, 768 / Math.max(W, H));
  const w = Math.max(64, Math.round(W * s / 8) * 8), h = Math.max(64, Math.round(H * s / 8) * 8);
  const small = await sharp(orig).resize(w, h, { fit: "fill" }).png().toBuffer();
  const bx = Math.round(region.x0 * w), by = Math.round((region.y0 || 0) * h);
  const bw = Math.max(8, Math.round((region.x1 - region.x0) * w)), bh = Math.max(8, Math.round(((region.y1 || 1) - (region.y0 || 0)) * h));
  const box = await sharp({ create: { width: bw, height: bh, channels: 3, background: "#fff" } }).png().toBuffer();
  let mask = await sharp({ create: { width: w, height: h, channels: 3, background: "#000" } }).composite([{ input: box, left: bx, top: by }]).png().toBuffer();
  if (opts.invert) mask = await sharp(mask).negate({ alpha: false }).png().toBuffer();
  const acct = await accountId(token, f);
  const r = await cf(token, `/accounts/${acct}/ai/run/${opts.model || MODEL}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: String(prompt).slice(0, 900), image: [...small], mask: [...mask], width: w, height: h, num_steps: opts.steps || 20, strength: opts.strength || 1, guidance: opts.guidance || 7.5 })
  }, f);
  const type = (r.headers && r.headers.get && r.headers.get("content-type")) || "";
  if (!r.ok || !/^image\//.test(type)) {
    const t = await r.text().catch(() => "");
    const e = new Error(`cloudflare_${r.status}`); e.detail = t.slice(0, 300); throw e;
  }
  const gen = Buffer.from(await r.arrayBuffer());
  // paste only the redrawn box back onto the full-size original
  const X = Math.round(region.x0 * W), Y = Math.round((region.y0 || 0) * H);
  const BW = Math.max(1, Math.round((region.x1 - region.x0) * W)), BH = Math.max(1, Math.round(((region.y1 || 1) - (region.y0 || 0)) * H));
  const genFull = await sharp(gen).resize(W, H, { fit: "fill" }).toBuffer();
  const patch = await sharp(genFull).extract({ left: X, top: Y, width: Math.min(BW, W - X), height: Math.min(BH, H - Y) }).toBuffer();
  const out = await sharp(orig).composite([{ input: patch, left: X, top: Y }]).jpeg({ quality: 90 }).toBuffer();
  const res = { status: "succeeded", output: `data:image/jpeg;base64,${out.toString("base64")}`, model: opts.model || MODEL };
  if (opts.debug) res.raw = (await sharp(gen).resize(512).jpeg({ quality: 75 }).toBuffer()).toString("base64");
  return res;
}

/** Free: the input/output schema of a model. */
async function schema(token, model, f = fetch) {
  const acct = await accountId(token, f);
  const r = await cf(token, `/accounts/${acct}/ai/models/schema?model=${encodeURIComponent(model)}`, {}, f);
  return { status: r.status, body: (await r.text()).slice(0, 6000) };
}

module.exports = { schema, cfInpaint, check, accountId, MODEL, _reset: () => { accountCache = null; } };
