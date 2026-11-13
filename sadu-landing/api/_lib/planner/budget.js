// sadu Planning Engine — E. Budget Engine.
// Splits the customer's budget over the planned items: essentials first (in the guide's buying order
// for the setup type), each at the cheapest tier that fits, then upgrades tiers while money remains,
// then optional items; 10% stays in reserve. The total never exceeds the budget.
// PRICES: these are ESTIMATED category ranges for the Saudi market in SAR, not prices of real
// products. Real prices come only from verified products (Product Matching).
const { BUY_PRIORITY } = require("../designPrinciples");

const RANGES_SAR = { // [budget, mid, premium] per category: [min, max]
  desk: [[250, 450], [450, 900], [900, 2000]],
  chair: [[300, 600], [600, 1300], [1300, 3000]],
  monitor: [[450, 800], [800, 1600], [1600, 4000]],
  monitor_arm: [[80, 150], [150, 350], [350, 800]],
  keyboard: [[80, 200], [200, 450], [450, 900]],
  mouse: [[50, 150], [150, 350], [350, 700]],
  mousepad: [[30, 70], [70, 150], [150, 300]],
  lighting: [[80, 180], [180, 400], [400, 800]],
  desk_lamp: [[50, 120], [120, 300], [300, 700]],
  accent_lighting: [[60, 200], [200, 700], [700, 1500]],
  key_light: [[150, 300], [300, 700], [700, 1500]],
  microphone: [[150, 350], [350, 800], [800, 1800]],
  webcam: [[120, 250], [250, 600], [600, 1200]],
  shelf: [[60, 150], [150, 350], [350, 700]],
  storage: [[150, 300], [300, 700], [700, 1500]],
  plants: [[25, 60], [60, 150], [150, 300]],
  decor: [[30, 100], [100, 250], [250, 600]],
  wall_panels: [[150, 400], [400, 900], [900, 2000]]
};
const TIERS = ["budget", "mid", "premium"];
const RESERVE = 0.10;
const mid = ([a, b]) => Math.round((a + b) / 2);

/** Buying order: essentials sorted by the guide's priority for this use, then optionals. */
function orderItems(items, use) {
  const order = BUY_PRIORITY[use === "study" ? "work" : use] || BUY_PRIORITY.mixed;
  const rank = (it) => { const i = order.indexOf(it.cat === "lighting" || it.cat === "accent_lighting" || it.cat === "desk_lamp" || it.cat === "key_light" ? "lighting" : it.cat); return i < 0 ? 99 : i; };
  const ess = items.filter(i => i.priority === "essential").sort((a, b) => rank(a) - rank(b));
  const opt = items.filter(i => i.priority !== "essential").sort((a, b) => rank(a) - rank(b));
  return [...ess, ...opt];
}

/**
 * @param {object[]} items   decisions.items (each {key, cat, label, priority})
 * @param {number|null} budget  SAR, or null when the customer gave none
 * @param {string} use
 */
function allocateBudget(items, budget, use) {
  const priced = orderItems(items.filter(i => RANGES_SAR[i.cat]), use);
  const lines = priced.map(i => ({ key: i.key, label: i.label, category: i.cat, priority: i.priority, tier: null, range_sar: null, planned_sar: 0, included: false }));
  const note = "Estimated category ranges in SAR for the Saudi market, not real product prices.";

  if (!budget) { // no budget: plan everything at mid tier and say so
    for (const l of lines) { l.tier = "mid"; l.range_sar = RANGES_SAR[l.category][1]; l.planned_sar = mid(l.range_sar); l.included = true; }
    const total = lines.reduce((s, l) => s + l.planned_sar, 0);
    return { budget_sar: null, reserve_sar: 0, available_sar: null, total_planned_sar: total, within_budget: true, lines, dropped: [], status: "no_budget_given", note };
  }
  const reserve = Math.round(budget * RESERVE), available = budget - reserve;
  let spent = 0;
  const dropped = [];
  // 1) essentials at the cheapest tier (minimum of the range), in buying order
  for (const l of lines.filter(l => l.priority === "essential")) {
    const cost = RANGES_SAR[l.category][0][0];
    if (spent + cost <= available) { l.included = true; l.tier = "budget"; l.range_sar = RANGES_SAR[l.category][0]; l.planned_sar = cost; spent += cost; }
    else dropped.push({ key: l.key, label: l.label, reason: "budget too small even for the cheapest option" });
  }
  // 2) optionals at the cheapest tier while they fit
  for (const l of lines.filter(l => l.priority !== "essential")) {
    const cost = RANGES_SAR[l.category][0][0];
    if (spent + cost <= available) { l.included = true; l.tier = "budget"; l.range_sar = RANGES_SAR[l.category][0]; l.planned_sar = cost; spent += cost; }
    else dropped.push({ key: l.key, label: l.label, reason: "optional, left out to stay within budget" });
  }
  // 3) upgrade in buying order, one level at a time for every item, while it fits:
  //    middle of the budget tier -> middle of the mid tier -> entry of the premium tier
  const LEVELS = [{ tier: "budget", price: (r) => mid(r[0]) }, { tier: "mid", price: (r) => mid(r[1]) }, { tier: "premium", price: (r) => r[2][0] }];
  for (const lv of LEVELS) {
    for (const l of lines.filter(l => l.included)) {
      const want = lv.price(RANGES_SAR[l.category]);
      if (want <= l.planned_sar || spent - l.planned_sar + want > available) continue;
      spent += want - l.planned_sar; l.planned_sar = want; l.tier = lv.tier; l.range_sar = RANGES_SAR[l.category][TIERS.indexOf(lv.tier)];
    }
  }
  const essentialsMissing = dropped.filter(d => (lines.find(l => l.key === d.key) || {}).priority === "essential");
  const minimumEssential = lines.filter(l => l.priority === "essential").reduce((s, l) => s + RANGES_SAR[l.category][0][0], 0);
  return {
    budget_sar: budget, reserve_sar: reserve, available_sar: available, total_planned_sar: spent,
    within_budget: spent <= available, lines, dropped,
    status: essentialsMissing.length ? "budget_too_low" : "ok",
    minimum_for_essentials_sar: minimumEssential + Math.round(minimumEssential * RESERVE / (1 - RESERVE)),
    note
  };
}

module.exports = { allocateBudget, orderItems, RANGES_SAR, RESERVE };
