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

const EDIT_MODEL = process.env.CLOUDFLARE_EDIT_MODEL || "@cf/black-forest-labs/flux-2-klein-9b";

/** Paste only the box of `gen` onto the original, with soft edges (no hard seam). */
async function pasteBox(orig, gen, region, feather = 10) {
  const sharp = require("sharp");
  const { width: W, height: H } = await sharp(orig).metadata();
  const X = Math.round(region.x0 * W), Y = Math.round((region.y0 || 0) * H);
  const BW = Math.max(1, Math.min(W - X, Math.round((region.x1 - region.x0) * W))), BH = Math.max(1, Math.min(H - Y, Math.round(((region.y1 || 1) - (region.y0 || 0)) * H)));
  const box = await sharp({ create: { width: BW, height: BH, channels: 3, background: "#fff" } }).png().toBuffer();
  const alpha = await sharp({ create: { width: W, height: H, channels: 3, background: "#000" } }).composite([{ input: box, left: X, top: Y }])
    .blur(feather).toColourspace("b-w").raw().toBuffer();
  const genFull = await sharp(gen).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const base = await sharp(orig).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0, j = 0; i < W * H; i++, j += 3) {
    // inside the hard box use the new image; the blurred edge blends; outside stays the original
    const inside = (i % W) >= X && (i % W) < X + BW && Math.floor(i / W) >= Y && Math.floor(i / W) < Y + BH;
    const a = inside ? Math.max(alpha[i], 128) / 255 : 0;
    for (let c = 0; c < 3; c++) out[j + c] = Math.round(genFull[j + c] * a + base[j + c] * (1 - a));
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Keep the new image ONLY where it really changed (new furniture, lights), and the original photo everywhere
 * else: a change mask (difference > threshold), grown a little and feathered. Windows/doors in `protect`
 * (normalised boxes) always stay the original.
 */
async function pasteChanged(orig, gen, protect = [], opts = {}) {
  const sharp = require("sharp");
  const { width: W, height: H } = await sharp(orig).metadata();
  const sw = 320, sh = Math.max(1, Math.round(H * sw / W));
  const [a, b] = await Promise.all([orig, gen].map(x => sharp(x).resize(sw, sh, { fit: "fill" }).removeAlpha().blur(1.2).raw().toBuffer()));
  const thr = opts.threshold || 34;
  const m = Buffer.alloc(sw * sh);
  for (let i = 0, j = 0; i < sw * sh; i++, j += 3) {
    const d = (Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2])) / 3;
    m[i] = d > thr ? 255 : 0;
  }
  for (const r of protect) for (let y = Math.floor(r.y0 * sh); y < Math.ceil(r.y1 * sh); y++) for (let x = Math.floor(r.x0 * sw); x < Math.ceil(r.x1 * sw); x++) if (x >= 0 && y >= 0 && x < sw && y < sh) m[y * sw + x] = 0;
  // grow (close small gaps inside objects), then feather when scaling up
  const grown = await sharp(m, { raw: { width: sw, height: sh, channels: 1 } }).blur(2.5).threshold(40).extractChannel(0).raw().toBuffer();
  for (const r of protect) for (let y = Math.floor(r.y0 * sh); y < Math.ceil(r.y1 * sh); y++) for (let x = Math.floor(r.x0 * sw); x < Math.ceil(r.x1 * sw); x++) if (x >= 0 && y >= 0 && x < sw && y < sh) grown[y * sw + x] = 0;
  const alpha = await sharp(grown, { raw: { width: sw, height: sh, channels: 1 } }).resize(W, H, { fit: "fill" }).blur(3).extractChannel(0).raw().toBuffer();
  const genFull = await sharp(gen).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const base = await sharp(orig).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(W * H * 3);
  let changed = 0;
  for (let i = 0, j = 0; i < W * H; i++, j += 3) {
    const k = alpha[i] / 255; if (k > 0.5) changed++;
    for (let c = 0; c < 3; c++) out[j + c] = Math.round(genFull[j + c] * k + base[j + c] * (1 - k));
  }
  return { buf: await sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 90 }).toBuffer(), changed_share: +(changed / (W * H)).toFixed(3) };
}

/** FLUX.2 on Workers AI: edits the whole photo from the instruction, then only the planned box is kept. */
async function cfFlux2(token, image, region, prompt, opts = {}) {
  const sharp = require("sharp"), f = opts.fetch || fetch;
  const orig = Buffer.from(String(image).split(",")[1] || "", "base64");
  const { width: W, height: H } = await sharp(orig).metadata();
  const s = Math.min(1, 1024 / Math.max(W, H));
  const w = Math.round(W * s / 16) * 16, h = Math.round(H * s / 16) * 16;
  const input = await sharp(orig).resize(w, h, { fit: "fill" }).jpeg({ quality: 92 }).toBuffer();
  const form = new FormData();
  form.append("prompt", String(prompt).slice(0, 3000));
  form.append("input_image_0", new Blob([input], { type: "image/jpeg" }), "room.jpg");
  form.append("width", String(w)); form.append("height", String(h));
  const acct = await accountId(token, f);
  const model = opts.model || EDIT_MODEL;
  const r = await cf(token, `/accounts/${acct}/ai/run/${model}`, { method: "POST", body: form }, f);
  const d = await r.json().catch(() => ({}));
  const b64 = d && d.result && d.result.image;
  if (!r.ok || !b64) { const e = new Error(`cloudflare_${r.status}`); e.detail = JSON.stringify(d.errors || d).slice(0, 300); throw e; }
  const gen = Buffer.from(b64, "base64");
  // keep only what really changed (new pieces); windows and doors always stay the original
  const kept = opts.raw ? { buf: gen, changed_share: null } : await pasteChanged(orig, gen, opts.protect || []);
  const res = { status: "succeeded", output: `data:image/jpeg;base64,${kept.buf.toString("base64")}`, model, changed_share: kept.changed_share };
  if (opts.debug) res.raw = (await sharp(gen).resize(512).jpeg({ quality: 75 }).toBuffer()).toString("base64");
  return res;
}

/** Free: the input/output schema of a model. */
async function schema(token, model, f = fetch) {
  const acct = await accountId(token, f);
  const r = await cf(token, `/accounts/${acct}/ai/models/schema?model=${encodeURIComponent(model)}`, {}, f);
  return { status: r.status, body: (await r.text()).slice(0, 6000) };
}

module.exports = { schema, cfFlux2, pasteBox, pasteChanged, EDIT_MODEL, cfInpaint, check, accountId, MODEL, _reset: () => { accountCache = null; } };
