// sadu Planning Engine — I. Quality Evaluation Engine.
// Compares the ORIGINAL photo, the PLAN and the GENERATED image after rendering, scores the result and
// classifies any failure: "regenerate" (the plan was fine, the drawing was not), "regenerate_strict"
// (the room's architecture changed: needs the mask path of the Preservation Engine) or "replan"
// (the plan itself cannot satisfy the request).
// Honesty: the vision check of preservation is VISUAL ONLY. Pixel-level preservation is reported as
// "not_tested" unless the Preservation Engine's result is passed in.

const SYSTEM = "You are a strict design reviewer. You compare a room photo before and after an AI edit against a written plan. " +
  "You report only what you can see, with yes / no / unsure. Answer with JSON only.";

const SURFACES = ["floor", "walls", "ceiling", "windows_doors", "camera"];
const YN = ["yes", "no", "unsure"];

function evaluationPrompt(plan) {
  const items = (plan.rendering_instructions && plan.rendering_instructions.items_allowed) || plan.furniture_placement.map(p => p.item);
  const desk = plan.spatial_plan && plan.spatial_plan.desk;
  const u = plan.user_requirements || {};
  return `IMAGE 1 is the original room. IMAGE 2 is the edited result.
The plan: ${desk ? `a desk against the ${desk.wall} wall` : "no desk position"}; items allowed: ${items.join(", ")}.
Accent colours: ${(plan.color_palette.accents || []).join(", ") || "none"}. Customer request: "${(u.request_en || u.request || "none").slice(0, 300)}".
Protected (must look the same in IMAGE 2): the floor, the walls${u.allow_wall ? " (except the wall behind the desk)" : ""}, the ceiling, windows and doors, the camera angle.

Report ONLY this JSON:
{"preservation": {"floor": "yes|no|unsure", "walls": "yes|no|unsure", "ceiling": "yes|no|unsure", "windows_doors": "yes|no|unsure", "camera": "yes|no|unsure"},
 "items": [{"item": "<planned item>", "present": "yes|no|unsure", "placed_as_planned": "yes|no|unsure"}],
 "extra_items": ["clearly visible new items that are NOT in the plan"],
 "colors_match": "yes|partly|no", "request_met": "yes|partly|no",
 "quality": 1-5, "notes": "one short English sentence"}
"yes" in preservation means it is the SAME as in IMAGE 1.`;
}

const yn = (v) => (YN.includes(v) ? v : "unsure");

/** Pure scoring of the reviewer's answer (testable without any model). */
function scoreEvaluation(raw, plan, pixelPreservation = null) {
  const j = raw && typeof raw === "object" ? raw : {};
  const pres = {}; for (const k of SURFACES) pres[k] = yn(j.preservation && j.preservation[k]);
  const allowed = new Set(((plan.rendering_instructions && plan.rendering_instructions.items_allowed) || []).map(s => s.toLowerCase()));
  const items = (Array.isArray(j.items) ? j.items : []).filter(i => i && i.item).slice(0, 30).map(i => ({ item: String(i.item).slice(0, 60), present: yn(i.present), placed_as_planned: yn(i.placed_as_planned) }));
  const extra = (Array.isArray(j.extra_items) ? j.extra_items : []).map(s => String(s).slice(0, 60)).filter(s => !allowed.has(s.toLowerCase())).slice(0, 10);
  const q = Math.max(1, Math.min(5, Math.round(Number(j.quality) || 3)));
  const colours = ["yes", "partly", "no"].includes(j.colors_match) ? j.colors_match : "partly";
  const request = ["yes", "partly", "no"].includes(j.request_met) ? j.request_met : "partly";

  const changed = SURFACES.filter(k => pres[k] === "no");
  const present = items.filter(i => i.present === "yes").length, missing = items.filter(i => i.present === "no").map(i => i.item);
  const misplaced = items.filter(i => i.present === "yes" && i.placed_as_planned === "no").map(i => i.item);
  const scores = {
    preservation: Math.round(100 * SURFACES.filter(k => pres[k] === "yes").length / SURFACES.length),
    plan_match: items.length ? Math.round(100 * (present - misplaced.length * 0.5) / items.length) : 0,
    request: request === "yes" ? 100 : request === "partly" ? 50 : 0,
    colours: colours === "yes" ? 100 : colours === "partly" ? 50 : 0,
    quality: q * 20
  };
  const failures = [];
  if (changed.length) failures.push({ type: "architecture_changed", detail: changed, action: "regenerate_strict" });
  if (pixelPreservation && pixelPreservation.passed === false) failures.push({ type: "pixel_preservation_failed", detail: pixelPreservation.reasons || [], action: "regenerate_strict" });
  if (missing.length) failures.push({ type: "planned_items_missing", detail: missing, action: "regenerate" });
  if (misplaced.length) failures.push({ type: "items_misplaced", detail: misplaced, action: "regenerate" });
  if (extra.length > 2) failures.push({ type: "unplanned_items_added", detail: extra, action: "regenerate" });
  if (request === "no" && !missing.length) failures.push({ type: "request_not_met_by_plan", detail: [], action: "replan" });
  if (colours === "no") failures.push({ type: "colours_wrong", detail: plan.color_palette.accents || [], action: "regenerate" });
  const order = ["replan", "regenerate_strict", "regenerate"];
  const next = failures.length ? order.find(a => failures.some(f => f.action === a)) : "accept";
  return {
    verdict: failures.length ? "needs_work" : "pass", next_action: next, scores, failures,
    preservation: { visual: pres, pixel: pixelPreservation ? (pixelPreservation.passed ? "passed" : "failed") : "not_tested",
      note: pixelPreservation ? "pixel check by the Preservation Engine" : "visual check only; pixel-level preservation not tested (needs the Preservation Engine with segmentation)" },
    items, extra_items: extra, colors_match: colours, request_met: request, quality: q, notes: String(j.notes || "").slice(0, 200)
  };
}

/** Vision review of (original, generated) against the plan. */
async function evaluateResult(key, original, generated, plan, opts = {}) {
  const { visionJSONImages } = require("../gemini");
  const { parseJson } = require("./perceive");
  const r = await visionJSONImages(key, [original, generated], { system: SYSTEM, prompt: evaluationPrompt(plan), model: opts.model, budgetMs: opts.budgetMs || 50000, maxTokens: 1500 });
  return { ...scoreEvaluation(parseJson(r.text), plan, opts.pixelPreservation || null), model: r.model };
}

module.exports = { evaluateResult, scoreEvaluation, evaluationPrompt };
