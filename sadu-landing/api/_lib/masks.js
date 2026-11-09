// sadu — build preservation masks from a semantic segmentation class map.
//
// Input : a per-pixel class map { w, h, data } plus a function id → class name.
// Output: the masks the preservation engine and the generators need:
//   elements   protected architecture, one entry per instance (window_1, door_1, ceiling, upper_wall, column_1...)
//   occluders  movable objects in the ORIGINAL photo (never treated as architecture, never restored)
//   editable   where the redesign may happen (floor, lower walls, movable objects)
//   inpaint    editable minus a safety margin around protected architecture (method C mask)
//   floor      floor pixels (for the output-side second opinion)
//   quality    a gate: if the room layout is not clearly visible, results are "unverifiable"

const { roleOf } = require("./ade20k");

const MIN_COMPONENT = 0.002;   // drop instances smaller than 0.2% of the image
const UPPER_WALL_SHARE = 0.35; // top 35% of each wall column is protected ("upper wall")
const OPENING_GROW = 2;        // px at map resolution: include window/door frames
const INPAINT_MARGIN = 3;      // px kept away from protected architecture in method C

function blank(w, h) { return new Uint8Array(w * h); }

function dilate(mask, w, h, r) {
  if (r <= 0) return mask.slice();
  let cur = mask;
  for (let k = 0; k < r; k++) {
    const out = cur.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (cur[y * w + x]) continue;
      if ((x > 0 && cur[y * w + x - 1]) || (x < w - 1 && cur[y * w + x + 1]) ||
          (y > 0 && cur[(y - 1) * w + x]) || (y < h - 1 && cur[(y + 1) * w + x])) out[y * w + x] = 1;
    }
    cur = out;
  }
  return cur;
}

/** 4-connected components of a binary mask, largest-first info. */
function components(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i] !== -1) continue;
    const id = comps.length;
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    stack.push(i); label[i] = id;
    while (stack.length) {
      const p = stack.pop(); const x = p % w, y = (p / w) | 0;
      area++; sx += x; sy += y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      const nb = [];
      if (x > 0) nb.push(p - 1); if (x < w - 1) nb.push(p + 1); if (y > 0) nb.push(p - w); if (y < h - 1) nb.push(p + w);
      for (const q of nb) if (mask[q] && label[q] === -1) { label[q] = id; stack.push(q); }
    }
    comps.push({ id, area, cx: sx / area, cy: sy / area, bbox: [x0, y0, x1, y1] });
  }
  return { label, comps };
}

function componentMask(label, id) { const m = new Uint8Array(label.length); for (let i = 0; i < label.length; i++) if (label[i] === id) m[i] = 1; return m; }

/**
 * @param {{w:number,h:number,data:ArrayLike<number>}} classMap
 * @param {(id:number)=>string} nameOf
 */
function buildMasks(classMap, nameOf) {
  const { w, h, data } = classMap;
  const N = w * h;
  const role = {};
  const byRole = { wall: blank(w, h), ceiling: blank(w, h), floor: blank(w, h), window: blank(w, h), door: blank(w, h),
    column: blank(w, h), stairs: blank(w, h), builtin: blank(w, h), view: blank(w, h), movable: blank(w, h) };
  const hist = new Map();
  for (let i = 0; i < N; i++) {
    const id = data[i];
    let r = role[id];
    if (r === undefined) { const name = nameOf(id); r = role[id] = name ? roleOf(name) : "movable"; }
    byRole[r][i] = 1;
    hist.set(id, (hist.get(id) || 0) + 1);
  }
  const minArea = Math.max(4, Math.round(N * MIN_COMPONENT));
  const elements = [];

  // windows: glass + what is seen through it
  const win = new Uint8Array(N); for (let i = 0; i < N; i++) win[i] = byRole.window[i] || byRole.view[i];
  const addInstances = (mask, type, grow) => {
    const { label, comps } = components(mask, w, h);
    comps.filter(c => c.area >= minArea).sort((a, b) => a.cx - b.cx).forEach((c, k) => {
      elements.push({ type, label: `${type}_${k + 1}`, mask: { w, h, data: dilate(componentMask(label, c.id), w, h, grow) },
        area: +(c.area / N).toFixed(4), bbox: c.bbox });
    });
  };
  addInstances(win, "window", OPENING_GROW);
  addInstances(byRole.door, "door", OPENING_GROW);
  addInstances(byRole.column, "column", 0);
  addInstances(byRole.stairs, "builtin", 0);
  addInstances(byRole.builtin, "builtin", 0);

  let ceilArea = 0; for (let i = 0; i < N; i++) ceilArea += byRole.ceiling[i];
  if (ceilArea >= minArea) elements.push({ type: "ceiling", label: "ceiling", mask: { w, h, data: byRole.ceiling.slice() }, area: +(ceilArea / N).toFixed(4) });

  // upper wall: per image column, the top share of the wall run
  const upper = blank(w, h);
  for (let x = 0; x < w; x++) {
    let top = -1, bot = -1;
    for (let y = 0; y < h; y++) if (byRole.wall[y * w + x]) { if (top < 0) top = y; bot = y; }
    if (top < 0) continue;
    const limit = top + UPPER_WALL_SHARE * (bot - top);
    for (let y = top; y <= limit; y++) if (byRole.wall[y * w + x]) upper[y * w + x] = 1;
  }
  let upArea = 0; for (let i = 0; i < N; i++) upArea += upper[i];
  if (upArea >= minArea) elements.push({ type: "wall", label: "upper_wall", mask: { w, h, data: upper }, area: +(upArea / N).toFixed(4) });

  // protected union, occluders, editable, inpaint
  const prot = blank(w, h);
  for (const el of elements) for (let i = 0; i < N; i++) if (el.mask.data[i]) prot[i] = 1;
  const occluders = dilate(byRole.movable, w, h, 1);
  const editable = blank(w, h); for (let i = 0; i < N; i++) editable[i] = prot[i] ? 0 : 1;
  const guard = dilate(prot, w, h, INPAINT_MARGIN);
  const inpaint = blank(w, h); for (let i = 0; i < N; i++) inpaint[i] = editable[i] && !guard[i] ? 1 : 0;

  // quality gate
  const share = (m) => { let s = 0; for (let i = 0; i < N; i++) s += m[i]; return s / N; };
  const q = { wall: share(byRole.wall), floor: share(byRole.floor), ceiling: share(byRole.ceiling),
    window: share(byRole.window), door: share(byRole.door), movable: share(byRole.movable) };
  const reasons = [];
  if (q.wall < 0.05) reasons.push("too little wall visible");
  if (q.floor < 0.03) reasons.push("floor not visible");
  if (elements.length === 0) reasons.push("no protected architecture found");
  const quality = { verifiable: reasons.length === 0, reasons, shares: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, +v.toFixed(3)])) };

  const topClasses = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([id, n]) => ({ id, name: nameOf(id) || `#${id}`, role: role[id], share: +(n / N).toFixed(3) }));

  return {
    elements: elements.map(({ type, label, mask, area, bbox }) => ({ type, label, mask, area, bbox })),
    occluders: { w, h, data: occluders },
    editable: { w, h, data: editable },
    inpaint: { w, h, data: inpaint },
    floor: { w, h, data: byRole.floor.slice() },
    quality, topClasses
  };
}

// ---- compact transport (masks travel between the evaluation page and the API) ----

function encodeMask(m) {
  // run-length encoding of 0/1 runs, starting with a 0-run; base64 of uint32 lengths
  const runs = []; let cur = 0, n = 0;
  for (let i = 0; i < m.data.length; i++) { const v = m.data[i] ? 1 : 0; if (v === cur) n++; else { runs.push(n); cur = v; n = 1; } }
  runs.push(n);
  return { w: m.w, h: m.h, rle: Buffer.from(new Uint32Array(runs).buffer).toString("base64") };
}

function decodeMask(e) {
  if (!e || !Number.isInteger(e.w) || !Number.isInteger(e.h) || e.w <= 0 || e.h <= 0 || e.w * e.h > 4e6 || typeof e.rle !== "string")
    throw new Error("invalid mask");
  const buf = Buffer.from(e.rle, "base64");
  if (buf.length % 4) throw new Error("invalid mask");
  const runs = new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  const data = new Uint8Array(e.w * e.h); let p = 0, v = 0;
  for (const r of runs) { if (p + r > data.length) throw new Error("invalid mask"); if (v) data.fill(1, p, p + r); p += r; v ^= 1; }
  if (p !== data.length) throw new Error("invalid mask");
  return { w: e.w, h: e.h, data };
}

function encodeMasks(ms) {
  return {
    elements: ms.elements.map(e => ({ type: e.type, label: e.label, area: e.area, mask: encodeMask(e.mask) })),
    occluders: encodeMask(ms.occluders), editable: encodeMask(ms.editable), inpaint: encodeMask(ms.inpaint),
    floor: encodeMask(ms.floor), quality: ms.quality, topClasses: ms.topClasses
  };
}

function decodeMasks(e) {
  return {
    elements: (e.elements || []).map(x => ({ type: String(x.type), label: String(x.label), mask: decodeMask(x.mask) })),
    occluders: decodeMask(e.occluders), editable: decodeMask(e.editable), inpaint: decodeMask(e.inpaint),
    floor: e.floor ? decodeMask(e.floor) : null, quality: e.quality
  };
}

module.exports = { buildMasks, encodeMask, decodeMask, encodeMasks, decodeMasks, components, dilate };
