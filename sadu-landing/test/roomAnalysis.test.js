// Tests for the automatic room + style decision (Replicate simulated, no network).
// Run: node --test test/roomAnalysis.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseAnswer, analyzeRoom, STYLES, _resetWorkingModel } = require("../api/_lib/roomAnalysis");
test.beforeEach(() => _resetWorkingModel());

test("parses a clean JSON answer", () => {
  const r = parseAnswer('{"room":"setup_corner","room_confidence":0.92,"style":"grey_tech","why":"هذه غرفة نوم هادئة الإضاءة.","seen":["bed","window"]}');
  assert.equal(r.room, "setup_corner"); assert.equal(r.style, "grey_tech"); assert.equal(r.confidence, 0.92);
  assert.match(r.why, /غرفة نوم/);
});

test("tolerates text around the JSON (models sometimes add it)", () => {
  const r = parseAnswer('Here is my answer:\n```json\n{"room":"home_office","room_confidence":1,"style":"white_blue","why":"مطبخ مشرق."}\n```');
  assert.equal(r.room, "home_office");
});

test("rejects unknown rooms and styles instead of guessing", () => {
  assert.throws(() => parseAnswer('{"room":"garage","style":"white_blue"}'), /analysis_bad_room/);
  assert.throws(() => parseAnswer('{"room":"setup_corner","style":"cyberpunk"}'), /analysis_bad_style/);
  assert.throws(() => parseAnswer("no json here"), /analysis_no_json/);
});

test("'another style' cannot return a style that was already tried", () => {
  assert.throws(() => parseAnswer('{"room":"setup_corner","style":"grey_tech","why":"x"}', ["grey_tech"]), /analysis_bad_style/);
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
    : { json: { id: "p1", status: "succeeded", output: ['{"room":"gaming_room","room_confidence":0.8,', '"style":"white_blue","why":"صالة مشرقة."}'] } });
  try {
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA", { exclude: ["night_setup"] });
    assert.equal(r.room, "gaming_room"); assert.equal(r.style, "white_blue"); assert.equal(r.model, "anthropic/claude-4-sonnet");
    const sent = m.calls[1].body.input;
    assert.equal(sent.image, "data:image/jpeg;base64,AAAA");
    assert.ok(!sent.prompt.includes("- night_setup:"), "excluded style is not offered");
    assert.ok(sent.prompt.includes("- white_blue:"));
  } finally { m.restore(); }
});

test("waits for a slow prediction", async () => {
  const m = mockFetch((url, n) => n === 1 ? { json: { id: "p2", status: "processing" } }
    : { json: { id: "p2", status: "succeeded", output: '{"room":"gaming_room","room_confidence":0.7,"style":"neon_purple","why":"مجلس رجال."}' } });
  try {
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(r.style, "neon_purple");
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
  const m = mockFetch(() => ({ json: { id: "p", status: "succeeded", output: '{"room":"home_office","room_confidence":0.9,"style":"rgb_setup","why":"مكتب صغير."}' } }));
  try {
    const r3 = mk(); await handler({ method: "POST", body: { image: "data:image/jpeg;base64,AAAA" } }, r3);
    assert.equal(r3.code, 200); assert.equal(r3.body.room, "home_office");
  } finally { m.restore(); }
  assert.equal(Object.keys(STYLES).length, 5);
});

test("rate limited (429): waits and retries instead of failing", async () => {
  const m = mockFetch((url, n) => n === 1 ? { status: 429, json: { detail: "throttled" } }
    : { json: { id: "p3", status: "succeeded", output: '{"room":"setup_corner","room_confidence":0.9,"style":"grey_tech","why":"غرفة نوم."}' } });
  try {
    const t0 = Date.now();
    const r = await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(r.style, "grey_tech");
    assert.equal(m.calls.length, 2, "one retry");
    assert.ok(Date.now() - t0 >= 1900, "waited before retrying");
  } finally { m.restore(); }
});

test("remembers the model that worked, so the next request is a single call", async () => {
  const m = mockFetch((url) => url.includes("claude-4.5-sonnet") ? { status: 404, json: {} }
    : { json: { id: "p4", status: "succeeded", output: '{"room":"home_office","room_confidence":0.9,"style":"white_blue","why":"مطبخ."}' } });
  try {
    await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    const before = m.calls.length;
    await analyzeRoom("tok", "data:image/jpeg;base64,AAAA");
    assert.equal(m.calls.length - before, 1, "second request goes straight to the working model");
    assert.ok(m.calls[m.calls.length - 1].url.includes("claude-4-sonnet"));
  } finally { m.restore(); }
});

test("setup focus: only setup spaces and styles are offered, and the design prompt keeps the architecture", () => {
  const { SPACES, STYLES: S, buildPrompt } = require("../api/_lib/setup");
  assert.deepEqual(Object.keys(SPACES), ["setup_corner", "gaming_room", "home_office"]);
  assert.deepEqual(Object.keys(S), ["night_setup", "white_blue", "neon_purple", "rgb_setup", "grey_tech"]);
  const { userPrompt } = require("../api/_lib/roomAnalysis");
  const p = userPrompt([]);
  for (const k of Object.keys(S)) assert.ok(p.includes(`- ${k}:`));
  assert.ok(!/majlis|kitchen|najdi/.test(p), "old room types are gone");
  const d = buildPrompt("grey_tech", "setup_corner");
  assert.match(d, /not a new room/); assert.match(d, /floor exactly as it is/); assert.match(d, /every window and door in the same position/);
  assert.match(d, /without covering any window or door/);
  assert.match(d, /No brand logos/);
});

test("walls and floor are kept: style text never repaints them; analysis descriptions go into the prompt", () => {
  const { STYLES: S, buildPrompt } = require("../api/_lib/setup");
  for (const [k, st] of Object.entries(S)) {
    assert.ok(!/\b(walls?|floor)\b[^;]*\b(paint|washed|panels?|wood-look)\b|\b(dark grey|white|charcoal|grey) walls\b|wood-look floor/i.test(st.prompt), `${k} prompt must not change walls or floor`);
    const p = buildPrompt(k, "setup_corner", { keep: { floor: "light beige marble tiles", walls: "off-white paint", ceiling: "tray ceiling" } });
    assert.match(p, /floor exactly as it is \(light beige marble tiles\)/);
    assert.match(p, /every wall exactly as it is \(off-white paint\)/);
    assert.match(p, /do not add rugs/);
    assert.ok(!p.includes(st.wall), "wall treatment is not used unless allowed");
    assert.ok(buildPrompt(k, "setup_corner", { allowWall: true }).includes(st.wall));
  }
  const r = parseAnswer('{"room":"setup_corner","style":"grey_tech","why":"ركن.","floor":"beige marble <b>tiles</b>","walls":"off-white","ceiling":"tray"}');
  assert.ok(!/[<>]/.test(r.keep.floor) && r.keep.floor.startsWith("beige marble")); assert.equal(r.keep.walls, "off-white");
});

test("the customer's request reaches the analysis and the design prompt; walls change only when asked", () => {
  const { userPrompt } = require("../api/_lib/roomAnalysis");
  const { buildPrompt } = require("../api/_lib/setup");
  const p = userPrompt([], { description: "أبغى إضاءة زرقاء", changes: ["lighting"] });
  assert.match(p, /THE CUSTOMER'S REQUEST/); assert.ok(p.includes("أبغى إضاءة زرقاء")); assert.match(p, /lighting/);
  assert.ok(!userPrompt([], null).includes("CUSTOMER"), "no request block without a request");
  const d = buildPrompt("grey_tech", "setup_corner", { request: "blue LED lighting behind the desk and monitor", changes: ["lighting"] });
  assert.match(d, /THE CUSTOMER'S REQUEST, which overrides the style wherever they differ: blue LED lighting/);
  assert.match(d, /every wall exactly as it is/);
  const w = buildPrompt("grey_tech", "setup_corner", { request: "wood slat wall", changes: ["wall"] });
  assert.match(w, /only the wall behind the desk may get/);
  assert.match(w, /floor exactly as it is/, "floor stays protected even when the wall may change");
  const r = parseAnswer('{"room":"setup_corner","style":"white_blue","why":"ركن.","request":"blue lighting","wall_change":true}');
  assert.equal(r.request, "blue lighting"); assert.equal(r.wall_change, true);
  assert.equal(parseAnswer('{"room":"setup_corner","style":"white_blue","why":"ركن."}').wall_change, false);
});
