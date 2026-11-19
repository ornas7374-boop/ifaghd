// sadu Planning Engine — H. Rendering Engine (instructions).
// Turns an APPROVED plan into the image model's instruction. The plan decides; the image model only
// draws: protection first, then the customer's request, then exactly the planned items with colour,
// size and position, and "add nothing else". Also returns the edit region (where the planned items
// go) so the Preservation Engine can restrict generation to it with a mask.
const { protectionLines, SPACES, STYLES } = require("../setup");

const MAX_WORDS = 440; // the whole room is described now (desk setup + the rest of the room)
const STYLE_EN = { night_setup: "dark, calm night gaming setup", white_blue: "bright white and royal blue gaming setup", neon_purple: "bold neon purple gaming",
  rgb_setup: "organised RGB gaming setup", grey_tech: "clean grey technical desk setup" };
for (const [k, r] of Object.entries(require("../setupRecipes").RECIPES)) STYLE_EN[k] = r.en; // image-model prompts are read only up to a limited length

/** Words for one placed item, relative to the desk (what image models follow best). */
function itemPhrase(p, palette, decisions, desk) {
  // a detail from the owner's reference setups replaces the generic name (it already carries its colour)
  const ex = decisions.examples && decisions.examples.items && decisions.examples.items[p.key];
  const colour = ["desk", "chair", "wall_storage", "drawers", "desk_lamp", "monitor_light"].includes(p.key) ? `${palette.furniture} ` : p.key === "accent_light" ? `${palette.accents.join(" and ")} ` : "";
  const name = ex || `${colour}${p.item}`;
  const mid = (p.x0 + p.x1) / 2, dMid = (desk.x0 + desk.x1) / 2;
  const side = mid < dMid - 0.02 ? "left" : mid > dMid + 0.02 ? "right" : "centre";
  if (p.key === "desk") return `${name} about ${desk.cm} cm wide against the ${p.wall} wall, ${p.where.split(" of the ")[0]}${desk.share < 0.6 ? `, not spanning the whole wall` : ""}`;
  if (p.key === "mousepad" && !ex) return `${name} lying on the desktop under the keyboard and mouse`;
  if (ex && /\b(desktop|on the wall|on top of|under the front edge)\b/.test(ex)) return ex; // the detail already says where
  if (p.key === "chair") return `${name} in front of the desk`;
  if (p.key === "mouse") return `${name} beside the keyboard`;
  if (p.anchor === "desk") return side === "centre" ? `${name} on the desk` : `${name} at the ${side} end of the desk`;
  if (p.anchor === "wall") return p.x1 > desk.x0 && p.x0 < desk.x1 ? `${name} on the wall above the desk` : `${name} on the wall to the ${side} of the desk`;
  return `${name} beside the desk on the ${side === "centre" ? "right" : side}`;
}

/**
 * @param {object} plan  the orchestrator's plan (validated)
 * @returns {{prompt: string, words: number, edit_region: object|null, protected: string[], items_allowed: string[]}}
 */
function renderInstructions(plan) {
  if (!plan.validation_results || !plan.validation_results.passed) throw new Error("plan_not_validated");
  const { decisions, room, intent, spatial, fill } = plan._internal;
  const space = SPACES[plan.room_analysis.space] || SPACES.setup_corner;
  const wallItem = decisions.items.find(i => i.key === "wall_treatment");
  const prot = protectionLines({ keep: room.surfaces, allowWall: !!(intent.allow_wall && wallItem), wallTreatment: STYLES[decisions.style] && STYLES[decisions.style].wall });
  // only items the budget kept (or the customer's own devices) are drawn
  const budgeted = new Set(plan.budget_allocation.lines.map(l => l.key));
  const included = new Set(plan.budget_allocation.lines.filter(l => l.included).map(l => l.key));
  const placed = spatial.placement.filter(p => p.key === "own_device" || included.has(p.key) || !budgeted.has(p.key));
  const wallExt = (room.walls.find(w => w.id === spatial.best.wall) || {}).extent;
  const deskRef = { x0: spatial.best.desk.x0, x1: spatial.best.desk.x1, cm: spatial.best.desk_cm,
    share: wallExt ? (spatial.best.desk.x1 - spatial.best.desk.x0) / Math.max(0.01, wallExt.x1 - wallExt.x0) : 1 };
  const lines = placed.map(p => itemPhrase(p, decisions.palette, decisions, deskRef));
  const prio = placed.map(p => p.key === "own_device" || ((decisions.items.find(i => i.key === p.key) || {}).priority === "essential"));
  const light = decisions.lighting;
  // structure-locked template, filled from Gemini's structured room analysis (never a generic prompt)
  const st = plan.room_analysis.structure || {};
  const allowWall = !!(intent.allow_wall && wallItem);
  const existing = (st.existing_furniture || []).join(", ");
  const changeable = allowWall
    ? "furniture, decor, wall finishes and paint colors on the wall behind the desk, and decorative lighting"
    : "furniture, decor and decorative lighting (the wall paint and the floor stay exactly as they are)";
  const clear = !!intent.clear_room;
  const kept = (intent.keep || []).join(", ");
  const head = [
    `Redesign the interior of this exact room in ${STYLE_EN[decisions.style] || "modern gaming setup"} style.`,
    "Keep the exact same camera angle, perspective, framing and lens.",
    `Keep all architecture unchanged and in the exact same position: walls, ceiling height, ceiling lights positions (${st.ceiling_lights || "existing ceiling lights"}), the door (${st.door_position || "no door visible in the photo"}), ${clear ? "the window frame and glass" : "the window and curtains area"} (${(clear ? String(st.window_position || "").replace(/,?\s*(with|and)\s+[^,]*\b(curtains?|blinds?|drapes?)\b/gi, "") : st.window_position) || "no window visible in the photo"}), floor tiles (${st.floor_type || room.surfaces.floor || "existing floor"}) and room dimensions.`,
    "Do not add, remove or move any door, window, wall, column or opening.",
    ...(clear ? [`First empty the room completely: remove ALL existing furniture${existing ? ` (${existing})` : ""}, the curtains and blinds, rugs, wall decor, lamps and clutter${kept ? `, except the customer's ${kept}, which stay exactly as they are` : ""}. Then design the whole room from scratch.`] : []),
    `Only change: ${changeable}. No rugs or carpets on the floor.`,
    // the style line is skipped when the customer described the look themselves (their words say it, in more detail)
    ...(!intent.request_en && STYLES[decisions.style] && STYLES[decisions.style].fragment ? [`Style: ${STYLES[decisions.style].fragment.replace(/[.\s]+$/, "")}.`] : [])
  ];
  const tail = [
    ...(intent.request_en ? [`The customer asks for: ${intent.request_en.replace(/[.\s]+$/, "")}.`] : []),
    `Lighting: ${[light.monitor, light.accent, light.bias].filter(Boolean).join("; ")}; colours: ${decisions.palette.furniture} furniture, ${decisions.palette.accents.join(" and ")} accents.`,
    // FLUX.2 ignores negative wording, so the same rules are also said affirmatively; staging rules from property-staging
    "Every piece grounded and scaled to this perspective, shadows matching the room's light; door and window fully visible; bare floor; unoccupied, tidy room.",
    "Remove clutter (bottles, bags, trash). No people, no faces, no posters of people, no logos or readable text; screens show abstract blue wallpapers.",
    "Photorealistic, natural lighting consistent with the original photo, real-estate photography quality."
  ];
  const furnitureLine = () => clear
    ? `In the emptied room place ${lines.join("; ")}.${decisions.window_dress ? ` On the window: ${decisions.window_dress}.` : ""}`
    : existing
    ? `Replace the existing ${existing} with ${lines.join("; ")}, placed in the same zones.`
    : `Place ${lines.join("; ")} in the free zone (the room has no furniture to replace).`;
  const fillLine = fill && fill.line ? [fill.line] : [];
  const build = () => [...head, furnitureLine(), ...fillLine, ...tail].join(" ");
  let prompt = build();
  // keep within the length the image model reads: drop the least important items first (decor), never the structure lines
  let words = prompt.split(/\s+/).length;
  // over the limit: drop the last optional item first (decor), essentials only when nothing optional is left
  while (words > MAX_WORDS && lines.length > 3) {
    const i = prio.lastIndexOf(false), at = i >= 0 ? i : lines.length - 1;
    lines.splice(at, 1); prio.splice(at, 1); prompt = build(); words = prompt.split(/\s+/).length;
  }

  const xs = placed.map(p => [p.x0, p.x1]).flat();
  // the mask: only this box is redrawn; every pixel outside stays the original photo.
  // x: the planned items (+ margin) kept inside the desk wall; y: below the ceiling line, down to the floor in front of the desk
  let x0 = Math.min(...xs) - 0.03, x1 = Math.max(...xs) + 0.03;
  if (wallExt) { x0 = Math.max(x0, wallExt.x0 + 0.005); x1 = Math.min(x1, wallExt.x1 - 0.005); }
  if (clear) { x0 = 0; x1 = 1; } // the whole room is emptied, not just the desk wall
  const edit_region = xs.length ? { wall: spatial.best.wall, x0: +Math.max(0, x0).toFixed(3), x1: +Math.min(1, x1).toFixed(3), y0: 0.2, y1: 0.97,
    note: "only this box is redrawn (mask); everything outside stays the original photo" } : null;
  // short instruction for the mask (inpainting) model: it only sees the box, so it describes what goes in it
  const fill_prompt = [
    `Photorealistic interior photo. Inside this area of the room add exactly: ${lines.join("; ")}.`,
    `Lighting: ${[light.monitor, light.accent, light.bias].filter(Boolean).join("; ")}.`,
    `Continue the existing ${room.surfaces.walls || "wall paint"} on the wall and the existing ${room.surfaces.floor || "floor"} on the floor seamlessly; bare floor, no rug or carpet.`,
    "No people, no logos, no readable text.",
    ...(clear ? ["The old furniture, curtains and decor in this area are gone: nothing of them remains."] : [])
  ].join(" ");
  // when the room is emptied the curtains change, so only doors are pasted back from the original
  const protect = (clear ? [] : room.windows).concat(room.doors).filter(o => typeof o.y0 === "number" && typeof o.y1 === "number")
    .map(o => ({ x0: +Math.max(0, o.x0 - 0.01).toFixed(3), x1: +Math.min(1, o.x1 + 0.01).toFixed(3), y0: +Math.max(0, o.y0 - 0.01).toFixed(3), y1: +Math.min(1, o.y1 + 0.01).toFixed(3) }));
  return { prompt, words, edit_region, fill_prompt, protect, protected: ["floor", intent.allow_wall && wallItem ? "walls except behind the desk" : "all walls", "ceiling", "windows", "doors", "camera angle"],
    items_allowed: placed.map(p => p.item) };
}

module.exports = { renderInstructions, MAX_WORDS };
