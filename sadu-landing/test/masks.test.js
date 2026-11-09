// Tests for building preservation masks from a semantic segmentation class map.
// The class map mirrors the synthetic room used in preservation.test.js, as a segmentation
// model would label it (ADE20K ids), so masks can also be checked end-to-end with the validator.

const test = require("node:test");
const assert = require("node:assert/strict");
const { ADE20K } = require("../api/_lib/ade20k");
const { buildMasks, encodeMasks, decodeMasks } = require("../api/_lib/masks");

const id = (name) => ADE20K.indexOf(name);
const nameOf = (i) => ADE20K[i];
const W = 300, H = 225, S = 1200 / W; // class map at 1/4 of the 1200x900 room

function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Class map of the synthetic room. opts.window2 adds a second window, opts.noFloor hides the floor. */
function roomClassMap(opts = {}) {
  const data = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x * S + S / 2, Y = y * S + S / 2;
    let c = "wall";
    if (inPoly(X, Y, [[0, 0], [1200, 0], [900, 220], [300, 220]])) c = "ceiling";
    else if (!opts.noFloor && inPoly(X, Y, [[0, 900], [300, 640], [900, 640], [1200, 900]])) c = "floor";
    if (X >= 380 && X < 620 && Y >= 280 && Y < 520) c = (Y > 390 && ((X > 400 && X < 440) || (X > 450 && X < 500))) ? "building" : "sky";
    if (X >= 380 && X < 620 && Y >= 280 && Y < 520 && (Math.abs(X - 500) < 5 || Math.abs(Y - 400) < 5)) c = "windowpane";
    if (opts.window2 && X >= 120 && X < 220 && Y >= 300 && Y < 450) c = "windowpane";
    if (X >= 720 && X < 840 && Y >= 330 && Y < 640) c = "door";
    if (X >= 420 && X < 800 && Y >= 520 && Y < 800) c = "bed";
    if (X >= 330 && X < 400 && Y >= 640 && Y < 730) c = "cabinet";
    if (opts.noise && X >= 1000 && X < 1010 && Y >= 100 && Y < 108) c = "windowpane"; // tiny false detection
    data[y * W + x] = id(c);
  }
  return { w: W, h: H, data };
}

const share = (m, x0, y0, x1, y1) => { // share of a box (in 1200x900 coords) covered by mask m
  let n = 0, s = 0;
  for (let y = Math.floor(y0 / S); y < Math.ceil(y1 / S); y++) for (let x = Math.floor(x0 / S); x < Math.ceil(x1 / S); x++) { n++; s += m.data[y * m.w + x]; }
  return s / n;
};

test("finds the window (glass + view), the door, the ceiling and the upper wall", () => {
  const m = buildMasks(roomClassMap(), nameOf);
  const labels = m.elements.map(e => e.label).sort();
  assert.deepEqual(labels, ["ceiling", "door_1", "upper_wall", "window_1"]);
  const win = m.elements.find(e => e.label === "window_1").mask;
  assert.ok(share(win, 390, 290, 610, 510) > 0.98, "the view through the window is protected with the glass");
  assert.equal(m.quality.verifiable, true, m.quality.reasons.join(", "));
});

test("furniture in the original becomes occluders and editable, never architecture", () => {
  const m = buildMasks(roomClassMap(), nameOf);
  assert.ok(share(m.occluders, 430, 600, 790, 790) > 0.98, "bed is an occluder");
  assert.ok(share(m.editable, 430, 600, 790, 790) > 0.98, "bed area is editable");
  for (const el of m.elements) assert.ok(share(el.mask, 440, 600, 780, 780) < 0.02, `${el.label} must not cover the bed`);
});

test("the door is protected only where it is visible (the bed in front is not door)", () => {
  const m = buildMasks(roomClassMap(), nameOf);
  const door = m.elements.find(e => e.label === "door_1").mask;
  assert.ok(share(door, 725, 340, 835, 500) > 0.98);
  assert.ok(share(door, 740, 560, 790, 630) < 0.1, "pixels of the bed covering the door are excluded");
});

test("method C inpaint mask keeps a margin from windows and doors", () => {
  const m = buildMasks(roomClassMap(), nameOf);
  assert.equal(share(m.inpaint, 380, 280, 620, 520), 0, "no inpainting on the window");
  assert.ok(share(m.inpaint, 600, 700, 700, 760) > 0.9, "the floor and furniture area is inpaintable");
  // margin: just outside the window frame must not be inpainted
  assert.ok(share(m.inpaint, 360, 300, 372, 500) < 0.2);
});

test("several windows are separate instances, ordered left to right; tiny detections are dropped", () => {
  const m = buildMasks(roomClassMap({ window2: true, noise: true }), nameOf);
  const wins = m.elements.filter(e => e.type === "window");
  assert.equal(wins.length, 2);
  assert.ok(wins[0].bbox[0] < wins[1].bbox[0]);
});

test("quality gate: no visible floor → unverifiable", () => {
  const m = buildMasks(roomClassMap({ noFloor: true }), nameOf);
  assert.equal(m.quality.verifiable, false);
  assert.ok(m.quality.reasons.some(r => r.includes("floor")));
});

test("masks survive encoding for transport unchanged", () => {
  const m = buildMasks(roomClassMap(), nameOf);
  const back = decodeMasks(JSON.parse(JSON.stringify(encodeMasks(m))));
  assert.deepEqual(Array.from(back.inpaint.data), Array.from(m.inpaint.data));
  assert.deepEqual(back.elements.map(e => e.label), m.elements.map(e => e.label));
  assert.throws(() => decodeMasks({ ...encodeMasks(m), inpaint: { w: 10, h: 10, rle: "AAAA" } }), /invalid mask/);
});

// ---- end-to-end: segmentation masks drive the validator ----

const sharp = require("sharp");
const { validatePreservation } = require("../api/_lib/preservation");

function svgRoom(o = {}) { // same drawing as preservation.test.js, reduced to what this test needs
  const win = o.window === false ? "" : `<rect x="380" y="280" width="240" height="240" fill="#a9c8e6"/>
    <rect x="400" y="430" width="40" height="90" fill="#4a5a6a"/><rect x="450" y="390" width="50" height="130" fill="#3d4d5d"/>
    <rect x="380" y="280" width="240" height="240" fill="none" stroke="#f4f1ea" stroke-width="14"/>
    <line x1="500" y1="280" x2="500" y2="520" stroke="#f4f1ea" stroke-width="10"/><line x1="380" y1="400" x2="620" y2="400" stroke="#f4f1ea" stroke-width="10"/>`;
  const door = `<rect x="720" y="330" width="120" height="310" fill="#8a6a4a" stroke="#5a4030" stroke-width="8"/>
    <rect x="738" y="350" width="84" height="120" fill="none" stroke="#6a4c34" stroke-width="5"/>`;
  const furn = o.redesign
    ? `<rect x="230" y="590" width="460" height="150" rx="40" fill="#5b6b5a"/><rect x="180" y="700" width="560" height="170" fill="#c9b8a6"/><circle cx="1040" cy="760" r="70" fill="#2f2f2f"/>`
    : `<rect x="420" y="520" width="380" height="280" fill="#d9d2c5"/><rect x="330" y="640" width="70" height="90" fill="#6b5745"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <polygon points="0,0 1200,0 900,220 300,220" fill="#f2efe9"/><polygon points="0,0 300,220 300,640 0,900" fill="#d8d0c4"/>
    <polygon points="1200,0 900,220 900,640 1200,900" fill="#d3cabd"/><rect x="300" y="220" width="600" height="420" fill="#e4ddd1"/>
    <polygon points="0,900 300,640 900,640 1200,900" fill="#a07c58"/>${win}${door}${furn}</svg>`);
}
const jpg = (o) => sharp(svgRoom(o)).jpeg({ quality: 88 }).toBuffer();

test("end-to-end: masks from segmentation → architecture preserved for a redesign, window removal caught", async () => {
  const m = buildMasks(roomClassMap(), nameOf);
  const opts = { editableMask: m.editable, occluders: m.occluders };
  const orig = await jpg({});
  const good = await validatePreservation(orig, await jpg({ redesign: true }), m.elements, opts);
  assert.equal(good.preservation.passed, true, good.reasons.join("; ") + JSON.stringify(good.elements));
  // The "did the interior change" share depends on how large the editable area is. With full
  // segmentation masks it includes all lower walls and floor, so the 20% minimum (set on
  // rectangle masks) needs recalibrating on real results; it is not asserted here.
  const bad = await validatePreservation(orig, await jpg({ redesign: true, window: false }), m.elements, opts);
  assert.equal(bad.preservation.passed, false);
  assert.ok(bad.preservation.failures.some(f => f.element === "window_1"), bad.reasons.join("; "));
});

test("segmentation: segments with base64 masks and ADE20K labels become a class map; unknown labels stay unknown", async () => {
  const sharp = require("sharp");
  const seg = require("../api/_lib/segmentation");
  const W = 40, H = 30;
  const half = async (top) => { const px = Buffer.alloc(W * H, 0); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (top ? y < H / 2 : y >= H / 2) px[y * W + x] = 255;
    return (await sharp(px, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer()).toString("base64"); };
  const out = [{ label: "wall", mask: await half(true), score: null },
               { label: "floor", mask: "data:image/png;base64," + await half(false), score: null },
               { label: "spaceship", mask: await half(false) }];
  const cfg = seg.config({});
  const r = await seg.parseOutput(out, async () => { throw new Error("no fetch expected"); }, cfg, W / H);
  assert.equal(r.kind, "segments"); assert.deepEqual(r.unmatched, ["spaceship"]);
  const cm = r.classMap;
  assert.equal(cm.data[0], 0, "top = wall (ADE20K id 0)");
  assert.equal(cm.data[cm.data.length - 1], 3, "bottom = floor (ADE20K id 3)");
  assert.equal(seg.labelIndex("windowpane, window"), 8);
});
