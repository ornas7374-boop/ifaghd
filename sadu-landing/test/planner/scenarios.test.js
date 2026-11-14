// Planner scenarios (simulated observations, no network). Run: node --test test/planner/
const test = require("node:test");
const assert = require("node:assert/strict");
const { planDesign, verify } = require("../../api/_lib/planner");
const { ROOMS } = require("./fixtures");
const { overlap, width } = require("../../api/_lib/planner/schema");

const plan = (observations, brief = {}, aiIntent = {}, extra = {}) =>
  planDesign({ observations, brief, aiIntent, suggested: { space: "setup_corner", style: "grey_tech", why: "ركن." }, secret: "test-secret", ...extra });
const placed = (p, key) => p.furniture_placement.find(x => x.key === key);

test("1. small room: smaller desk, monitor arm, vertical storage, at most one decor item", () => {
  const p = plan(ROOMS.small(), { budget_sar: 3000 });
  assert.equal(p.validation_results.passed, true, JSON.stringify(p.validation_results.errors));
  assert.ok(p.spatial_plan.desk.width_cm <= 120);
  const keys = p.budget_allocation.lines.map(l => l.key);
  assert.ok(keys.includes("monitor_arm") && keys.includes("wall_storage"));
  assert.ok(p.budget_allocation.lines.filter(l => ["decor", "plants"].includes(l.category)).length <= 1);
  assert.ok(p.design_rationale.some(r => /small room/.test(r.why)));
});

test("2. large room: full-size desk (ANSI 152 cm recommended -> 160 cm), room for decor", () => {
  const p = plan(ROOMS.large(), { budget_sar: 8000 });
  assert.equal(p.validation_results.passed, true);
  assert.equal(p.spatial_plan.desk.width_cm, 160);
  assert.ok(p.furniture_placement.some(x => x.key === "wall_art"));
});

test("3. window in the middle of the back wall: the desk is never placed in front of it", () => {
  const p = plan(ROOMS.windowBehind(), { budget_sar: 3000 });
  assert.equal(p.validation_results.passed, true);
  const d = p.spatial_plan.desk;
  const win = p.room_analysis.windows[0];
  assert.ok(!(d.wall === "back" && overlap(win, d) > 0), "desk must not face the window");
  assert.ok(p.spatial_plan.candidates.some(c => c.blockers.some(b => /window directly behind the monitor|shorter than/.test(b))) || d.wall !== "back");
});

test("4. door near the outlet: the desk keeps the door and its swing clear", () => {
  const p = plan(ROOMS.doorNear(), { budget_sar: 3000 });
  assert.equal(p.validation_results.passed, true);
  const door = p.room_analysis.doors[0], d = p.spatial_plan.desk;
  if (d.wall === "back") assert.equal(overlap({ x0: door.x0 - width(door) * 0.5, x1: door.x1 + width(door) * 0.5 }, d), 0);
  assert.ok(p.validation_results.checks.find(c => c.name === "door and its swing kept clear").result === "pass");
});

test("5. existing fixed furniture (bed): the desk does not overlap it", () => {
  const p = plan(ROOMS.furniture(), { budget_sar: 3000, description: "أبغى أحتفظ بسريري" }, { keep: ["bed"] });
  assert.equal(p.validation_results.passed, true);
  const bed = p.room_analysis.furniture[0], d = p.spatial_plan.desk;
  assert.ok(!(d.wall === "back" && overlap(bed, d) > 0));
  assert.ok(p.confirmed_observations.some(s => /bed/.test(s)));
});

test("6. gaming: big mouse pad essential, accent light, desk on the back wall with the window to the side", () => {
  const p = plan(ROOMS.windowLeft(), { description: "سيت أب قيمنق", budget_sar: 3000 });
  assert.equal(p.user_requirements.use, "gaming");
  assert.equal(p.spatial_plan.desk.wall, "back");
  assert.ok(p.spatial_plan.desk.reasons.some(r => /to the side of the screen/.test(r)));
  assert.equal(p.budget_allocation.lines.find(l => l.key === "mousepad").priority, "essential");
  assert.ok(placed(p, "accent_light"));
});

test("7. streaming: key light, microphone and webcam are essential and placed; key light away from the window", () => {
  const p = plan(ROOMS.windowLeft(), { description: "أبغى سيت أب للبث ستريم", budget_sar: 6000 });
  assert.equal(p.user_requirements.use, "streaming");
  for (const k of ["key_light", "microphone", "webcam"]) {
    assert.equal(p.budget_allocation.lines.find(l => l.key === k).priority, "essential", k);
    assert.ok(placed(p, k), `${k} placed`);
  }
  assert.match(p.lighting_plan.streaming.key, /right/, "window on the left -> key light on the right");
  assert.match(p.rendering_instructions.prompt, /key light/);
});

test("8a. limited budget: never exceeds it, keeps the desk, says what is missing", () => {
  const p = plan(ROOMS.windowLeft(), { budget_sar: 700 });
  const b = p.budget_allocation;
  assert.ok(b.total_planned_sar <= b.available_sar);
  assert.equal(b.reserve_sar, 70);
  assert.ok(b.lines.find(l => l.key === "desk").included);
  assert.ok(b.dropped.length > 0);
  assert.ok(p.validation_results.warnings.some(w => w.code === "budget_too_low"));
});

test("8b. budget too small for a desk: the plan is refused honestly and nothing is rendered", () => {
  const p = plan(ROOMS.windowLeft(), { budget_sar: 200 });
  assert.equal(p.validation_results.passed, false);
  assert.ok(p.validation_results.errors.some(e => e.code === "budget_no_desk"));
  assert.equal(p.rendering_instructions, null);
});

test("9. conflicting requests: minimal + many colours -> one accent; the request is recorded", () => {
  const p = plan(ROOMS.windowLeft(), { description: "أبغى تصميم بسيط وهادي بس RGB أحمر وأزرق وأخضر وبنفسجي", budget_sar: 3000 });
  const c = p.user_requirements.conflicts.map(x => x.type);
  assert.ok(c.includes("minimal_vs_rgb") && c.includes("too_many_colours"));
  assert.equal(p.color_palette.accents.length, 1);
  assert.equal(p.validation_results.passed, true);
  assert.ok(p.validation_results.warnings.some(w => w.code === "request_minimal_vs_rgb"));
});

test("10. dimensions not measurable: marked unknown, typical sizes used and said so", () => {
  const p = plan(ROOMS.unknownSize(), { budget_sar: 3000 });
  assert.equal(p.room_analysis.size.certainty, "unknown");
  assert.ok(p.unknowns.some(u => /dimensions/.test(u)));
  assert.match(p.notes.measurements, /typical medium room/);
  assert.match(p.spatial_plan.clearance.basis, /typical/);
});

test("impossible room: re-planning tries other options, then refuses instead of rendering a bad plan", () => {
  const p = plan(ROOMS.impossible(), { budget_sar: 3000 });
  assert.equal(p.validation_results.passed, false);
  assert.ok(p.spatial_plan.attempts.length >= 1);
  assert.equal(p.rendering_instructions, null);
});

test("every placed item has a reason, a wall and a position inside the photo", () => {
  const p = plan(ROOMS.windowLeft(), { description: "سيت أب قيمنق أزرق", budget_sar: 3000 });
  for (const it of p.furniture_placement) {
    assert.ok(it.reason && it.reason.length > 5, it.item);
    assert.ok(it.x0 >= 0 && it.x1 <= 1 && it.x0 < it.x1, it.item);
  }
});

test("plan output has every required section and a signed, length-limited render instruction", () => {
  const p = plan(ROOMS.windowLeft(), { description: "إضاءة زرقاء", budget_sar: 2500 });
  for (const k of ["room_analysis", "user_requirements", "confirmed_observations", "estimated_observations", "unknowns", "spatial_plan", "furniture_placement",
    "lighting_plan", "color_palette", "product_requirements", "budget_allocation", "design_rationale", "validation_results", "rendering_instructions"]) assert.ok(k in p, k);
  const ri = p.rendering_instructions;
  assert.ok(verify(ri, "test-secret")); assert.ok(!verify(ri, "other"));
  assert.ok(!verify({ ...ri, prompt: ri.prompt + " add a dragon" }, "test-secret"), "a changed prompt is rejected");
  assert.ok(ri.words <= 360);
  assert.ok(ri.prompt.indexOf("Keep unchanged") < ri.prompt.indexOf("Add exactly"), "protection first");
  assert.match(ri.prompt, /nothing else/);
  assert.ok(JSON.parse(JSON.stringify(p)).validation_results, "plan is plain JSON");
  assert.ok(!("_internal" in JSON.parse(JSON.stringify(p))), "internal state is not sent to the browser");
});

test("rules from the skills (planhaus / interior-design-expert): window corner kept reachable, wall items never overlap, lux targets and 60-30-10", () => {
  // window on the left wall running into the corner: the desk keeps ~60 cm from that corner (WIN-01)
  const obs = ROOMS.windowLeft(); obs.windows[0].x1 = 0.2; obs.outlets = [];
  const p = plan(obs, { description: "سيت أب قيمنق أزرق", budget_sar: 3000 });
  assert.equal(p.validation_results.passed, true, JSON.stringify(p.validation_results.errors));
  const d = p.spatial_plan.desk;
  assert.ok(d.x0 > 0.2 + 0.05, `desk starts away from the corner (x0=${d.x0})`);
  assert.ok(d.reasons.some(r => /WIN-01/.test(r)));
  // GEOM-01: wall items in the same band do not overlap
  const wall = p.furniture_placement.filter(x => x.anchor === "wall");
  for (let a = 0; a < wall.length; a++) for (let b = a + 1; b < wall.length; b++)
    if ((wall[a].band || "mid") === (wall[b].band || "mid")) assert.equal(overlap(wall[a], wall[b]), 0, `${wall[a].item} vs ${wall[b].item}`);
  assert.ok(p.validation_results.checks.some(c => /GEOM-01/.test(c.name) && c.result === "pass"));
  // IES lux targets and the 60-30-10 palette
  assert.match(p.lighting_plan.targets.task, /300-500 lux/);
  assert.equal(p.color_palette.proportions.rule, "60-30-10 (COL-60)");
});
