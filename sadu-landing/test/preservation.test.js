// Tests for the architectural preservation validator.
// A synthetic room is drawn as SVG so the tests are deterministic and need no external
// images: ceiling, back wall, a window with a view, a door, a plank floor and furniture.
// Each variant applies one known change and the validator must judge it correctly.

const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { validatePreservation, compositeProtected, rectMask } = require("../api/_lib/preservation");

const W = 1200, H = 900;

function roomSvg(o = {}) {
  const win = o.window === false ? "" : (() => {
    const x = o.windowX ?? 380, y = 280, w = 240, h = 240;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>
      <rect x="${x + 20}" y="${y + 150}" width="40" height="90" fill="#4a5a6a"/>
      <rect x="${x + 70}" y="${y + 110}" width="50" height="130" fill="#3d4d5d"/>
      <rect x="${x + 130}" y="${y + 160}" width="35" height="80" fill="#55697a"/>
      <rect x="${x + 175}" y="${y + 130}" width="45" height="110" fill="#405060"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#f4f1ea" stroke-width="14"/>
      <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#f4f1ea" stroke-width="10"/>
      <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="#f4f1ea" stroke-width="10"/>`;
  })();
  const door = o.door === false ? "" : `
      <rect x="720" y="330" width="120" height="310" fill="#8a6a4a" stroke="#5a4030" stroke-width="8"/>
      <rect x="738" y="350" width="84" height="120" fill="none" stroke="#6a4c34" stroke-width="5"/>
      <rect x="738" y="490" width="84" height="130" fill="none" stroke="#6a4c34" stroke-width="5"/>
      <circle cx="822" cy="490" r="7" fill="#d8c08a"/>`;
  const coffers = o.ceiling ? `
      <rect x="380" y="40" width="440" height="140" fill="#2a2a2a"/>
      <rect x="420" y="70" width="360" height="80" fill="none" stroke="#ffd9a0" stroke-width="8"/>
      <line x1="300" y1="200" x2="900" y2="200" stroke="#ffd9a0" stroke-width="6"/>` : "";
  const planks = Array.from({ length: 14 }, (_, i) => {
    const y = 650 + i * 18 + i * i * 0.6;
    return `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#7a5a3a" stroke-width="2"/>`;
  }).join("");
  const furniture = o.redesign ? `
      <rect x="180" y="700" width="560" height="170" rx="10" fill="#c9b8a6"/>
      <rect x="230" y="590" width="460" height="150" rx="40" fill="#5b6b5a"/>
      <rect x="250" y="560" width="160" height="90" rx="30" fill="#e8dcc8"/>
      <rect x="510" y="560" width="160" height="90" rx="30" fill="#e8dcc8"/>
      <circle cx="1040" cy="760" r="70" fill="#2f2f2f"/>
      ${o.blockDoor ? '<rect x="700" y="360" width="170" height="300" fill="#3a2e26"/><line x1="785" y1="360" x2="785" y2="660" stroke="#1e1712" stroke-width="4"/>' : ""}
      <rect x="140" y="600" width="60" height="240" fill="#3d5a3a"/>
      <ellipse cx="170" cy="590" rx="70" ry="50" fill="#4f7a4a"/>`
    : `
      <rect x="420" y="560" width="380" height="240" fill="#d9d2c5"/>
      <rect x="420" y="520" width="380" height="60" fill="#8c7b6b"/>
      <rect x="440" y="585" width="150" height="50" rx="12" fill="#ffffff"/>
      <rect x="630" y="585" width="150" height="50" rx="12" fill="#ffffff"/>
      <rect x="330" y="640" width="70" height="90" fill="#6b5745"/>`;
  const curtains = o.curtains ? `
      <rect x="350" y="250" width="70" height="420" fill="#e9e2d6" opacity="0.95"/>
      <rect x="580" y="250" width="70" height="420" fill="#e9e2d6" opacity="0.95"/>
      <line x1="330" y1="250" x2="670" y2="250" stroke="#333" stroke-width="5"/>` : "";
  const pendant = o.pendant ? `
      <line x1="600" y1="60" x2="600" y2="170" stroke="#222" stroke-width="3"/>
      <ellipse cx="600" cy="185" rx="45" ry="22" fill="#c8a24a"/>` : "";
  const cabinet = o.cabinet ? '<rect x="700" y="360" width="170" height="300" fill="#3a2e26"/><line x1="785" y1="360" x2="785" y2="660" stroke="#1e1712" stroke-width="4"/>' : "";
  const relight = o.relight ? `<rect x="0" y="0" width="${W}" height="${H}" fill="#20140a" opacity="0.38"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fb8e0"/><stop offset="1" stop-color="#dfeaf2"/></linearGradient></defs>
    <polygon points="0,0 1200,0 900,220 300,220" fill="#f2efe9"/>
    <polygon points="0,0 300,220 300,640 0,900" fill="#d8d0c4"/>
    <polygon points="1200,0 900,220 900,640 1200,900" fill="#d3cabd"/>
    <rect x="300" y="220" width="600" height="420" fill="#e4ddd1"/>
    <polygon points="0,900 300,640 900,640 1200,900" fill="#a07c58"/>
    ${planks}
    <line x1="300" y1="220" x2="900" y2="220" stroke="#cfc6b8" stroke-width="3"/>
    ${coffers}${win}${door}${curtains}${furniture}${cabinet}${pendant}${relight}
  </svg>`;
}

const render = (o, fmt = "jpeg") => sharp(Buffer.from(roomSvg(o)))[fmt]({ quality: 88 }).toBuffer();

// Protected architecture of the ORIGINAL room (normalised rectangles).
const ELEMENTS = [
  { type: "ceiling", label: "ceiling", mask: rectMask([[0.27, 0.02, 0.73, 0.22]]) },
  { type: "wall", label: "upper_wall", mask: rectMask([[0.26, 0.25, 0.74, 0.30]]) },
  { type: "window", label: "window_1", mask: rectMask([[380 / W, 280 / H, 620 / W, 520 / H]]) },
  { type: "door", label: "door_1", mask: rectMask([[720 / W, 330 / H, 840 / W, 640 / H]]) }
];
const EDITABLE = rectMask([[0, 0.60, 1, 1]]);

let original;
test.before(async () => { original = await render({}); });

async function check(variantBuf) { return validatePreservation(original, variantBuf, ELEMENTS, EDITABLE); }

test("identical image: architecture preserved but NOT accepted (nothing redesigned)", async () => {
  const r = await check(await render({}));
  assert.equal(r.preservation.passed, true, r.reasons.join("; "));
  assert.equal(r.design.passed, false);
  assert.ok(r.design.issues.some(i => i.code === "no_real_redesign"));
  assert.equal(r.accepted, false);
});

test("global relight only (night style): preserved, not counted as a redesign", async () => {
  const r = await check(await render({ relight: true }));
  assert.equal(r.pass, true, r.reasons.join("; "));
  assert.equal(r.changed, false);
});

test("furniture redesigned: accepted", async () => {
  const r = await check(await render({ redesign: true }));
  assert.equal(r.pass, true, r.reasons.join("; "));
  assert.equal(r.changed, true, JSON.stringify(r.change));
  assert.equal(r.accepted, true);
});

test("redesign + darker night lighting: accepted", async () => {
  const r = await check(await render({ redesign: true, relight: true }));
  assert.equal(r.accepted, true, r.reasons.join("; "));
});

test("redesign + curtains + pendant light (allowed occlusions): accepted", async () => {
  const r = await check(await render({ redesign: true, curtains: true, pendant: true }));
  assert.equal(r.accepted, true, r.reasons.join("; ") + " " + JSON.stringify(r.elements));
});

test("window removed: PRESERVATION failed — reason is the window, not the camera", async () => {
  const r = await check(await render({ redesign: true, window: false }));
  assert.equal(r.preservation.passed, false);
  assert.equal(r.framing.ok, true, "a removed window must not be reported as a camera change: " + JSON.stringify(r.framing));
  assert.ok(r.preservation.failures.some(f => f.element === "window_1" && f.code === "element_removed"), r.reasons.join("; "));
});

test("window moved: PRESERVATION failed — reason is the window moving, not the camera", async () => {
  const r = await check(await render({ redesign: true, windowX: 480 }));
  assert.equal(r.preservation.passed, false);
  assert.equal(r.framing.ok, true, JSON.stringify(r.framing));
  assert.ok(r.preservation.failures.some(f => f.element === "window_1" && f.code === "element_moved"), r.reasons.join("; ") + JSON.stringify(r.elements));
});

test("door removed: PRESERVATION failed on the door", async () => {
  const r = await check(await render({ redesign: true, door: false }));
  assert.equal(r.preservation.passed, false);
  assert.ok(r.preservation.failures.some(f => f.element === "door_1" && f.code === "element_removed"), r.reasons.join("; "));
});

test("new wardrobe placed in front of the door: architecture preserved, DESIGN failed (door blocked)", async () => {
  const r = await check(await render({ redesign: true, blockDoor: true }));
  assert.equal(r.preservation.passed, true, "the door still exists behind the wardrobe: " + r.reasons.join("; "));
  assert.equal(r.accepted, false);
  assert.ok(r.design.issues.some(i => i.element === "door_1" && i.code === "door_blocked"), r.reasons.join("; "));
});

test("ceiling redesigned (coffers + LED): PRESERVATION failed on the ceiling", async () => {
  const r = await check(await render({ redesign: true, ceiling: true }));
  assert.equal(r.preservation.passed, false);
  assert.ok(r.preservation.failures.some(f => f.element === "ceiling" && f.code === "element_changed"), r.reasons.join("; "));
});

test("camera zoomed in 10%: FAILED on framing", async () => {
  const full = await render({ redesign: true });
  const zoomed = await sharp(full).extract({ left: 60, top: 45, width: 1080, height: 810 }).resize(W, H).jpeg().toBuffer();
  const r = await check(zoomed);
  assert.equal(r.pass, false);
  assert.ok(r.preservation.failures.some(f => f.code === "camera_framing_changed"), r.reasons.join("; ") + JSON.stringify(r.framing));
});

test("camera shifted 5%: FAILED on framing", async () => {
  const full = await render({ redesign: true });
  const extended = await sharp(full).extend({ left: 60, background: "#e4ddd1" }).png().toBuffer();
  const shifted = await sharp(extended).extract({ left: 0, top: 0, width: W, height: H }).jpeg().toBuffer();
  const r = await check(shifted);
  assert.equal(r.pass, false);
  assert.ok(r.preservation.failures.some(f => f.code === "camera_framing_changed"), r.reasons.join("; ") + JSON.stringify(r.framing));
});

test("aspect ratio changed: FAILED immediately", async () => {
  const squashed = await sharp(await render({ redesign: true })).resize(1200, 800, { fit: "fill" }).jpeg().toBuffer();
  const r = await check(squashed);
  assert.equal(r.pass, false);
  assert.ok(r.reasons[0].startsWith("aspect_changed"));
});

test("same framing at a different resolution (model output size): still accepted", async () => {
  const smaller = await sharp(await render({ redesign: true })).resize(1024, 768).jpeg().toBuffer();
  const r = await check(smaller);
  assert.equal(r.accepted, true, r.reasons.join("; "));
});

test("method B: compositing protected regions back repairs a removed window", async () => {
  const broken = await render({ redesign: true, window: false });
  const protectedMask = rectMask([[0.27, 0.02, 0.73, 0.22], [0.26, 0.25, 0.74, 0.30],
    [370 / W, 270 / H, 630 / W, 530 / H], [710 / W, 320 / H, 850 / W, 645 / H]]);
  const repaired = await compositeProtected(original, broken, protectedMask);
  const r = await check(repaired);
  assert.equal(r.accepted, true, r.reasons.join("; ") + JSON.stringify(r.elements));
});

test("method B: outside the protected mask the composite equals the generated image (no ghosting)", async () => {
  const gen = await render({ redesign: true, window: false });
  const protectedMask = rectMask([[370 / W, 270 / H, 630 / W, 530 / H]]);
  const out = await compositeProtected(original, gen, protectedMask, 6);
  const [a, b] = await Promise.all([sharp(out).raw().toBuffer(), sharp(gen).raw().toBuffer()]);
  // sample the lower half (far from the mask): only JPEG noise is allowed
  let diff = 0, n = 0;
  for (let y = 700; y < 880; y += 3) for (let x = 0; x < W; x += 3) {
    const i = (y * W + x) * 3; diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); n += 3;
  }
  assert.ok(diff / n < 4, `mean channel difference ${(diff / n).toFixed(2)} outside the mask`);
});

// ---- original furniture in front of architecture (occluders) ----

const CABINET = rectMask([[700 / W, 360 / H, 870 / W, 660 / H]]);

test("old furniture covered part of the door: with an occluders mask, removing it is NOT a false failure", async () => {
  const orig = await render({ cabinet: true });
  const gen = await render({ redesign: true }); // cabinet gone, door now fully visible
  const withOcc = await validatePreservation(orig, gen, ELEMENTS, { editableMask: EDITABLE, occluders: CABINET });
  assert.equal(withOcc.preservation.passed, true, withOcc.reasons.join("; ") + JSON.stringify(withOcc.elements));
  assert.equal(withOcc.elements.find(e => e.label === "door_1").status, "preserved");
  // control: without the occluders mask the same pair is misjudged, proving the mask matters
  const without = await validatePreservation(orig, gen, ELEMENTS, { editableMask: EDITABLE });
  assert.notEqual(without.elements.find(e => e.label === "door_1").status, "preserved");
});

test("method B never restores old furniture: occluder pixels come from the generated image", async () => {
  const orig = await render({ cabinet: true });
  const gen = await render({ redesign: true, window: false });
  const pm = rectMask([[370 / W, 270 / H, 630 / W, 530 / H], [710 / W, 320 / H, 850 / W, 645 / H]]);
  const out = await compositeProtected(orig, gen, pm, { occluders: CABINET });
  const [a, g, o] = await Promise.all([sharp(out).raw().toBuffer(), sharp(gen).raw().toBuffer(), sharp(orig).raw().toBuffer()]);
  let dGen = 0, dOrig = 0, n = 0;
  for (let y = 400; y < 620; y += 3) for (let x = 730; x < 830; x += 3) {
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) { dGen += Math.abs(a[i + c] - g[i + c]); dOrig += Math.abs(a[i + c] - o[i + c]); n++; }
  }
  assert.ok(dGen / n < 4, `inside the old cabinet the composite should equal the generated image (diff ${(dGen / n).toFixed(1)})`);
  assert.ok(dOrig / n > 20, `old cabinet pixels must not come back (diff to original ${(dOrig / n).toFixed(1)})`);
  // and the removed window is still repaired
  const r = await validatePreservation(orig, out, ELEMENTS, { editableMask: EDITABLE, occluders: CABINET });
  assert.equal(r.elements.find(e => e.label === "window_1").status, "preserved", JSON.stringify(r.elements));
});

// ---- input safety ----

test("rejects non-buffer and oversized inputs", async () => {
  await assert.rejects(validatePreservation("not-a-buffer", original), /Buffer/);
  await assert.rejects(validatePreservation(original, Buffer.alloc(16 * 1024 * 1024)), /size/);
});


test("no element masks available: the camera check still works from the whole image", async () => {
  const full = await render({ redesign: true });
  const zoomed = await sharp(full).extract({ left: 48, top: 36, width: 1104, height: 828 }).resize(W, H).jpeg().toBuffer();
  const r = await validatePreservation(original, zoomed, []);
  assert.equal(r.framing.ok, false, JSON.stringify(r.framing));
  const same = await validatePreservation(original, await render({ redesign: true }), []);
  assert.equal(same.framing.ok, true, JSON.stringify(same.framing));
});
