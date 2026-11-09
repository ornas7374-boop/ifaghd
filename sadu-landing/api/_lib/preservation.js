// sadu — Architectural preservation validator
//
// Compares the ORIGINAL room photo with a GENERATED design and decides whether the
// architecture (walls, ceiling, windows, doors, columns, camera framing) is preserved,
// and whether the interior design actually changed.
//
// Design choices:
// - Structure, not pixels: per-window zero-normalised cross-correlation (ZNCC) and edge
//   agreement. A global relight (e.g. the dark "night luxury" style) is NOT an
//   architectural change and must not fail the check.
// - Partial occlusion is allowed per element type (curtains over a window, a pendant
//   light hanging from the ceiling), via per-type "preserved fraction" thresholds.
// - Camera framing is checked first by searching for the best scale + shift between the
//   two images. A zoomed, cropped or shifted result fails before anything else.
//
// Masks are { w, h, data: Uint8Array(0|1) } in normalised geometry; they are resampled to
// the analysis grid, so any resolution works (segmentation output, rectangles, ...).

const sharp = require("sharp");

const ANALYSIS_W = 256; // grid for per-element checks
const ALIGN_W = 128;    // grid for the framing search

// Fraction of an element's analysis windows that must be preserved.
// Calibrated on synthetic cases in test/preservation.test.js; recalibrate on real results.
const TYPE_THRESHOLDS = {
  ceiling: 0.80,     // pendants / chandeliers may occlude part of it
  wall: 0.75,        // upper walls only; art, shelves and mirrors may cover some
  window: 0.60,      // curtains may cover the sides
  door: 0.70,
  column: 0.80,
  beam: 0.80,
  builtin: 0.75,
  default: 0.75
};

const FRAMING = { maxScaleDev: 0.02, maxShiftFrac: 0.015, maxAspectDev: 0.01 };
const WIN = 8, STEP = 4;          // analysis window size / stride on the 256 grid
const ZNCC_OK = 0.55;             // a textured window is "preserved" above this
const FLAT_STD = 0.025;           // a window flatter than this has no structure to compare
const FLAT_TOL = 0.06;            // pixel distance from the window median that still counts as "flat"
const FLAT_SHARE_OK = 0.75;       // share of pixels that must stay flat (thin rods/cords allowed)
const CHANGE_FRACTION_MIN = 0.20; // editable windows that must change for a "real redesign"

// ---------- image helpers ----------

async function toGray(buf, width, height) {
  const { data, info } = await img(buf).rotate().resize(width, height, { fit: "fill" })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(info.width * info.height);
  for (let i = 0; i < out.length; i++) out[i] = data[i] / 255;
  return { w: info.width, h: info.height, data: out };
}

async function meta(buf) {
  const m = await img(buf).metadata();
  // EXIF orientations 5–8 swap width/height after rotate()
  const swap = m.orientation && m.orientation >= 5;
  return { width: swap ? m.height : m.width, height: swap ? m.width : m.height };
}

function resampleMask(mask, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(mask.h - 1, Math.floor((y + 0.5) * mask.h / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(mask.w - 1, Math.floor((x + 0.5) * mask.w / w));
      out[y * w + x] = mask.data[sy * mask.w + sx] ? 1 : 0;
    }
  }
  return out;
}

/** Rectangle mask in normalised coords [x0,y0,x1,y1] (0..1). Handy for tests and manual maps. */
function rectMask(rects, w = 256, h = 256) {
  const data = new Uint8Array(w * h);
  for (const [x0, y0, x1, y1] of rects) {
    for (let y = Math.floor(y0 * h); y < Math.ceil(y1 * h); y++)
      for (let x = Math.floor(x0 * w); x < Math.ceil(x1 * w); x++)
        if (x >= 0 && y >= 0 && x < w && y < h) data[y * w + x] = 1;
  }
  return { w, h, data };
}

function sobel(img) {
  const { w, h, data } = img;
  const mag = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = -data[i - w - 1] - 2 * data[i - 1] - data[i + w - 1] + data[i - w + 1] + 2 * data[i + 1] + data[i + w + 1];
    const gy = -data[i - w - 1] - 2 * data[i - w] - data[i - w + 1] + data[i + w - 1] + 2 * data[i + w] + data[i + w + 1];
    mag[i] = Math.sqrt(gx * gx + gy * gy);
  }
  return { w, h, data: mag };
}

// ---------- framing (camera) check ----------

function sampleNearest(img, x, y) {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= img.w || yi >= img.h) return null;
  return img.data[yi * img.w + xi];
}

/** Search scale/shift that best maps original edges onto generated edges. */
function findFraming(origEdges, genEdges, weight, { translationOnly = false } = {}) {
  const { w, h } = origEdges;
  const cx = w / 2, cy = h / 2;
  const pts = [];
  for (let y = 2; y < h - 2; y += 1) for (let x = 2; x < w - 2; x += 1) {
    const i = y * w + x;
    if (weight[i] && origEdges.data[i] > 0.05) pts.push([x, y, origEdges.data[i]]);
  }
  if (pts.length < 30) return { scale: 1, dx: 0, dy: 0, score: 0, identityScore: 0, lowStructure: true };

  const score = (s, dx, dy) => {
    let sxy = 0, sxx = 0, syy = 0, n = 0;
    for (const [x, y, v] of pts) {
      const g = sampleNearest(genEdges, cx + s * (x - cx) + dx, cy + s * (y - cy) + dy);
      if (g === null) continue;
      sxy += v * g; sxx += v * v; syy += g * g; n++;
    }
    if (n < pts.length * 0.6 || !syy) return 0;
    return sxy / Math.sqrt(sxx * syy);
  };

  const maxShift = Math.round(w * 0.1);
  const identityScore = score(1, 0, 0);
  let best = { scale: 1, dx: 0, dy: 0, score: identityScore };
  // coarse
  // ±15% zoom covers what image models realistically do; beyond that it is a different photo anyway
  for (let s = translationOnly ? 1 : 0.85; s <= (translationOnly ? 1 : 1.1801); s += 0.02)
    for (let dy = -maxShift; dy <= maxShift; dy += 2)
      for (let dx = -maxShift; dx <= maxShift; dx += 2) {
        const v = score(s, dx, dy);
        if (v > best.score) best = { scale: s, dx, dy, score: v };
      }
  // fine around the coarse optimum
  const c = { ...best };
  for (let s = translationOnly ? 1 : c.scale - 0.02; s <= (translationOnly ? 1 : c.scale + 0.0201); s += 0.005)
    for (let dy = c.dy - 2; dy <= c.dy + 2; dy += 0.5)
      for (let dx = c.dx - 2; dx <= c.dx + 2; dx += 0.5) {
        const v = score(s, dx, dy);
        if (v > best.score) best = { scale: s, dx, dy, score: v };
      }
  best.identityScore = identityScore;
  return best;
}

// ---------- per-element structure check ----------

function windowStats(img, x0, y0) {
  let s = 0, s2 = 0;
  for (let y = y0; y < y0 + WIN; y++) for (let x = x0; x < x0 + WIN; x++) {
    const v = img.data[y * img.w + x]; s += v; s2 += v * v;
  }
  const n = WIN * WIN, m = s / n;
  return { mean: m, std: Math.sqrt(Math.max(0, s2 / n - m * m)) };
}

function zncc(a, b, x0, y0, sa, sb) {
  let acc = 0;
  for (let y = y0; y < y0 + WIN; y++) for (let x = x0; x < x0 + WIN; x++) {
    const i = y * a.w + x;
    acc += (a.data[i] - sa.mean) * (b.data[i] - sb.mean);
  }
  return acc / (WIN * WIN * sa.std * sb.std);
}

/** Windows whose area is mostly inside the mask. */
function maskWindows(mask, w, h, minCover = 0.6) {
  const out = [];
  for (let y = 0; y + WIN <= h; y += STEP) for (let x = 0; x + WIN <= w; x += STEP) {
    let c = 0;
    for (let yy = y; yy < y + WIN; yy++) for (let xx = x; xx < x + WIN; xx++) c += mask[yy * w + xx];
    if (c / (WIN * WIN) >= minCover) out.push([x, y]);
  }
  return out;
}

function flatShare(img, x0, y0) {
  const vals = [];
  for (let y = y0; y < y0 + WIN; y++) for (let x = x0; x < x0 + WIN; x++) vals.push(img.data[y * img.w + x]);
  vals.sort((a, b) => a - b);
  const med = vals[vals.length >> 1];
  let near = 0;
  for (const v of vals) if (Math.abs(v - med) <= FLAT_TOL) near++;
  return near / vals.length;
}

function windowPreserved(orig, gen, x, y) {
  const so = windowStats(orig, x, y), sg = windowStats(gen, x, y);
  if (so.std < FLAT_STD) {
    // Flat in the original (plain ceiling / wall): preserved if it is still MOSTLY flat.
    // Thin additions (a curtain rod, a pendant cord) cover a small share of the window and
    // are allowed; a new coffer, beam or opening covers much more.
    return flatShare(gen, x, y) >= FLAT_SHARE_OK;
  }
  if (sg.std < 1e-4) return false;
  return zncc(orig, gen, x, y, so, sg) >= ZNCC_OK;
}

// ---------- transform-aware helpers ----------

/** Is the original window at (x,y) found intact in the generated image under transform tf (analysis grid)? */
function windowPreservedAt(orig, gen, x0, y0, tf) {
  const cx = orig.w / 2, cy = orig.h / 2;
  const vals = new Float32Array(WIN * WIN);
  let k = 0;
  for (let y = y0; y < y0 + WIN; y++) for (let x = x0; x < x0 + WIN; x++) {
    const v = sampleNearest(gen, cx + tf.scale * (x - cx) + tf.dx, cy + tf.scale * (y - cy) + tf.dy);
    if (v === null) return false;
    vals[k++] = v;
  }
  const shifted = { w: WIN, h: WIN, data: vals };
  const so = windowStats(orig, x0, y0), sg = windowStats(shifted, 0, 0);
  if (so.std < FLAT_STD) return flatShare(shifted, 0, 0) >= FLAT_SHARE_OK;
  if (sg.std < 1e-4) return false;
  let acc = 0; k = 0;
  for (let y = y0; y < y0 + WIN; y++) for (let x = x0; x < x0 + WIN; x++) acc += (orig.data[y * orig.w + x] - so.mean) * (vals[k++] - sg.mean);
  return acc / (WIN * WIN * so.std * sg.std) >= ZNCC_OK;
}

/** Median brightness of the generated image in a ring just outside an element (its surrounding wall). */
function ringMedian(gen, mask, w, h, ring = 6) {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < x0) return null;
  const vals = [];
  for (let y = Math.max(0, y0 - ring); y <= Math.min(h - 1, y1 + ring); y++)
    for (let x = Math.max(0, x0 - ring); x <= Math.min(w - 1, x1 + ring); x++) {
      const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (!inside) vals.push(gen.data[y * w + x]);
    }
  if (!vals.length) return null;
  vals.sort((a, b) => a - b);
  return vals[vals.length >> 1];
}

function windowMean(img, x0, y0) { return windowStats(img, x0, y0).mean; }

// ---------- input safety ----------

const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_INPUT_PIXELS = 40e6;            // ~40 MP; rejects decompression bombs

function img(buf) {
  if (!Buffer.isBuffer(buf)) throw new TypeError("image must be a Buffer");
  if (buf.length === 0 || buf.length > MAX_INPUT_BYTES) throw new RangeError(`image size ${buf.length} bytes is outside the allowed range`);
  return sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
}

// ---------- public API ----------

const OPENINGS = new Set(["window", "door"]);
const PLAIN_SHARE_REMOVED = 0.6;  // lost windows that turned into plain wall → the opening was removed
const MOVED_MIN_SCORE = 0.6;      // edge agreement needed before an element may count as "found elsewhere"
const WALL_LIKE_TOL = 0.08;       // brightness distance to the surrounding wall for "turned into wall"

function andNot(a, b) { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] && !b[i] ? 1 : 0; return out; }
function frameShift(fr, w) { return Math.hypot(fr.dx, fr.dy) / w; }
function prefersOtherFraming(fr, w) {
  if (fr.lowStructure) return false;
  const identityGood = fr.identityScore >= fr.score - 0.02;
  const outside = Math.abs(fr.scale - 1) > FRAMING.maxScaleDev || frameShift(fr, w) > FRAMING.maxShiftFrac;
  return !identityGood && outside;
}

/**
 * Compare an ORIGINAL room photo with a GENERATED redesign.
 *
 * @param {Buffer} originalBuf
 * @param {Buffer} generatedBuf
 * @param {{type:string,label?:string,mask:{w,h,data}}[]} elements  protected architecture of the original
 * @param {object} [opts]
 * @param {{w,h,data}} [opts.editableMask]  where a redesign is expected (default: everything not protected)
 * @param {{w,h,data}} [opts.occluders]     movable objects in the ORIGINAL (furniture, curtains...). Their pixels
 *                                           are not architecture: excluded from element checks, counted as editable.
 *
 * Returns two independent verdicts:
 *  - preservation: was the architecture (framing, walls, ceiling, windows, doors) kept?
 *  - design:       basic design checks this engine can see (did the interior change? is an opening blocked?).
 *                  Full design-quality review (function, relevance, realism) is a separate later stage.
 */
async function validatePreservation(originalBuf, generatedBuf, elements = [], opts = {}) {
  if (opts && opts.w && opts.data) opts = { editableMask: opts }; // backwards compatible 4th arg
  const { editableMask = null, occluders = null } = opts || {};

  const om = await meta(originalBuf), gm = await meta(generatedBuf);
  const aspectO = om.width / om.height, aspectG = gm.width / gm.height;
  const preservation = { passed: true, failures: [] };
  const design = { passed: true, scope: "basic", issues: [] };
  const result = { preservation, design, accepted: false, framing: null, elements: [], change: null,
    sizes: { original: om, generated: gm } };
  const finish = () => {
    preservation.passed = preservation.failures.length === 0;
    design.passed = design.issues.length === 0;
    result.accepted = preservation.passed && design.passed;
    // flat fields kept for callers of the first version
    result.pass = preservation.passed;
    result.changed = !design.issues.some(i => i.code === "no_real_redesign") && !!result.change;
    result.reasons = [...preservation.failures, ...design.issues].map(x => `${x.element ? x.element + "_" : ""}${x.code}: ${x.detail}`);
    return result;
  };

  if (Math.abs(aspectG / aspectO - 1) > FRAMING.maxAspectDev) {
    preservation.failures.push({ code: "aspect_changed", detail: `${aspectO.toFixed(3)} → ${aspectG.toFixed(3)}` });
    return finish();
  }

  const H = Math.round(ANALYSIS_W / aspectO), AH = Math.round(ALIGN_W / aspectO);
  const [o, g, oa, ga] = await Promise.all([
    toGray(originalBuf, ANALYSIS_W, H), toGray(generatedBuf, ANALYSIS_W, H),
    toGray(originalBuf, ALIGN_W, AH), toGray(generatedBuf, ALIGN_W, AH)
  ]);
  const occA = occluders ? resampleMask(occluders, ALIGN_W, AH) : new Uint8Array(ALIGN_W * AH);
  const occ = occluders ? resampleMask(occluders, ANALYSIS_W, H) : new Uint8Array(ANALYSIS_W * H);
  const eo = sobel(oa), eg = sobel(ga);

  // architecture-only masks (original furniture in front of an element is not architecture)
  const els = elements.map(el => ({
    ...el, label: el.label || el.type,
    mA: andNot(resampleMask(el.mask, ALIGN_W, AH), occA),
    m: andNot(resampleMask(el.mask, ANALYSIS_W, H), occ)
  }));
  const protA = new Uint8Array(ALIGN_W * AH), prot = new Uint8Array(ANALYSIS_W * H);
  for (const el of els) { for (let i = 0; i < protA.length; i++) protA[i] |= el.mA[i]; for (let i = 0; i < prot.length; i++) prot[i] |= el.m[i]; }

  // 1) camera framing — consensus of the elements, so one removed/moved element cannot
  //    masquerade as a camera change
  const global = findFraming(eo, eg, els.length ? protA : new Uint8Array(ALIGN_W * AH).fill(1));
  // Decide the camera question with PRESERVATION, not edge agreement: under which transform
  // (identity or the global best) are the elements actually found intact?
  const k = ANALYSIS_W / ALIGN_W;
  const preservedFrac = (el, tf) => {
    const wins = maskWindows(el.m, ANALYSIS_W, H);
    if (!wins.length) return 1;
    let ok = 0;
    for (const [x, y] of wins) if (tf ? windowPreservedAt(o, g, x, y, tf) : windowPreserved(o, g, x, y)) ok++;
    return ok / wins.length;
  };
  let framingChanged = false, votesT = 0, votesI = 0;
  if (prefersOtherFraming(global, ALIGN_W)) {
    const T = { scale: global.scale, dx: global.dx * k, dy: global.dy * k };
    for (const el of els) {
      // plain elements (bare ceiling, a thin wall band) look the same under any small
      // transform, so they cannot tell the two framings apart: they do not vote
      let edgePts = 0;
      for (let i = 0; i < el.mA.length; i++) if (el.mA[i] && eo.data[i] > 0.05) edgePts++;
      if (edgePts < 30) continue;
      const thr = TYPE_THRESHOLDS[el.type] ?? TYPE_THRESHOLDS.default;
      const okI = preservedFrac(el, null) >= thr, okT = preservedFrac(el, T) >= thr;
      if (okT && !okI) votesT++; else if (okI && !okT) votesI++;
    }
    framingChanged = (votesT + votesI === 0)
      ? true                           // no element can discriminate: trust the global search
      : votesT >= 1 && votesT > votesI;
  }
  // a single element can be "moved" along its wall: same scale, translated, found intact there
  const movedElsewhere = (el) => {
    const fr = findFraming(eo, eg, el.mA, { translationOnly: true });
    if (!prefersOtherFraming(fr, ALIGN_W) || fr.score < MOVED_MIN_SCORE) return false;
    const thr = TYPE_THRESHOLDS[el.type] ?? TYPE_THRESHOLDS.default;
    return preservedFrac(el, { scale: 1, dx: fr.dx * k, dy: fr.dy * k }) >= thr;
  };
  result.framing = { ok: !framingChanged, scale: +global.scale.toFixed(3), shiftPct: +(frameShift(global, ALIGN_W) * 100).toFixed(2),
    bestScore: +global.score.toFixed(3), identityScore: +(global.identityScore || 0).toFixed(3),
    votes: { newFraming: votesT, original: votesI } };
  if (framingChanged) {
    preservation.failures.push({ code: "camera_framing_changed",
      detail: `scale ${global.scale.toFixed(3)}, shift ${(frameShift(global, ALIGN_W) * 100).toFixed(1)}%` });
  }

  // 2) each protected element: preserved / moved / removed / changed / occluded
  for (const el of els) {
    const wins = maskWindows(el.m, ANALYSIS_W, H);
    const thr = TYPE_THRESHOLDS[el.type] ?? TYPE_THRESHOLDS.default;
    const wall = OPENINGS.has(el.type) ? ringMedian(g, el.m, ANALYSIS_W, H) : null;
    let kept = 0, lostWallLike = 0, lost = 0;
    for (const [x, y] of wins) {
      if (windowPreserved(o, g, x, y)) kept++;
      else {
        lost++;
        // "turned into wall": plain AND the same brightness as the wall around the opening
        if (wall !== null && flatShare(g, x, y) >= FLAT_SHARE_OK && Math.abs(windowMean(g, x, y) - wall) <= WALL_LIKE_TOL) lostWallLike++;
      }
    }
    const frac = wins.length ? kept / wins.length : 1;
    let status = "preserved";
    if (frac < thr) {
      if (framingChanged) status = "unverifiable_after_reframing";
      else if (movedElsewhere(el)) status = "moved";
      else if (OPENINGS.has(el.type)) status = lostWallLike / Math.max(1, lost) >= PLAIN_SHARE_REMOVED ? "removed" : "occluded";
      else status = "changed";
    }
    result.elements.push({ type: el.type, label: el.label, status, preserved: +frac.toFixed(3), threshold: thr, windows: wins.length });
    const detail = `${(frac * 100).toFixed(0)}% preserved < ${thr * 100}%`;
    if (status === "moved" || status === "removed" || status === "changed")
      preservation.failures.push({ code: `element_${status}`, element: el.label, detail });
    else if (status === "occluded")
      design.issues.push({ code: el.type === "door" ? "door_blocked" : "window_blocked", element: el.label,
        detail: `${detail}; covered by new content (the opening itself is not removed)` });
  }

  // 3) did the interior actually change? (protected architecture never counts)
  const editable = editableMask ? resampleMask(editableMask, ANALYSIS_W, H) : new Uint8Array(ANALYSIS_W * H).fill(1);
  for (let i = 0; i < editable.length; i++) { if (occ[i]) editable[i] = 1; if (prot[i]) editable[i] = 0; }
  const ewins = maskWindows(editable, ANALYSIS_W, H);
  let changedWins = 0;
  for (const [x, y] of ewins) if (!windowPreserved(o, g, x, y)) changedWins++;
  const changeFrac = ewins.length ? changedWins / ewins.length : 0;
  result.change = { fraction: +changeFrac.toFixed(3), minimum: CHANGE_FRACTION_MIN, windows: ewins.length };
  if (changeFrac < CHANGE_FRACTION_MIN)
    design.issues.push({ code: "no_real_redesign", detail: `only ${(changeFrac * 100).toFixed(0)}% of the editable area changed` });
  else result.change.ok = true;

  return finish();
}

/**
 * Method B: paste the protected ARCHITECTURE from the original back onto the generated image,
 * with a feathered edge. Pixels of movable objects in the original (opts.occluders) are never
 * restored, so old furniture cannot reappear. Only call it when validatePreservation().framing.ok.
 */
async function compositeProtected(originalBuf, generatedBuf, protectedMask, opts = {}) {
  if (typeof opts === "number") opts = { featherPx: opts }; // backwards compatible
  const { featherPx = 6, occluders = null, occluderMarginPx = 4 } = opts;
  const { width, height } = await meta(originalBuf);
  const [orig, gen] = await Promise.all([
    img(originalBuf).rotate().removeAlpha().raw().toBuffer(),
    img(generatedBuf).rotate().resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer()
  ]);
  const m = resampleMask(protectedMask, width, height);
  if (occluders) {
    // grow the occluder mask a little so furniture edges never leak back in
    const oc = resampleMask(occluders, width, height);
    const ocImg = Buffer.alloc(width * height);
    for (let i = 0; i < oc.length; i++) ocImg[i] = oc[i] ? 255 : 0;
    const { data: grown } = await sharp(ocImg, { raw: { width, height, channels: 1 } })
      .blur(Math.max(0.3, occluderMarginPx)).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < m.length; i++) if (grown[i] > 8) m[i] = 0;
  }
  const maskImg = Buffer.alloc(width * height);
  for (let i = 0; i < m.length; i++) maskImg[i] = m[i] ? 255 : 0;
  const { data: soft, info: si } = await sharp(maskImg, { raw: { width, height, channels: 1 } })
    .blur(Math.max(0.3, featherPx / 2)).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  if (si.channels !== 1 || soft.length !== width * height) throw new Error("composite mask has wrong shape");
  const out = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const a = soft[i] / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(orig[i * 3 + c] * a + gen[i * 3 + c] * (1 - a));
  }
  return sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

module.exports = { validatePreservation, compositeProtected, rectMask, TYPE_THRESHOLDS, FRAMING, CHANGE_FRACTION_MIN };
