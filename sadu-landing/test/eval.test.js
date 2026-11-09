// Tests for the isolated evaluation endpoints, with Replicate simulated (no network, no cost).

const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { evalEnabled, guard } = require("../api/_lib/evalGuard");
const { isAllowedOutputUrl } = require("../api/_lib/replicate");
const seg = require("../api/_lib/segmentation");
const { ADE20K } = require("../api/_lib/ade20k");

// ---------- guard ----------

function mockRes() {
  return { code: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const PREVIEW_ENV = { VERCEL_ENV: "preview", SADU_EVAL: "1", REPLICATE_API_TOKEN_EVAL: "eval-key" };

test("guard: eval endpoints are closed in production, even with every flag set", () => {
  assert.equal(evalEnabled({ ...PREVIEW_ENV, VERCEL_ENV: "production" }), false);
  const res = mockRes();
  assert.equal(guard({ method: "POST", headers: {} }, res, { env: { ...PREVIEW_ENV, VERCEL_ENV: "production" } }), null);
  assert.equal(res.code, 404);
});

test("guard: closed without the explicit opt-in flag, and without the eval key", () => {
  assert.equal(evalEnabled({ VERCEL_ENV: "preview", REPLICATE_API_TOKEN_EVAL: "k" }), false);
  assert.equal(evalEnabled({ VERCEL_ENV: "preview", SADU_EVAL: "1" }), false);
});

test("guard: never falls back to the production key", () => {
  const env = { VERCEL_ENV: "preview", SADU_EVAL: "1", REPLICATE_API_TOKEN: "PRODUCTION-KEY" };
  const res = mockRes();
  assert.equal(guard({ method: "POST", headers: {} }, res, { env }), null);
  assert.equal(res.code, 404);
  assert.equal(guard({ method: "POST", headers: {} }, mockRes(), { env: PREVIEW_ENV }), "eval-key");
});

test("guard: rejects wrong methods and oversized bodies", () => {
  const r1 = mockRes(); guard({ method: "DELETE", headers: {} }, r1, { env: PREVIEW_ENV }); assert.equal(r1.code, 405);
  const r2 = mockRes(); guard({ method: "POST", headers: { "content-length": String(5e6) } }, r2, { env: PREVIEW_ENV }); assert.equal(r2.code, 413);
});

// ---------- SSRF guard ----------

test("outputs are downloaded only from Replicate delivery hosts over https", () => {
  assert.equal(isAllowedOutputUrl("https://replicate.delivery/xyz/out.png"), true);
  assert.equal(isAllowedOutputUrl("https://pbxt.replicate.delivery/abc/out.jpg"), true);
  for (const bad of ["http://replicate.delivery/a.png", "https://evilreplicate.delivery/a.png", "https://replicate.delivery.evil.com/a.png",
    "https://169.254.169.254/latest", "file:///etc/passwd", "not a url"]) assert.equal(isAllowedOutputUrl(bad), false, bad);
});

// ---------- segmentation output parsing ----------

async function indexMapPng(w, h, f) { // greyscale image whose value = class id
  const px = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = f(x, y);
  return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}
const id = (n) => ADE20K.indexOf(n);
const room = (x, y) => (y < 40 ? id("ceiling") : y > 160 ? id("floor") : (x > 60 && x < 120 && y > 60 && y < 130) ? id("windowpane") : id("wall"));

test("segmentation: a class-index image is read as a class map", async () => {
  const cfg = seg.config({});
  const r = await seg.classMapFromImage(await indexMapPng(200, 200, room), cfg, 100, 100);
  assert.equal(r.kind, "index");
  assert.equal(r.classMap.data[0], id("ceiling"));
  assert.equal(r.classMap.data[99 * 100 + 50], id("floor"));
});

test("segmentation: a visualisation blended with the photo is refused, not guessed", async () => {
  const noisy = await sharp({ create: { width: 120, height: 90, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 60 } } }).png().toBuffer();
  const r = await seg.classMapFromImage(noisy, seg.config({}), 60, 45);
  assert.equal(r.kind, "unsupported");
  assert.match(r.reason, /visualisation|palette/);
});

test("segmentation: a colour-coded map is read once a palette is configured", async () => {
  const px = Buffer.alloc(100 * 100 * 3);
  for (let i = 0; i < 100 * 100; i++) { const top = i < 5000; px.set(top ? [120, 120, 120] : [80, 50, 50], i * 3); }
  const png = await sharp(px, { raw: { width: 100, height: 100, channels: 3 } }).png().toBuffer();
  const noPalette = await seg.classMapFromImage(png, seg.config({}), 50, 50);
  assert.equal(noPalette.kind, "unsupported");
  const cfg = seg.config({ SADU_SEG_PALETTE: JSON.stringify({ "120,120,120": "wall", "80,50,50": "floor" }) });
  const r = await seg.classMapFromImage(png, cfg, 50, 50);
  assert.equal(r.kind, "palette");
  assert.equal(r.classMap.data[0], id("wall"));
  assert.equal(r.classMap.data[49 * 50], id("floor"));
});

test("segmentation: JSON segments [{label, mask}] are combined into a class map", async () => {
  const masks = {
    "https://replicate.delivery/m/wall.png": await indexMapPng(80, 60, (x, y) => (y < 40 ? 255 : 0)),
    "https://replicate.delivery/m/floor.png": await indexMapPng(80, 60, (x, y) => (y >= 40 ? 255 : 0))
  };
  const fetchOutput = async (u) => { if (!masks[u]) throw new Error("unexpected " + u); return masks[u]; };
  const r = await seg.parseOutput([{ label: "wall", mask: "https://replicate.delivery/m/wall.png" }, { label: "floor", mask: "https://replicate.delivery/m/floor.png" }],
    fetchOutput, seg.config({}), 80 / 60);
  assert.equal(r.kind, "segments");
  assert.equal(r.classMap.data[0], id("wall"));
  assert.equal(r.classMap.data[r.classMap.data.length - 1], id("floor"));
});

// ---------- endpoints, end to end with a simulated Replicate ----------

test("endpoints: segment → generate (A and C) → validate (A, B, C) with Replicate simulated", async () => {
  Object.assign(process.env, PREVIEW_ENV);
  const W = 400, H = 300;
  const roomImg = (furnished) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="60" fill="#eee"/><rect y="60" width="${W}" height="180" fill="#ddd2c4"/><rect y="240" width="${W}" height="60" fill="#9a7650"/>
      <rect x="120" y="90" width="120" height="100" fill="#8fb8e0" stroke="#fff" stroke-width="6"/><line x1="180" y1="90" x2="180" y2="190" stroke="#fff" stroke-width="5"/>
      ${furnished ? '<rect x="40" y="200" width="300" height="80" rx="20" fill="#5b6b5a"/><circle cx="360" cy="260" r="25" fill="#333"/>' : '<rect x="150" y="215" width="100" height="50" fill="#c9b8a6"/>'}
    </svg>`)).jpeg({ quality: 90 }).toBuffer();
  const original = await roomImg(false), furnished = await roomImg(true);
  const classPng = await indexMapPng(W, H, (x, y) => (y < 60 ? id("ceiling") : y >= 240 ? id("floor") :
    (x >= 120 && x < 240 && y >= 90 && y < 190) ? id("windowpane") : (x >= 150 && x < 250 && y >= 215) ? id("table") : id("wall")));

  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, init = {}) => {
    const u = String(url), bodyJson = init.body ? JSON.parse(init.body) : null;
    calls.push({ u, method: init.method || "GET", body: bodyJson, auth: init.headers && init.headers.Authorization });
    const json = (o, status = 200) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => o });
    const file = (buf) => ({ ok: true, status: 200, headers: { get: (k) => (k === "content-length" ? String(buf.length) : null) }, arrayBuffer: async () => buf });
    if (u.endsWith("/models/simbrams/segformer-b5-finetuned-ade-640-640")) return json({ latest_version: { id: "a".repeat(64) } });
    if (u.endsWith("/predictions") && init.method === "POST") return json({ id: "seg123456", status: "succeeded", output: "https://replicate.delivery/seg/out.png", metrics: { predict_time: 2.1 } });
    if (u.includes("/models/black-forest-labs/") && u.endsWith("/predictions")) return json({ id: "gen123456", status: "succeeded", output: "https://replicate.delivery/gen/out.jpg", metrics: { predict_time: 9.5 } });
    if (u === "https://replicate.delivery/seg/out.png") return file(classPng);
    if (u === "https://replicate.delivery/gen/out.jpg") return file(furnished);
    throw new Error("unexpected fetch " + u);
  };
  try {
    const dataUri = (b) => `data:image/jpeg;base64,${b.toString("base64")}`;
    const run = async (mod, req) => { const res = mockRes(); await require(mod)({ headers: {}, query: {}, ...req }, res); return res; };

    const s = await run("../api/eval/segment", { method: "POST", body: { image: dataUri(original) } });
    assert.equal(s.code, 200, JSON.stringify(s.body));
    assert.equal(s.body.status, "succeeded", JSON.stringify(s.body));
    const masks = s.body.masks;
    assert.ok(masks.elements.some(e => e.type === "window"), JSON.stringify(masks.elements.map(e => e.label)));

    const a = await run("../api/eval/generate", { method: "POST", body: { method: "A", image: dataUri(original), style: "warm_luxury", room: "living", seed: 7 } });
    assert.equal(a.body.status, "succeeded", JSON.stringify(a.body));
    const genA = calls.find(c => c.u.endsWith("/black-forest-labs/flux-kontext-pro/predictions"));
    assert.ok(genA, "method A calls flux-kontext-pro");
    assert.equal(genA.body.input.aspect_ratio, "match_input_image");
    assert.equal(genA.body.input.seed, 7);
    assert.match(genA.body.input.prompt, /Do not change the architecture/);

    const c = await run("../api/eval/generate", { method: "POST", body: { method: "C", image: dataUri(original), style: "night_luxury", room: "living", inpaint: masks.inpaint } });
    assert.equal(c.body.status, "succeeded");
    const genC = calls.find(x => x.u.endsWith("/black-forest-labs/flux-fill-pro/predictions"));
    assert.ok(genC, "method C calls flux-fill-pro");
    const maskBuf = Buffer.from(genC.body.input.mask.split(",")[1], "base64");
    const mm = await sharp(maskBuf).metadata();
    assert.deepEqual([mm.width, mm.height], [W, H], "the inpaint mask matches the image size");

    for (const method of ["A", "B", "C"]) {
      const v = await run("../api/eval/validate", { method: "POST", body: { method, original: dataUri(original), generated: method === "C" ? c.body.image : a.body.image, masks } });
      assert.equal(v.body.status, "ok", JSON.stringify(v.body));
      assert.equal(typeof v.body.verdict.preservation.passed, "boolean");
      assert.equal(typeof v.body.verdict.design.passed, "boolean");
      if (method === "B") assert.ok(v.body.image || v.body.note, "B returns a composite or says why not");
    }
    // the eval key — never the production key — is what reaches Replicate
    assert.ok(calls.filter(x => x.u.startsWith("https://api.replicate.com")).every(x => x.auth === "Bearer eval-key"));
  } finally {
    global.fetch = realFetch;
  }
});
