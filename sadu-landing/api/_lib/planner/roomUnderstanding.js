// sadu Planning Engine — A. Room Understanding Engine.
// Turns the vision model's raw observations into a checked, structured description of the room and
// separates what is confirmed, what is estimated and what is unknown. Nothing is invented: a field the
// model did not give stays unknown.
const { WALLS, CERTAINTY, SIZE_CLASSES, SIZE_DEFAULTS_M, clamp01, pick, text, span, width } = require("./schema");

const FURNITURE = ["bed", "desk", "chair", "sofa", "wardrobe", "shelf", "tv", "tv_unit", "dresser", "table", "plant", "other"];
const FIXED = new Set(["bed", "wardrobe", "dresser"]); // treated as not movable unless the customer says so

function certaintyOf(v, fallback = "estimated") { return pick(v, CERTAINTY, fallback); }

function opening(o) {
  const s = span(o);
  if (!s || !WALLS.includes(o.wall)) return null;
  return { wall: o.wall, ...s, y0: clamp01(o.y0), y1: clamp01(o.y1), certainty: certaintyOf(o.certainty, "confirmed") };
}

/** Subtract spans from a span; returns the free pieces wider than 3% of the image. */
function subtract(base, cuts) {
  let pieces = [base];
  for (const c of cuts) {
    const next = [];
    for (const p of pieces) {
      if (c.x1 <= p.x0 || c.x0 >= p.x1) { next.push(p); continue; }
      if (c.x0 > p.x0) next.push({ x0: p.x0, x1: c.x0 });
      if (c.x1 < p.x1) next.push({ x0: c.x1, x1: p.x1 });
    }
    pieces = next;
  }
  return pieces.filter(p => width(p) > 0.03).map(p => ({ x0: +p.x0.toFixed(3), x1: +p.x1.toFixed(3) }));
}

/**
 * @param {object} raw  observations from the vision model (see perceive.js for the schema it is asked for)
 * @param {{keepWords?: string[]}} ctx  things the customer wants to keep (from the intent engine)
 */
function understandRoom(raw = {}, ctx = {}) {
  const confirmed = [], estimated = [], unknowns = [];
  const note = (c, s) => (c === "confirmed" ? confirmed : c === "unknown" ? unknowns : estimated).push(s);

  const windows = (Array.isArray(raw.windows) ? raw.windows : []).map(opening).filter(Boolean).slice(0, 6);
  const doors = (Array.isArray(raw.doors) ? raw.doors : []).map(opening).filter(Boolean).slice(0, 4);
  const outlets = (Array.isArray(raw.outlets) ? raw.outlets : [])
    .map(o => (WALLS.includes(o.wall) && clamp01(o.x) != null ? { wall: o.wall, x: clamp01(o.x), y: clamp01(o.y), certainty: certaintyOf(o.certainty) } : null))
    .filter(Boolean).slice(0, 8);
  const keepWords = (ctx.keepWords || []).map(s => String(s).toLowerCase());
  const furniture = (Array.isArray(raw.furniture) ? raw.furniture : []).map(f => {
    const s = span(f);
    if (!s || !WALLS.includes(f.wall)) return null;
    const type = pick(f.type, FURNITURE, "other");
    const keep = keepWords.some(w => w && (type.includes(w) || w.includes(type)));
    return { type, wall: f.wall, ...s, movable: !FIXED.has(type), keep, certainty: certaintyOf(f.certainty, "confirmed") };
  }).filter(Boolean).slice(0, 12);

  const walls = WALLS.map(id => {
    const w = (Array.isArray(raw.walls) ? raw.walls : []).find(x => x && x.id === id) || {};
    const extent = span({ x0: w.x_from, x1: w.x_to });
    const visible = !!extent && w.visible !== false;
    if (!visible) { unknowns.push(`${id} wall: not visible in the photo`); return { id, visible: false, extent: null, free: [], certainty: "unknown" }; }
    // free = visible extent minus doors (with room for the door to swing) and furniture that stays
    const cuts = [
      ...doors.filter(d => d.wall === id).map(d => ({ x0: d.x0 - width(d) * 0.5, x1: d.x1 + width(d) * 0.5 })),
      ...furniture.filter(f => f.wall === id && (!f.movable || f.keep)).map(f => ({ x0: f.x0, x1: f.x1 }))
    ];
    let free = subtract(extent, cuts);
    const hint = span({ x0: w.free_from, x1: w.free_to });
    if (hint) free = free.map(p => ({ x0: Math.max(p.x0, hint.x0), x1: Math.min(p.x1, hint.x1) })).filter(p => width(p) > 0.03);
    const c = certaintyOf(w.certainty, "estimated");
    note(c, `${id} wall visible from x=${extent.x0.toFixed(2)} to ${extent.x1.toFixed(2)}`);
    return { id, visible: true, extent, free, certainty: c };
  });

  for (const w of windows) note(w.certainty, `window on the ${w.wall} wall (x ${w.x0.toFixed(2)}-${w.x1.toFixed(2)})`);
  for (const d of doors) note(d.certainty, `door on the ${d.wall} wall (x ${d.x0.toFixed(2)}-${d.x1.toFixed(2)})`);
  if (!windows.length) unknowns.push("windows: none visible (there may be one outside the photo)");
  if (!doors.length) unknowns.push("doors: none visible (the entrance may be behind the camera)");
  for (const o of outlets) note(o.certainty, `power outlet on the ${o.wall} wall`);
  if (!outlets.length) unknowns.push("power outlets: none visible");
  for (const f of furniture) note(f.certainty, `existing ${f.type} on the ${f.wall} wall${f.keep ? " (customer keeps it)" : f.movable ? "" : " (fixed)"}`);

  // size: a class is always estimated; metres only if the model gave them with a reason
  const sz = raw.size || {};
  const cls = pick(sz.class, SIZE_CLASSES, "medium");
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 1.5 && n <= 12 ? +n.toFixed(1) : null; };
  const size = { class: cls, width_m: num(sz.width_m), depth_m: num(sz.depth_m), basis: text(sz.basis, 160) || null,
    certainty: num(sz.width_m) && text(sz.basis) ? "estimated" : "unknown" };
  estimated.push(`room size: ${cls}${size.width_m ? `, about ${size.width_m} m wide` : ""}${size.basis ? ` (based on ${size.basis})` : ""}`);
  if (size.certainty === "unknown") unknowns.push("exact room dimensions: not measurable from one photo; typical values for the size class are used");

  const cam = raw.camera || {};
  const camera = { view: pick(cam.view, ["frontal", "corner", "angled"], "frontal"), height: pick(cam.height, ["eye", "high", "low"], "eye"), certainty: certaintyOf(cam.certainty, "estimated") };
  note(camera.certainty, `camera: ${camera.view} view at ${camera.height} height`);

  const lt = raw.light || {};
  const light = { natural: pick(lt.natural, ["none", "low", "medium", "high"], "medium"), window_side: pick(lt.window_side, [...WALLS, "none"], windows[0] ? windows[0].wall : "none"),
    artificial: (Array.isArray(lt.artificial) ? lt.artificial : []).map(s => text(s, 60)).filter(Boolean).slice(0, 6) };
  estimated.push(`natural light: ${light.natural}${light.window_side !== "none" ? ` from the ${light.window_side}` : ""}`);

  const obstacles = (Array.isArray(raw.obstacles) ? raw.obstacles : []).map(o => {
    const s = span(o); return s && WALLS.includes(o.wall) ? { what: text(o.what, 60) || "obstacle", wall: o.wall, ...s } : null;
  }).filter(Boolean).slice(0, 6);
  for (const o of obstacles) estimated.push(`obstacle: ${o.what} by the ${o.wall} wall`);

  const surfaces = { floor: text(raw.surfaces && raw.surfaces.floor, 140), walls: text(raw.surfaces && raw.surfaces.walls, 140), ceiling: text(raw.surfaces && raw.surfaces.ceiling, 140) };
  for (const [k, v] of Object.entries(surfaces)) v ? confirmed.push(`${k}: ${v}`) : unknowns.push(`${k} finish: not described`);

  const dims = SIZE_DEFAULTS_M[cls];
  return {
    walls, windows, doors, outlets, furniture, obstacles, light, camera, size, surfaces,
    // real-world lengths used for fit checks: given estimate, else the typical value for the class
    scale: { width_m: size.width_m || dims.width, depth_m: size.depth_m || dims.depth, from: size.width_m ? "model estimate" : `typical ${cls} room` },
    confirmed, estimated, unknowns
  };
}

module.exports = { understandRoom, subtract, FURNITURE };
