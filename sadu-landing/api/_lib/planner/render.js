// sadu Planning Engine — H. Rendering Engine (instructions).
// Turns an APPROVED plan into the image model's instruction. The plan decides; the image model only
// draws: protection first, then the customer's request, then exactly the planned items with colour,
// size and position, and "add nothing else". Also returns the edit region (where the planned items
// go) so the Preservation Engine can restrict generation to it with a mask.
const { protectionLines, SPACES, STYLES } = require("../setup");

const MAX_WORDS = 360; // image-model prompts are read only up to a limited length

/** Words for one placed item, relative to the desk (what image models follow best). */
function itemPhrase(p, palette, decisions, desk) {
  const colour = ["desk", "chair", "wall_storage", "drawers", "desk_lamp", "monitor_light"].includes(p.key) ? `${palette.furniture} ` : p.key === "accent_light" ? `${palette.accents.join(" and ")} ` : "";
  const name = `${colour}${p.item}`;
  const mid = (p.x0 + p.x1) / 2, dMid = (desk.x0 + desk.x1) / 2;
  const side = mid < dMid - 0.02 ? "left" : mid > dMid + 0.02 ? "right" : "centre";
  if (p.key === "desk") return `${name} about ${desk.cm} cm wide against the ${p.wall} wall, ${p.where.split(" of the ")[0]}`;
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
  const { decisions, room, intent, spatial } = plan._internal;
  const space = SPACES[plan.room_analysis.space] || SPACES.setup_corner;
  const wallItem = decisions.items.find(i => i.key === "wall_treatment");
  const prot = protectionLines({ keep: room.surfaces, allowWall: !!(intent.allow_wall && wallItem), wallTreatment: STYLES[decisions.style] && STYLES[decisions.style].wall });
  // only items the budget kept (or the customer's own devices) are drawn
  const budgeted = new Set(plan.budget_allocation.lines.map(l => l.key));
  const included = new Set(plan.budget_allocation.lines.filter(l => l.included).map(l => l.key));
  const placed = spatial.placement.filter(p => p.key === "own_device" || included.has(p.key) || !budgeted.has(p.key));
  const deskRef = { x0: spatial.best.desk.x0, x1: spatial.best.desk.x1, cm: spatial.best.desk_cm };
  const lines = placed.map(p => itemPhrase(p, decisions.palette, decisions, deskRef));
  const light = decisions.lighting;
  const parts = [
    `Edit this photo of ${space.prompt}. This is an edit of the existing photo, not a new room.`,
    ...prot,
    ...(intent.request_en ? [`THE CUSTOMER'S REQUEST: ${intent.request_en.replace(/[.\s]+$/, "")}.`] : []),
    `Add exactly these items and nothing else: ${lines.join("; ")}.`,
    `Lighting: ${[light.monitor, light.task, light.accent, light.bias].filter(Boolean).join("; ")}.`,
    `Colours: ${decisions.palette.furniture} furniture, accents ${decisions.palette.accents.join(" and ")} in lights and small items only.`,
    "Keyboard and mouse centred; screens at eye level; cables hidden.",
    "Remove any people. No logos or readable text; screens show abstract wallpapers. Photorealistic, natural proportions."
  ];
  let prompt = parts.join(" ");
  // keep within the length the image model reads: drop the least important items first (decor), never the protection
  let words = prompt.split(/\s+/).length;
  while (words > MAX_WORDS && lines.length > 3) { lines.pop(); parts[parts.findIndex(x => x.startsWith("Add exactly"))] = `Add exactly these items and nothing else: ${lines.join("; ")}.`; prompt = parts.join(" "); words = prompt.split(/\s+/).length; }

  const xs = placed.map(p => [p.x0, p.x1]).flat();
  const edit_region = xs.length ? { wall: spatial.best.wall, x0: +Math.max(0, Math.min(...xs) - 0.03).toFixed(3), x1: +Math.min(1, Math.max(...xs) + 0.03).toFixed(3), note: "planned items go here; everything outside stays original (for the mask path)" } : null;
  return { prompt, words, edit_region, protected: ["floor", intent.allow_wall && wallItem ? "walls except behind the desk" : "all walls", "ceiling", "windows", "doors", "camera angle"],
    items_allowed: placed.map(p => p.item) };
}

module.exports = { renderInstructions, MAX_WORDS };
