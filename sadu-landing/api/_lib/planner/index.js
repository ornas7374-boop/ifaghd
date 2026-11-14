// sadu Planning Engine — the orchestrator ("the brain of sadu").
// Think -> Analyze -> Plan -> Validate (-> re-plan) -> Select products -> Render instructions.
// The vision model only OBSERVES (one call, perceive.js). Every decision, position, budget split and
// check is made here in code, so it is fast, testable and explainable.
const crypto = require("crypto");
const { understandRoom } = require("./roomUnderstanding");
const { understandIntent } = require("./intent");
const { decide } = require("./decisions");
const { planSpace } = require("./spatial");
const { allocateBudget } = require("./budget");
const { matchProducts } = require("./products");
const { validatePlan } = require("./validate");
const { renderInstructions } = require("./render");
const { STYLES, SPACES } = require("../setup");

const VERSION = "planner-1";
const MAX_ATTEMPTS = 4;
const PLACEMENT_ERRORS = new Set(["no_desk_position", "blocks_door", "window_behind_monitor", "no_clearance"]);

/** Sign the render instruction so the design endpoint only draws plans made by this server. */
function sign(instr, secret) {
  return crypto.createHmac("sha256", String(secret || "")).update(JSON.stringify({ p: instr.prompt, r: instr.edit_region })).digest("hex");
}
function verify(instr, secret) {
  if (!instr || typeof instr.prompt !== "string" || typeof instr.signature !== "string" || !secret) return false;
  const a = Buffer.from(sign(instr, secret)), b = Buffer.from(instr.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * @param {object} input
 *   observations  raw observations from perceive.js (room)
 *   aiIntent      raw intent reading from perceive.js
 *   brief         the form: {description, budget_sar, changes}
 *   suggested     {space, style, why} from perceive.js
 *   catalog       verified products (optional)
 *   amazonTag     affiliate tag (optional)
 *   secret        server-only secret used to sign the render instruction
 */
function planDesign(input = {}) {
  const intent = understandIntent(input.brief || {}, input.aiIntent || {});
  const room = understandRoom(input.observations || {}, { keepWords: intent.keep });
  const sug = input.suggested || {};
  const decisions = decide(room, intent, { suggestedStyle: sug.style, styles: STYLES });

  // plan -> validate -> re-plan with a concrete fix, at most MAX_ATTEMPTS times
  const attempts = [];
  const excludeWalls = [];
  let deskSpec = decisions.desk ? { ...decisions.desk } : { width_cm: 120, depth_cm: 60 };
  let spatial, budget, validation;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    spatial = planSpace(room, intent, decisions, { excludeWalls, deskSpec });
    budget = allocateBudget(decisions.items, intent.budget_sar, intent.use);
    validation = validatePlan({ room, intent, decisions, spatial, budget });
    attempts.push({ attempt: i + 1, desk_wall: spatial.best ? spatial.best.wall : null, desk_cm: spatial.best ? spatial.best.desk_cm : null, errors: validation.errors.map(e => e.code) });
    if (validation.passed) break;
    const codes = validation.errors.map(e => e.code);
    let fixed = false;
    if (codes.some(c => PLACEMENT_ERRORS.has(c)) && spatial.best) { excludeWalls.push(spatial.best.wall); fixed = true; attempts[i].fix = `try another wall than ${spatial.best.wall}`; }
    else if (codes.includes("no_desk_position") && deskSpec.width_cm > 100) { deskSpec = { ...deskSpec, width_cm: Math.max(100, deskSpec.width_cm - 20), depth_cm: 60 }; fixed = true; attempts[i].fix = `smaller desk (${deskSpec.width_cm} cm)`; }
    if (codes.includes("covers_opening")) {
      const keys = validation.errors.filter(e => e.code === "covers_opening").map(e => e.key);
      const removable = keys.filter(k => (decisions.items.find(it => it.key === k) || {}).priority !== "essential");
      if (removable.length) { decisions.items = decisions.items.filter(it => !removable.includes(it.key)); fixed = true; attempts[i].fix = `${attempts[i].fix ? attempts[i].fix + "; " : ""}left out ${removable.join(", ")} (would cover a window or door)`; }
      else if (spatial.best && !excludeWalls.includes(spatial.best.wall)) { excludeWalls.push(spatial.best.wall); fixed = true; attempts[i].fix = `try another wall than ${spatial.best.wall}`; }
    }
    if (codes.includes("items_collide")) {
      const e = validation.errors.find(x => x.code === "items_collide");
      const drop = (e.key || []).find(k => (decisions.items.find(it => it.key === k) || {}).priority !== "essential");
      if (drop) { decisions.items = decisions.items.filter(it => it.key !== drop); fixed = true; attempts[i].fix = `${attempts[i].fix ? attempts[i].fix + "; " : ""}left out ${drop} (overlapped another wall item)`; }
    }
    if (codes.includes("colour_missing")) { decisions.palette.accents = intent.accents.slice(0, 2); fixed = true; attempts[i].fix = "palette set to the requested colours"; }
    if (!fixed) break; // nothing left to change (e.g. budget too small for a desk): report honestly
  }

  const products = matchProducts(decisions.items, budget, decisions.palette, spatial.placement, { catalog: input.catalog, amazonTag: input.amazonTag });
  const best = spatial.best;
  const plan = {
    version: VERSION,
    room_analysis: {
      space: SPACES[sug.space] ? sug.space : "setup_corner", style: decisions.style, why: sug.why || "",
      size: room.size, scale: room.scale, camera: room.camera, surfaces: room.surfaces, light: room.light,
      walls: room.walls, windows: room.windows, doors: room.doors, outlets: room.outlets, furniture: room.furniture, obstacles: room.obstacles
    },
    user_requirements: { use: intent.use, accents: intent.accents, avoid: intent.avoid, devices: intent.devices, owned: intent.owned, minimal: intent.minimal,
      keep: intent.keep, changes: intent.changes, allow_wall: intent.allow_wall, budget_sar: intent.budget_sar, request: intent.request_text, request_en: intent.request_en, conflicts: intent.conflicts },
    confirmed_observations: room.confirmed, estimated_observations: room.estimated, unknowns: room.unknowns,
    spatial_plan: best ? {
      desk: { wall: best.wall, x0: best.desk.x0, x1: best.desk.x1, width_cm: best.desk_cm, depth_cm: best.depth_cm, reasons: best.reasons, warnings: best.warnings },
      clearance: { needed_m: best.need_m, available_m: best.depth_m, basis: room.scale.from },
      candidates: spatial.candidates.map(c => ({ wall: c.wall, score: c.score, blockers: c.blockers, warnings: c.warnings })),
      attempts
    } : { desk: null, candidates: spatial.candidates.map(c => ({ wall: c.wall, score: c.score, blockers: c.blockers, warnings: c.warnings })), attempts },
    furniture_placement: spatial.placement,
    lighting_plan: decisions.lighting,
    color_palette: decisions.palette,
    product_requirements: products.requirements,
    budget_allocation: budget,
    design_rationale: [...decisions.rationale, ...(best ? best.reasons.map(r => ({ decision: `desk on the ${best.wall} wall`, why: r })) : [])],
    validation_results: validation,
    rendering_instructions: null,
    notes: { products: products.note, prices: budget.note, measurements: `positions are relative to the photo; lengths in metres are estimates (${room.scale.from})` }
  };
  Object.defineProperty(plan, "_internal", { value: { room, intent, decisions, spatial }, enumerable: false });
  if (validation.passed) {
    const instr = renderInstructions(plan);
    plan.rendering_instructions = { ...instr, signature: input.secret ? sign(instr, input.secret) : null };
  }
  return plan;
}

module.exports = { planDesign, sign, verify, VERSION };
