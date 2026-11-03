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
  const { data, info } = await sharp(buf).rotate().resize(width, height, { fit: "fill" })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(info.width * info.height);
  for (let i = 0; i < out.length; i++) out[i] = data[i] / 255;
  return { w: info.width, h: info.height, data: out };
}

async function meta(buf) {
  const m = await sharp(buf).rotate().metadata();
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
function findFraming(origEdges, genEdges, weight) {
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
  for (let s = 0.90; s <= 1.1001; s += 0.02)
    for (let dy = -maxShift; dy <= maxShift; dy += 2)
      for (let dx = -maxShift; dx <= maxShift; dx += 2) {
        const v = score(s, dx, dy);
        if (v > best.score) best = { scale: s, dx, dy, score: v };
      }
  // fine around the coarse optimum
  const c = { ...best };
  for (let s = c.scale - 0.02; s <= c.scale + 0.0201; s += 0.005)
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

// ---------- public API ----------

/**
 * @param {Buffer} originalBuf
 * @param {Buffer} generatedBuf
 * @param {{type:string,label?:string,mask:{w,h,data}}[]} elements  protected architecture
 * @param {{w,h,data}} [editableMask]  where the redesign is expected (default: everything not protected)
 */
async function validatePreservation(originalBuf, generatedBuf, elements = [], editableMask = null) {
  const reasons = [];
  const om = await meta(originalBuf), gm = await meta(generatedBuf);
  const aspectO = om.width / om.height, aspectG = gm.width / gm.height;
  const aspectDev = Math.abs(aspectG / aspectO - 1);
  const result = { pass: false, changed: false, accepted: false, reasons, framing: null, elements: [], change: null,
    sizes: { original: om, generated: gm } };

  if (aspectDev > FRAMING.maxAspectDev) {
    reasons.push(`aspect_changed: ${aspectO.toFixed(3)} → ${aspectG.toFixed(3)}`);
    return result;
  }

  const H = Math.round(ANALYSIS_W / aspectO), AH = Math.round(ALIGN_W / aspectO);
  const [o, g, oa, ga] = await Promise.all([
    toGray(originalBuf, ANALYSIS_W, H), toGray(generatedBuf, ANALYSIS_W, H),
    toGray(originalBuf, ALIGN_W, AH), toGray(generatedBuf, ALIGN_W, AH)
  ]);

  // union of protected elements (framing is judged on architecture only)
  const protA = new Uint8Array(ALIGN_W * AH), prot = new Uint8Array(ANALYSIS_W * H);
  for (const el of elements) {
    const ma = resampleMask(el.mask, ALIGN_W, AH), m = resampleMask(el.mask, ANALYSIS_W, H);
    for (let i = 0; i < ma.length; i++) protA[i] |= ma[i];
    for (let i = 0; i < m.length; i++) prot[i] |= m[i];
  }
  const framingWeight = elements.length ? protA : new Uint8Array(ALIGN_W * AH).fill(1);

  // 1) camera framing
  const fr = findFraming(sobel(oa), sobel(ga), framingWeight);
  const shiftFrac = Math.hypot(fr.dx, fr.dy) / ALIGN_W;
  // Prefer identity when it is essentially as good as the best (noise in the optimum).
  const identityGood = fr.identityScore >= fr.score - 0.02;
  const framingOk = fr.lowStructure || identityGood ||
    (Math.abs(fr.scale - 1) <= FRAMING.maxScaleDev && shiftFrac <= FRAMING.maxShiftFrac);
  result.framing = { ok: framingOk, scale: +fr.scale.toFixed(3), shiftPct: +(shiftFrac * 100).toFixed(2),
    bestScore: +fr.score.toFixed(3), identityScore: +(fr.identityScore || 0).toFixed(3) };
  if (!framingOk) reasons.push(`camera_framing_changed: scale ${fr.scale.toFixed(3)}, shift ${(shiftFrac * 100).toFixed(1)}%`);

  // 2) each protected element
  let allElementsOk = true;
  for (const el of elements) {
    const m = resampleMask(el.mask, ANALYSIS_W, H);
    const wins = maskWindows(m, ANALYSIS_W, H);
    const thr = TYPE_THRESHOLDS[el.type] ?? TYPE_THRESHOLDS.default;
    let kept = 0;
    for (const [x, y] of wins) if (windowPreserved(o, g, x, y)) kept++;
    const frac = wins.length ? kept / wins.length : 1;
    const ok = frac >= thr;
    result.elements.push({ type: el.type, label: el.label || el.type, preserved: +frac.toFixed(3), threshold: thr, ok, windows: wins.length });
    if (!ok) { allElementsOk = false; reasons.push(`${el.label || el.type}_changed: ${(frac * 100).toFixed(0)}% preserved < ${thr * 100}%`); }
  }

  // 3) did the interior actually change?
  let editable;
  // Protected architecture never counts towards "how much was redesigned".
  editable = editableMask ? resampleMask(editableMask, ANALYSIS_W, H) : new Uint8Array(ANALYSIS_W * H).fill(1);
  for (let i = 0; i < editable.length; i++) if (prot[i]) editable[i] = 0;
  const ewins = maskWindows(editable, ANALYSIS_W, H);
  let changedWins = 0;
  for (const [x, y] of ewins) if (!windowPreserved(o, g, x, y)) changedWins++;
  const changeFrac = ewins.length ? changedWins / ewins.length : 0;
  result.change = { fraction: +changeFrac.toFixed(3), minimum: CHANGE_FRACTION_MIN, windows: ewins.length };

  result.pass = framingOk && allElementsOk;
  result.changed = changeFrac >= CHANGE_FRACTION_MIN;
  if (result.pass && !result.changed) reasons.push(`no_real_redesign: only ${(changeFrac * 100).toFixed(0)}% of the editable area changed`);
  result.accepted = result.pass && result.changed;
  return result;
}

/**
 * Method B: paste the protected architecture from the original back onto the generated
 * image with a feathered edge. Only valid when validatePreservation().framing.ok is true.
 */
async function compositeProtected(originalBuf, generatedBuf, protectedMask, featherPx = 6) {
  const { width, height } = await meta(originalBuf);
  const [orig, gen] = await Promise.all([
    sharp(originalBuf).rotate().removeAlpha().raw().toBuffer(),
    sharp(generatedBuf).rotate().resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer()
  ]);
  const m = resampleMask(protectedMask, width, height);
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
