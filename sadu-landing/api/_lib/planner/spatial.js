// sadu Planning Engine — C. Spatial Planning Engine.
// Decides WHERE things go. Every visible wall and every free stretch on it is a candidate for the desk;
// each is scored with the guide's rules (window to the side, never behind the screen or the user; no
// blocked door or swing; room behind the chair; near an outlet; not over fixed furniture), the best one
// wins and every other item is placed relative to it, each with its reason.
// Lengths in metres come from the room's scale (estimated); positions are normalised image x.
const { width, overlap, positionWords } = require("./schema");

const CHAIR_ZONE_M = 0.5;            // the chair itself
const BEHIND_CHAIR_M = [0.9, 1.07];  // guide: 90-107 cm behind the chair
const SIDE_MARGIN_M = 0.1;
const OPPOSITE = { left: "right", right: "left", back: null };
const ADJACENT = { back: ["left", "right"], left: ["back"], right: ["back"] };

function wallLength(room, id) { return id === "back" ? room.scale.width_m : room.scale.depth_m; }
function depthAvailable(room, id) { return id === "back" ? room.scale.depth_m : room.scale.width_m; }

function evaluateCandidate(room, intent, deskSpec, wall, seg) {
  const reasons = [], warnings = [], blockers = [];
  const wallImg = width(wall.extent), wallM = wallLength(room, wall.id);
  const imgPerM = wallImg / wallM;
  const segM = width(seg) / imgPerM;
  // desk width: the planned width, smaller if the free stretch is shorter (never below 100 cm)
  let deskCm = deskSpec.width_cm;
  for (const w of [deskSpec.width_cm, 140, 120, 100]) { if (w <= deskSpec.width_cm && w / 100 + 2 * SIDE_MARGIN_M <= segM) { deskCm = w; break; } deskCm = null; }
  if (!deskCm) return { wall: wall.id, seg, score: -999, blockers: [`free stretch ~${segM.toFixed(1)} m is shorter than the smallest desk (1.0 m + margins)`], reasons, warnings };
  if (deskCm < deskSpec.width_cm) warnings.push(`desk reduced to ${deskCm} cm to fit the free stretch (~${segM.toFixed(1)} m)`);
  if (deskCm < 117) warnings.push("desk narrower than the 117 cm minimum recommended (ANSI)");

  // place the desk in the stretch: by an outlet if there is one, else centred
  const deskImgW = (deskCm / 100) * imgPerM;
  const outlet = room.outlets.find(o => o.wall === wall.id && o.x >= seg.x0 && o.x <= seg.x1);
  let centre = outlet ? outlet.x : (seg.x0 + seg.x1) / 2;
  centre = Math.min(seg.x1 - deskImgW / 2, Math.max(seg.x0 + deskImgW / 2, centre));
  const desk = { x0: +(centre - deskImgW / 2).toFixed(3), x1: +(centre + deskImgW / 2).toFixed(3) };
  let score = 50;

  // windows
  for (const w of room.windows) {
    if (w.wall === wall.id && overlap(w, desk) > 0) { score -= 100; blockers.push("window directly behind the monitor: glare and a backlit face (guide: never in front of the window)"); }
    else if (w.wall === wall.id) { score -= 8; warnings.push("window on the same wall beside the desk: some side glare"); }
    else if (ADJACENT[wall.id].includes(w.wall)) { score += 20; reasons.push(`window on the ${w.wall} wall is to the side of the screen (guide: perpendicular to the window)`); }
    else if (OPPOSITE[wall.id] === w.wall) { score -= 15; warnings.push("window behind the user: reflections on the screen"); }
  }
  // doors: on the same wall (with swing) blocks; near the corner on an adjacent wall is a warning
  for (const d of room.doors) {
    const swing = width(d) * 0.5;
    if (d.wall === wall.id && overlap({ x0: d.x0 - swing, x1: d.x1 + swing }, desk) > 0) { score -= 100; blockers.push("desk would block the door or its swing"); }
    else if (ADJACENT[wall.id].includes(d.wall)) {
      const nearCorner = wall.id === "back" ? (d.wall === "left" ? desk.x0 - wall.extent.x0 < 0.15 : wall.extent.x1 - desk.x1 < 0.15) : true;
      if (nearCorner) { score -= 20; warnings.push(`door on the ${d.wall} wall close to the desk: keep the walkway clear`); }
    }
  }
  // fixed / kept furniture and obstacles
  for (const f of room.furniture.filter(f => f.wall === wall.id && overlap(f, desk) > 0)) {
    if (!f.movable || f.keep) { score -= 100; blockers.push(`would overlap the ${f.type} that ${f.keep ? "the customer keeps" : "is fixed"}`); }
    else if (intent.changes.includes("furniture") || intent.changes.includes("full_setup")) reasons.push(`replaces the existing ${f.type}`);
    else { score -= 100; blockers.push(`would overlap the existing ${f.type} and furniture changes were not allowed`); }
  }
  for (const o of room.obstacles.filter(o => o.wall === wall.id && overlap(o, desk) > 0)) { score -= 100; blockers.push(`blocked by ${o.what}`); }
  // clearance behind the chair
  const depthM = depthAvailable(room, wall.id), need = deskSpec.depth_cm / 100 + CHAIR_ZONE_M + BEHIND_CHAIR_M[0];
  const certain = room.size.certainty !== "unknown";
  if (depthM < need) { score -= certain ? 100 : 30; (certain ? blockers : warnings).push(`about ${depthM.toFixed(1)} m in front of this wall; the desk, chair and 90 cm behind it need ~${need.toFixed(1)} m`); }
  else reasons.push(`room to move: ~${depthM.toFixed(1)} m in front of the wall, ~${need.toFixed(1)} m needed${certain ? "" : " (estimated from the room size)"}`);
  if (outlet) { score += 10; reasons.push("power outlet on this wall behind the desk"); }
  if (wall.id === "back") { score += 5; reasons.push("back wall: the whole setup is visible from this camera angle"); }
  score += Math.min(10, (segM - deskCm / 100) * 5);
  return { wall: wall.id, seg, desk, desk_cm: deskCm, depth_cm: deskSpec.depth_cm, score: Math.round(score), reasons, warnings, blockers, need_m: +need.toFixed(2), depth_m: +depthM.toFixed(2) };
}

/** Place every decided item relative to the chosen desk. */
function placeItems(room, intent, decisions, best) {
  const out = [];
  const where = (s) => `${positionWords(s)} of the ${best.wall} wall`;
  const d = best.desk, w = d.x1 - d.x0;
  const free = room.walls.find(x => x.id === best.wall).extent;
  const roomLeft = d.x0 - free.x0, roomRight = free.x1 - d.x1;
  const sideWithSpace = roomRight >= roomLeft ? "right" : "left";
  const winSide = room.light.window_side;
  const awayFromWindow = winSide === "left" ? "right" : winSide === "right" ? "left" : sideWithSpace;
  const at = (s) => ({ x0: +Math.max(0, s.x0).toFixed(3), x1: +Math.min(1, s.x1).toFixed(3) });
  let key = null; // the decided item being placed (links placement, budget and products)
  const put = (item, anchor, s, reason) => out.push({ key, item, anchor, wall: best.wall, ...at(s), where: where(s), reason });
  for (const it of decisions.items) {
    key = it.key;
    switch (it.key) {
      case "desk": put("desk", "floor", d, `${best.desk_cm} x ${best.depth_cm} cm, against the ${best.wall} wall: ${best.reasons[0] || "best free stretch"}`); break;
      case "chair": put("chair", "floor", { x0: d.x0 + w * 0.3, x1: d.x1 - w * 0.3 }, "centred in front of the desk with room to push back"); break;
      case "monitor": put("main monitor", "desk", { x0: d.x0 + w * 0.3, x1: d.x1 - w * 0.3 }, "straight in front of the user, top at eye level (OSHA)"); break;
      case "second_monitor": put("second monitor", "desk", sideWithSpace === "right" ? { x0: d.x1 - w * 0.3, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.3 }, "to the side, angled 30-45 degrees, not stacked"); break;
      case "monitor_arm": put("monitor arm", "desk", { x0: d.x0 + w * 0.4, x1: d.x1 - w * 0.4 }, "clamped at the back edge to free desk depth"); break;
      case "keyboard": put("keyboard", "desk", { x0: d.x0 + w * 0.35, x1: d.x1 - w * 0.35 }, "centred, 30-40 cm from the edge (primary reach zone)"); break;
      case "mouse": put("mouse", "desk", { x0: d.x0 + w * 0.62, x1: d.x0 + w * 0.7 }, "right beside the keyboard, same level"); break;
      case "mousepad": put("desk mat", "desk", { x0: d.x0 + w * 0.2, x1: d.x1 - w * 0.2 }, "under keyboard and mouse"); break;
      case "monitor_light": put("monitor light bar", "desk", { x0: d.x0 + w * 0.32, x1: d.x1 - w * 0.32 }, "on top of the monitor: desk light without screen glare"); break;
      case "desk_lamp": put("desk lamp", "desk", awayFromWindow === "left" ? { x0: d.x0, x1: d.x0 + w * 0.12 } : { x0: d.x1 - w * 0.12, x1: d.x1 }, `at the ${awayFromWindow} edge, away from the window light`); break;
      case "accent_light": put("wall LED light bars", "wall", { x0: d.x0 + w * 0.05, x1: d.x1 - w * 0.05 }, "on the wall above the desk, outside the direct view"); break;
      case "key_light": put("key light", "floor", decisions.lighting.streaming && /right/.test(decisions.lighting.streaming.key) ? { x0: d.x1, x1: d.x1 + w * 0.12 } : { x0: d.x0 - w * 0.12, x1: d.x0 }, decisions.lighting.streaming ? decisions.lighting.streaming.key : "beside the desk"); break;
      case "microphone": put("microphone on boom arm", "desk", sideWithSpace === "right" ? { x0: d.x1 - w * 0.2, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.2 }, "boom arm clamped at the edge, mic close to the mouth"); break;
      case "webcam": put("webcam", "desk", { x0: d.x0 + w * 0.45, x1: d.x1 - w * 0.45 }, "on top of the main monitor, at eye level"); break;
      case "wall_storage": put("wall pegboard and shelf", "wall", sideWithSpace === "right" ? { x0: d.x1 - w * 0.35, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.35 }, "above the desk on the side with more space: vertical storage"); break;
      case "drawers": put("drawer unit", "floor", awayFromWindow === "left" ? { x0: d.x0, x1: d.x0 + w * 0.25 } : { x0: d.x1 - w * 0.25, x1: d.x1 }, "under the desk at one end, legs stay free"); break;
      case "plant": put("small plant", "desk", sideWithSpace === "right" ? { x0: d.x1 - w * 0.08, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.08 }, "at the edge of the desk (outer reach zone)"); break;
      case "wall_art": put("framed art print", "wall", sideWithSpace === "right" ? { x0: d.x1, x1: d.x1 + w * 0.25 } : { x0: d.x0 - w * 0.25, x1: d.x0 }, "beside the desk, outside the main view"); break;
      case "wall_treatment": put("wall treatment", "wall", { x0: d.x0 - w * 0.1, x1: d.x1 + w * 0.1 }, "only on the wall behind the desk (customer allowed)"); break;
      default: break;
    }
  }
  key = "own_device";
  if (intent.devices.includes("computer")) put("customer's PC tower", "floor", sideWithSpace === "right" ? { x0: d.x1 - w * 0.15, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.15 }, "beside the desk legs with open airflow, not in a closed cabinet");
  if (intent.devices.includes("console")) put("customer's console", "desk", sideWithSpace === "right" ? { x0: d.x1 - w * 0.12, x1: d.x1 } : { x0: d.x0, x1: d.x0 + w * 0.12 }, "standing at the desk end with space around its vents");
  return out;
}

/**
 * @returns {{ok: boolean, best: object|null, candidates: object[], placement: object[]}}
 * @param {{excludeWalls?: string[], deskSpec?: object}} opts  used by the re-planning loop
 */
function planSpace(room, intent, decisions, opts = {}) {
  const deskSpec = opts.deskSpec || decisions.desk || { width_cm: 120, depth_cm: 60 };
  const candidates = [];
  for (const wall of room.walls.filter(w => w.visible && !(opts.excludeWalls || []).includes(w.id)))
    for (const seg of wall.free) candidates.push(evaluateCandidate(room, intent, deskSpec, wall, seg));
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates.find(c => c.desk && !c.blockers.length) || null;
  return { ok: !!best, best, candidates: candidates.slice(0, 5), placement: best ? placeItems(room, intent, decisions, best) : [] };
}

module.exports = { planSpace, evaluateCandidate, BEHIND_CHAIR_M };
