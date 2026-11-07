// Gemini provider tests (network simulated). Run: node --test test/gemini.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { generateImage, analyzeRoomGemini } = require("../api/_lib/gemini");

const IMG = "data:image/jpeg;base64,AAAA";
function mockFetch(handler) {
  const calls = [], real = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, json } = handler(String(url), calls.length);
    return { ok: status < 300, status, headers: { get: () => null }, json: async () => json };
  };
  return { calls, restore: () => { global.fetch = real; } };
}
const reply = (parts) => ({ candidates: [{ content: { parts }, finishReason: "STOP" }] });

test("image: sends photo + prompt, key in header (not URL), returns a data URI", async () => {
  const m = mockFetch(() => ({ json: reply([{ text: "ok" }, { inlineData: { mimeType: "image/png", data: "QUJD" } }]) }));
  try {
    const r = await generateImage("k-123", IMG, "make it cozy");
    assert.equal(r.output, "data:image/png;base64,QUJD");
    const c = m.calls[0];
    assert.ok(!c.url.includes("k-123"), "key must not be in the URL");
    assert.equal(c.headers["x-goog-api-key"], "k-123");
    assert.equal(c.body.contents[0].parts[0].text, "make it cozy");
    assert.equal(c.body.contents[0].parts[1].inline_data.data, "AAAA");
  } finally { m.restore(); }
});

test("image: explains when the model returns no image", async () => {
  const m = mockFetch(() => ({ json: { candidates: [{ content: { parts: [{ text: "sorry" }] }, finishReason: "IMAGE_SAFETY" }] } }));
  try { await assert.rejects(generateImage("k", IMG, "p"), (e) => e.message === "gemini_no_image" && e.detail === "IMAGE_SAFETY"); }
  finally { m.restore(); }
});

test("image: HTTP errors carry status and message", async () => {
  const m = mockFetch(() => ({ status: 403, json: { error: { message: "API key not valid" } } }));
  try { await assert.rejects(generateImage("k", IMG, "p"), (e) => e.message === "gemini_403" && /not valid/.test(e.detail)); }
  finally { m.restore(); }
});

test("rejects non-image input", async () => {
  await assert.rejects(generateImage("k", "http://evil/x.png", "p"), /bad_image/);
});

test("analysis: parses the JSON answer and honours excluded styles", async () => {
  const m = mockFetch(() => ({ json: reply([{ text: '{"room":"bedroom","room_confidence":0.9,"style":"quiet_luxury","why":"غرفة نوم هادئة."}' }]) }));
  try {
    const r = await analyzeRoomGemini("k", IMG, { exclude: ["night_luxury"] });
    assert.equal(r.room, "bedroom"); assert.equal(r.style, "quiet_luxury");
    assert.ok(!m.calls[0].body.contents[0].parts[0].text.includes("- night_luxury:"));
    assert.ok(m.calls[0].body.systemInstruction.parts[0].text.length > 20);
  } finally { m.restore(); }
});

test("endpoints use Gemini only when SADU_PROVIDER=gemini", async () => {
  const mk = () => ({ code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
  const design = require("../api/design"), analyze = require("../api/analyze");
  const saved = { ...process.env };
  try {
    process.env.SADU_PROVIDER = "gemini"; delete process.env.GEMINI_API_KEY; process.env.REPLICATE_API_TOKEN = "r8_x";
    const r1 = mk(); await design({ method: "POST", body: {} }, r1); assert.equal(r1.body.error, "missing_token");
    process.env.GEMINI_API_KEY = "g-key";
    const m = mockFetch((url) => url.includes("generativelanguage") ? { json: reply([{ inlineData: { mimeType: "image/jpeg", data: "QUJD" } }]) } : { status: 500, json: {} });
    try {
      const r2 = mk(); await design({ method: "POST", body: { image: IMG, style: "warm_luxury", room: "bedroom" } }, r2);
      assert.equal(r2.code, 200); assert.match(r2.body.output, /^data:image\/jpeg;base64,/);
      assert.ok(m.calls.every(c => c.url.includes("generativelanguage")), "Replicate must not be called");
      m.restore();
      const m2 = mockFetch(() => ({ json: reply([{ text: '{"room":"office","room_confidence":0.9,"style":"calm_modern","why":"مكتب."}' }]) }));
      try { const r3 = mk(); await analyze({ method: "POST", body: { image: IMG } }, r3); assert.equal(r3.code, 200); assert.equal(r3.body.room, "office"); }
      finally { m2.restore(); }
    } finally { m.restore(); }
  } finally { for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test("404 on the default model: lists the account's models and retries with the newest fit", async () => {
  require("../api/_lib/gemini")._reset();
  const m = mockFetch((url) => {
    if (url.includes("/models?")) return { json: { models: [
      { name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.0-flash-image", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.0-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.0-flash-tts", supportedGenerationMethods: ["generateContent"] },
      { name: "models/imagen-4", supportedGenerationMethods: ["predict"] }] } };
    if (url.includes("gemini-2.5")) return { status: 404, json: { error: { message: "not found" } } };
    if (url.includes("gemini-3.0-flash-image:")) return { json: reply([{ inlineData: { mimeType: "image/png", data: "QQ==" } }]) };
    if (url.includes("gemini-3.0-flash:")) return { json: reply([{ text: '{"room":"living","room_confidence":0.8,"style":"warm_luxury","why":"صالة."}' }]) };
    return { status: 500, json: {} };
  });
  try {
    const a = await analyzeRoomGemini("k", IMG); assert.equal(a.model, "gemini-3.0-flash");
    const g = await generateImage("k", IMG, "p"); assert.equal(g.model, "gemini-3.0-flash-image");
    const n = m.calls.length; await generateImage("k", IMG, "p");
    assert.equal(m.calls.length - n, 1, "remembered: one call next time");
  } finally { m.restore(); require("../api/_lib/gemini")._reset(); }
});

test("a model that hangs fails clearly inside the time budget (no 60 s Vercel timeout)", async () => {
  require("../api/_lib/gemini")._reset();
  const real = global.fetch;
  global.fetch = (url, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted"))));
  try {
    const t0 = Date.now();
    await assert.rejects(analyzeRoomGemini("k", IMG, { budgetMs: 1500 }), /gemini_timeout/);
    assert.ok(Date.now() - t0 < 3000);
  } finally { global.fetch = real; }
});

test("analysis asks for low thinking on 2.5 models", async () => {
  require("../api/_lib/gemini")._reset();
  const m = mockFetch(() => ({ json: reply([{ text: '{"room":"living","style":"warm_luxury","why":"صالة."}' }]) }));
  try { await analyzeRoomGemini("k", IMG); assert.deepEqual(m.calls[0].body.generationConfig.thinkingConfig, { thinkingBudget: 0 }); }
  finally { m.restore(); }
});

test("overloaded model (503): falls back to the next model on the account", async () => {
  require("../api/_lib/gemini")._reset();
  const m = mockFetch((url) => {
    if (url.includes("/models?")) return { json: { models: [
      { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.5-flash", supportedGenerationMethods: ["generateContent"] }] } };
    if (url.includes("gemini-2.5-flash:") || url.includes("gemini-3.8-flash:")) return { status: 503, json: { error: { message: "high demand" } } };
    if (url.includes("gemini-3.5-flash:")) return { json: reply([{ text: '{"room":"living","style":"warm_luxury","why":"صالة."}' }]) };
    return { status: 500, json: {} };
  });
  try { const a = await analyzeRoomGemini("k", IMG); assert.equal(a.model, "gemini-3.5-flash"); }
  finally { m.restore(); require("../api/_lib/gemini")._reset(); }
});
