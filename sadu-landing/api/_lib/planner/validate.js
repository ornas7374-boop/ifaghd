// sadu Planning Engine — G. Validation Engine.
// Checks a complete plan BEFORE anything is rendered. Errors block rendering (the orchestrator then
// re-plans); warnings are shown to the customer but do not block.
const { overlap, width } = require("./schema");

/**
 * @param {object} p  {room, intent, decisions, spatial, budget}
 * @returns {{passed: boolean, errors: object[], warnings: object[], checks: object[]}}
 */
function validatePlan(p) {
  const { room, intent, decisions, spatial, budget } = p;
  const errors = [], warnings = [], checks = [];
  const check = (name, ok, code, message, severity = "error") => {
    checks.push({ name, result: ok ? "pass" : severity === "error" ? "fail" : "warning" });
    if (!ok) (severity === "error" ? errors : warnings).push({ code, message });
  };

  // 1. a desk position exists
  const best = spatial && spatial.best;
  check("desk position found", !!best, "no_desk_position",
    best ? "" : `no wall can take a desk safely: ${(spatial.candidates || []).map(c => `${c.wall}: ${c.blockers.join("; ")}`).join(" | ") || "no visible wall with free space"}`);
  if (best) {
    // 2. doors and windows, re-checked on the final placement
    const doorHit = room.doors.some(d => d.wall === best.wall && overlap({ x0: d.x0 - width(d) * 0.5, x1: d.x1 + width(d) * 0.5 }, best.desk) > 0);
    check("door and its swing kept clear", !doorHit, "blocks_door", "the desk blocks a door or its swing");
    const winBehind = room.windows.some(w => w.wall === best.wall && overlap(w, best.desk) > 0);
    check("no window behind the monitor", !winBehind, "window_behind_monitor", "the monitor would face the window (glare, backlit face)");
    // 3. movement space behind the chair
    const clearanceOk = best.depth_m >= best.need_m;
    check("room behind the chair (90-107 cm)", clearanceOk || room.size.certainty === "unknown", "no_clearance", `only ~${best.depth_m} m in front of the desk wall, ~${best.need_m} m needed`);
    if (!clearanceOk && room.size.certainty === "unknown") warnings.push({ code: "clearance_unsure", message: `room depth unknown; typical ${room.size.class} room gives ~${best.depth_m} m, ~${best.need_m} m needed: check on site` });
    // 4. desk size
    check("desk at least 117 cm (ANSI)", best.desk_cm >= 117, "narrow_desk", `desk ${best.desk_cm} cm is below the 117 cm recommended minimum`, "warning");
    // 5. wall-mounted items must not cover windows or doors; floor items must not block doors
    for (const it of spatial.placement) {
      const onWall = room.windows.concat(room.doors).filter(o => o.wall === it.wall);
      const hit = onWall.find(o => overlap(o, it) > 0 && (it.anchor === "wall" || (it.anchor === "floor" && room.doors.includes(o))));
      if (hit) { checks.push({ name: `${it.item} placement`, result: "fail" }); errors.push({ code: "covers_opening", key: it.key, message: `${it.item} would cover a ${room.windows.includes(hit) ? "window" : "door"}` }); }
    }
    if (best.warnings.length) for (const w of best.warnings) warnings.push({ code: "placement_note", message: w });
  }
  // 6. budget
  if (budget.budget_sar) {
    check("within budget", budget.total_planned_sar <= budget.available_sar, "over_budget", `planned ${budget.total_planned_sar} SAR exceeds ${budget.available_sar} SAR`);
    const deskDropped = budget.dropped.some(d => d.key === "desk");
    check("budget covers a desk", !deskDropped, "budget_no_desk", `budget too small for a desk; at least ~${budget.minimum_for_essentials_sar} SAR is needed for the essentials`);
    if (budget.status === "budget_too_low" && !deskDropped) warnings.push({ code: "budget_too_low", message: `some essentials were left out; about ${budget.minimum_for_essentials_sar} SAR covers all essentials` });
  } else warnings.push({ code: "no_budget", message: "no budget given: planned at mid-range estimates" });
  // 7. the customer's request
  for (const c of intent.accents) check(`requested colour ${c}`, decisions.palette.accents.includes(c), "colour_missing", `requested ${c} is not in the palette`);
  const wallItem = decisions.items.some(i => i.key === "wall_treatment");
  check("walls changed only if allowed", !wallItem || intent.allow_wall, "wall_not_allowed", "a wall treatment was planned without permission");
  check("floor never changed", !decisions.items.some(i => /rug|floor/i.test(i.cat)), "floor_change", "a floor covering or floor change was planned");
  // 8. clutter in small rooms
  if (room.size.class === "small") {
    const decor = decisions.items.filter(i => ["decor", "plants"].includes(i.cat)).length;
    check("small room not crowded", decor <= 1, "crowded", `small room with ${decor} decor items`, "warning");
  }
  for (const c of intent.conflicts) warnings.push({ code: `request_${c.type}`, message: `${c.detail} -> ${c.resolution}` });
  return { passed: errors.length === 0, errors, warnings, checks };
}

module.exports = { validatePlan };
