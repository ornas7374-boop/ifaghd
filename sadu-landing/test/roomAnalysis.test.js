// Tests for parsing the room + style decision (the model call itself is tested in gemini.test.js).
// Run: node --test test/roomAnalysis.test.js

const test = require("node:test");
const assert = require("node:assert/strict");
const { parseAnswer, STYLES } = require("../api/_lib/roomAnalysis");

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

test("setup focus: only setup spaces and styles are offered, and the design prompt keeps the architecture", () => {
  const { SPACES, STYLES: S, buildPrompt } = require("../api/_lib/setup");
  assert.deepEqual(Object.keys(SPACES), ["setup_corner", "gaming_room", "home_office"]);
  assert.deepEqual(Object.keys(S), ["night_setup", "white_blue", "neon_purple", "rgb_setup", "grey_tech"]);
  const { userPrompt } = require("../api/_lib/roomAnalysis");
  const p = userPrompt([]);
  for (const k of Object.keys(S)) assert.ok(p.includes(`- ${k}:`));
  assert.ok(!/majlis|kitchen|najdi/.test(p), "old room types are gone");
  const d = buildPrompt("grey_tech", "setup_corner");
  assert.match(d, /not a new room/); assert.match(d, /floor exactly as it is/); assert.match(d, /every window and door, and the camera angle exactly as they are/);
  assert.match(d, /without covering a window or door/);
  assert.match(d, /No logos or readable text/);
});

test("walls and floor are kept: style text never repaints them; analysis descriptions go into the prompt", () => {
  const { STYLES: S, buildPrompt } = require("../api/_lib/setup");
  for (const [k, st] of Object.entries(S)) {
    assert.ok(!/\b(walls?|floor)\b[^;]*\b(paint|washed|panels?|wood-look)\b|\b(dark grey|white|charcoal|grey) walls\b|wood-look floor/i.test(st.prompt), `${k} prompt must not change walls or floor`);
    const p = buildPrompt(k, "setup_corner", { keep: { floor: "light beige marble tiles", walls: "off-white paint", ceiling: "tray ceiling" } });
    assert.match(p, /floor exactly as it is \(light beige marble tiles\)/);
    assert.match(p, /every wall exactly as it is \(off-white paint\)/);
    assert.match(p, /no rugs/);
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

test("the setup guide shapes the thinking: principles in the analysis, placement and layout in the design, protection first", () => {
  const { userPrompt } = require("../api/_lib/roomAnalysis");
  const { buildPrompt } = require("../api/_lib/setup");
  const a = userPrompt([], null);
  assert.match(a, /PERPENDICULAR to the window/); assert.match(a, /90-107 cm/); assert.match(a, /"use"/); assert.match(a, /"placement"/);
  const d = buildPrompt("grey_tech", "setup_corner", { placement: "desk on the back wall, window to the left", use: "streaming", request: "blue light" });
  assert.match(d, /Placement: desk on the back wall, window to the left/);
  assert.match(d, /key light on a stand/);
  assert.ok(d.indexOf("Keep unchanged") < d.indexOf("Add a grey tech"), "protection rules come before the style");
  assert.ok(d.indexOf("Keep unchanged") < d.indexOf("CUSTOMER"), "protection comes before the request");
  assert.ok(d.split(/\s+/).length < 380, "prompt stays short enough for the image model");
  const r = parseAnswer('{"room":"setup_corner","style":"grey_tech","why":"ركن.","use":"streaming","placement":"desk on the right wall"}');
  assert.equal(r.use, "streaming"); assert.equal(r.placement, "desk on the right wall");
  assert.equal(parseAnswer('{"room":"setup_corner","style":"grey_tech","why":"ركن.","use":"party"}').use, "mixed");
});
