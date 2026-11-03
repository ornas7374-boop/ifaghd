// Tests for the automatic room + style decision (Replicate simulated, no network).
// Run: node --test test/roomAnalysis.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseAnswer, analyzeRoom, STYLES, _resetWorkingModel } = require("../api/_lib/roomAnalysis");
test.beforeEach(() => _resetWorkingModel());

test("parses a clean JSON answer", () => {
  const r = parseAnswer('{"room":"bedroom","room_confidence":0.92,"style":"quiet_luxury","why":"هذه غرفة نوم هادئة الإضاءة.","seen":["bed","window"]}');
  assert.equal(r.room, "bedroom"); assert.equal(r.style, "quiet_luxury"); assert.equal(r.confidence, 0.92);
  assert.match(r.why, /غرفة نوم/);
});

test("tolerates text around the JSON (models sometimes add it)", () => {
  const r = parseAnswer('Here is my answer:\n```json\n{"room":"kitchen","room_confidence":1,"style":"warm_luxury","why":"مطبخ مشرق."}\n```');
  assert.equal(r.room, "kitchen");
});

test("rejects unknown rooms and styles instead of guessing", () => {
  assert.throws(() => parseAnswer('{"room":"garage","style":"warm_luxury"}'), /analysis_bad_room/);
  assert.throws(() => parseAnswer('{"room":"bedroom","style":"cyberpunk"}'), /analysis_bad_style/);
  assert.throws(() => parseAnswer("no json here"), /analysis_no_json/);
});

test("'another style' cannot return a style that was already tried", () => {
  assert.throws(() => parseAnswer('{"room":"bedroom","style":"quiet_luxury","why":"x"}', ["quiet_luxury"]), /analysis_bad_style/);
});

function mockFetch(handler) {
  const calls = [], real = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, json } = handler(String(url), calls.length);
    return { ok: status < 300, status, json: async () => json };
  };
  return { calls, restore: () => { global.fetch = real; } };
}

test("tries the next model when one is not available, and sends the photo and the excluded styles", async () => {
  const m = mockFetch((url) => url.includes("claude-4.5-sonnet")
    ? { status: 404, json: { detail: "not found" } }
    : { json: { id: "p1", status: "succeeded", output: ['{"room":"living","room_confidence":0.8,', '"style":"warm_luxury","why":"صالة مشرقة."}'] } });
  try {
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA", { exclude: ["night_luxury"] });
    assert.equal(r.room, "living"); assert.equal(r.style, "warm_luxury"); assert.equal(r.model, "anthropic/claude-4-sonnet");
    const sent = m.calls[1].body.input;
    assert.equal(sent.image, "data:image/jpeg;base64,AAAA");
    assert.ok(!sent.prompt.includes("- night_luxury:"), "excluded style is not offered");
    assert.ok(sent.prompt.includes("- warm_luxury:"));
  } finally { m.restore(); }
});

test("waits for a slow prediction", async () => {
  const m = mockFetch((url, n) => n === 1 ? { json: { id: "p2", status: "processing" } }
    : { json: { id: "p2", status: "succeeded", output: '{"room":"majlis_men","room_confidence":0.7,"style":"najdi","why":"مجلس رجال."}' } });
  try {
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(r.style, "najdi");
  } finally { m.restore(); }
});

test("reports clearly when no vision model is available", async () => {
  const m = mockFetch(() => ({ status: 404, json: {} }));
  try { await assert.rejects(analyzeRoom("tok", "data:image/jpeg;base64,AAAA"), /analysis_model_unavailable/); }
  finally { m.restore(); }
});

test("endpoint: rejects bad input, uses the server key", async () => {
  const handler = require("../api/analyze");
  const mk = () => ({ code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
  process.env.REPLICATE_API_TOKEN = "server-key";
  const r1 = mk(); await handler({ method: "GET" }, r1); assert.equal(r1.code, 405);
  const r2 = mk(); await handler({ method: "POST", body: { image: "http://evil/x.png" } }, r2); assert.equal(r2.code, 400);
  const m = mockFetch(() => ({ json: { id: "p", status: "succeeded", output: '{"room":"office","room_confidence":0.9,"style":"calm_modern","why":"مكتب صغير."}' } }));
  try {
    const r3 = mk(); await handler({ method: "POST", body: { image: "data:image/jpeg;base64,AAAA" } }, r3);
    assert.equal(r3.code, 200); assert.equal(r3.body.room, "office");
  } finally { m.restore(); }
  assert.ok(Object.keys(STYLES).length >= 11);
});

test("rate limited (429): waits and retries instead of failing", async () => {
  const m = mockFetch((url, n) => n === 1 ? { status: 429, json: { detail: "throttled" } }
    : { json: { id: "p3", status: "succeeded", output: '{"room":"bedroom","room_confidence":0.9,"style":"quiet_luxury","why":"غرفة نوم."}' } });
  try {
    const t0 = Date.now();
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(r.style, "quiet_luxury");
    assert.equal(m.calls.length, 2, "one retry");
    assert.ok(Date.now() - t0 >= 1900, "waited before retrying");
  } finally { m.restore(); }
});

test("remembers the model that worked, so the next request is a single call", async () => {
  const m = mockFetch((url) => url.includes("claude-4.5-sonnet") ? { status: 404, json: {} }
    : { json: { id: "p4", status: "succeeded", output: '{"room":"kitchen","room_confidence":0.9,"style":"warm_luxury","why":"مطبخ."}' } });
  try {
    await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    const before = m.calls.length;
    await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(m.calls.length - before, 1, "second request goes straight to the working model");
    assert.ok(m.calls[m.calls.length - 1].url.includes("claude-4-sonnet"));
  } finally { m.restore(); }
});
