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
  assert.ok(ri.prompt.indexOf("Keep all architecture unchanged") < ri.prompt.indexOf("Place "), "structure lock first");
  assert.match(ri.prompt, /^Redesign the interior of this exact room in /);
  assert.match(ri.prompt, /Keep the exact same camera angle, perspective, framing and lens\./);
  assert.match(ri.prompt, /Do not add, remove or move any door, window, wall, column or opening\./);
  assert.match(ri.prompt, /Remove clutter \(bottles, bags, trash\)\./);
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

test("owner's reference setups shape the look: details per style, the Sadu touch on request, never extra items", () => {
  const blue = plan(ROOMS.windowLeft(), { description: "سيت أب أبيض وأزرق", budget_sar: 3000 });
  assert.equal(blue.color_palette.accents[0], "blue");
  assert.deepEqual(blue.inspiration.reference_images, [58, 59, 60]);
  assert.match(blue.rendering_instructions.prompt, /wave pattern desk pad lying on the desktop/);
  assert.match(blue.rendering_instructions.prompt, /white and royal blue gaming setup style/);
  // every detail belongs to an item that is in the plan (examples never add items)
  const planned = new Set(blue.furniture_placement.map(p => p.key));
  const used = Object.keys(blue.inspiration.item_details).filter(k => planned.has(k));
  assert.ok(used.length >= 3);
  // the Sadu touch only when asked
  const sadu = plan(ROOMS.windowLeft(), { description: "أبغى سيت أب فيه لمسة سدو", budget_sar: 3000 });
  assert.equal(sadu.inspiration.sadu_touch, true);
  assert.match(sadu.rendering_instructions.prompt, /Sadu-pattern/);
  assert.equal(blue.inspiration.sadu_touch, false);
  assert.ok(blue.rendering_instructions.words <= 360);
});

test("every setup reference image (51-76) is used by some style or the Sadu touch", () => {
  const { STYLE_EXAMPLES, SADU_TOUCH } = require("../../api/_lib/planner/examples");
  const used = new Set([...Object.values(STYLE_EXAMPLES).flatMap(x => x.refs), ...SADU_TOUCH.refs]);
  for (const n of [51, 52, 54, 55, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]) assert.ok(used.has(n), `image ${n}`);
});

test("template is filled from Gemini's structured room analysis: door, window, ceiling lights, floor, existing furniture", () => {
  const obs = { ...ROOMS.doorNear(), door_position: "right wall, near the front corner, white wooden door", window_position: "back wall, centre, with beige curtains",
    existing_furniture: ["grey sofa against the back wall"], ceiling_lights: "two recessed spots", floor_type: "large light grey porcelain tiles", room_type: "bedroom" };
  const p = plan(obs, { budget_sar: 3000 });
  const t = p.rendering_instructions.prompt;
  assert.equal(p.room_analysis.structure.room_type, "bedroom");
  assert.match(t, /the door \(right wall, near the front corner, white wooden door\)/);
  assert.match(t, /the window and curtains area \(back wall, centre, with beige curtains\)/);
  assert.match(t, /ceiling lights positions \(two recessed spots\)/);
  assert.match(t, /floor tiles \(large light grey porcelain tiles\)/);
  assert.match(t, /Replace the existing grey sofa against the back wall with .*placed in the same zones\./);
  assert.match(t, /No rugs or carpets on the floor\./);
  // without Gemini's words, the door/window positions come from the checked observations (never generic)
  const q = plan(ROOMS.doorNear(), { budget_sar: 3000 });
  assert.match(q.rendering_instructions.prompt, /the door \(on the back wall, right side\)/);
});

test("Pinterest recipe styles: each one plans and renders with its style line, keeps the structure lock, never a rug, and lists its pieces", () => {
  const { RECIPES } = require("../../api/_lib/setupRecipes");
  const { STYLES } = require("../../api/_lib/setup");
  assert.equal(Object.keys(RECIPES).length, 5);
  for (const key of Object.keys(RECIPES)) {
    assert.ok(STYLES[key] && STYLES[key].ar && STYLES[key].hint && STYLES[key].fragment, key);
    assert.ok(!/\brug\b|carpet/i.test(STYLES[key].fragment), `${key} fragment has no rug`);
    assert.ok(STYLES[key].fragment.split(/\s+/).length <= 60, `${key} fragment <= 60 words`);
    for (const space of ["setup_corner", "gaming_room", "home_office"]) {
      const p = planDesign({ observations: ROOMS.small(), brief: { budget_sar: 3000 }, aiIntent: {}, suggested: { space, style: key, why: "x" }, secret: "test-secret" });
      assert.equal(p.validation_results.passed, true, JSON.stringify(p.validation_results.errors));
      const ri = p.rendering_instructions;
      assert.match(ri.prompt, /Keep all architecture unchanged/);
      assert.match(ri.prompt, /Style: /, `${key} style line`);
      assert.ok(ri.prompt.indexOf("Keep all architecture unchanged") < ri.prompt.indexOf("Style: "), "structure lock first");
      assert.match(ri.prompt, /No rugs or carpets on the floor/);
      assert.ok(verify(ri, "test-secret"));
      const reqs = p.product_requirements;
      assert.ok(reqs.every(r => r.links.some(l => /amazon\.sa/.test(l.url)) && r.links.some(l => /noon\.com/.test(l.url))));
      assert.ok(!reqs.some(r => r.category === "rug"));
      for (const r of reqs.filter(x => x.status === "placeholder")) assert.equal(r.product, null);
    }
  }
  const g = planDesign({ observations: ROOMS.small(), brief: { budget_sar: 3000 }, aiIntent: {}, suggested: { space: "gaming_room", style: "setup_gaming", why: "x" }, secret: "test-secret" });
  assert.ok(g.product_requirements.some(r => r.category === "pc_case" && r.status === "placeholder"), "recipe piece not in the plan becomes a placeholder");
});
