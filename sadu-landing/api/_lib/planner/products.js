// sadu Planning Engine — F. Product Matching Engine.
// Turns each planned item into a product requirement (type, colour, size, planned budget) and matches
// it to a VERIFIED product only when a catalogue entry fits (category, size, colour, price). Until a
// verified catalogue exists (e.g. Amazon.sa affiliate products) every requirement stays "suggested":
// a description plus store search links, never an invented product or price.
const { storeLinks } = require("../shopItems");

const NAME = {
  desk: ["مكتب", "desk"], chair: ["كرسي مكتب مريح", "ergonomic office chair"], monitor: ["شاشة", "monitor"], monitor_arm: ["ذراع شاشة", "monitor arm"],
  keyboard: ["كيبورد ميكانيكي", "mechanical keyboard"], mouse: ["ماوس", "mouse"], mousepad: ["ماوس باد كبير", "large desk mat"],
  lighting: ["إضاءة شاشة", "monitor light bar"], desk_lamp: ["أباجورة مكتب", "desk lamp"], accent_lighting: ["إضاءة LED جدارية", "LED wall light bars"],
  key_light: ["إضاءة تصوير", "key light"], microphone: ["مايك مع ذراع", "microphone with boom arm"], webcam: ["كاميرا ويب", "webcam"],
  shelf: ["لوح تعليق ورف", "pegboard and floating shelf"], storage: ["وحدة أدراج", "drawer unit"], plants: ["نبتة صناعية صغيرة", "small artificial plant"],
  decor: ["لوحة جدارية", "framed art print"], wall_panels: ["ألواح جدارية", "wall panels"]
};
const AR_COLOUR = { white: "أبيض", black: "أسود", grey: "رمادي", blue: "أزرق", cyan: "سماوي", purple: "بنفسجي", pink: "وردي", red: "أحمر", orange: "برتقالي", green: "أخضر", "white or light wood": "أبيض" };

function colourFor(item, palette) {
  if (["accent_lighting"].includes(item.cat)) return palette.accents[0] || "";
  if (["desk", "chair", "storage", "shelf", "monitor_arm", "keyboard", "mouse", "desk_lamp", "lighting"].includes(item.cat)) return palette.furniture;
  return "";
}

/** A catalogue entry fits a requirement if category, colour, size and price fit. */
function fits(req, p) {
  if (!p || p.category !== req.category || !(Number(p.price_sar) > 0) || !p.url || !p.verified_at) return false;
  if (req.budget_sar && Number(p.price_sar) > req.budget_sar * 1.15) return false;
  if (req.spec.width_cm && p.width_cm && Math.abs(p.width_cm - req.spec.width_cm) > 15) return false;
  if (req.spec.colour && p.colour && !String(p.colour).toLowerCase().includes(String(req.spec.colour).split(" ")[0])) return false;
  return true;
}

/**
 * @param {object[]} items      decisions.items
 * @param {object}   budget     allocateBudget() result
 * @param {object}   palette    decisions.palette
 * @param {object[]} placement  spatial placement
 * @param {{catalog?: object[], amazonTag?: string}} opts  verified products (empty until one exists)
 */
function matchProducts(items, budget, palette, placement, opts = {}) {
  const catalog = Array.isArray(opts.catalog) ? opts.catalog : [];
  const out = [];
  for (const line of budget.lines.filter(l => l.included)) {
    const item = items.find(i => i.key === line.key) || {};
    const colour = colourFor(item, palette);
    const [ar, en] = NAME[line.category] || [line.label, line.label];
    const spec = { colour, ...(item.spec || {}) };
    const deskPlaced = placement.find(p => p.item === "desk");
    if (line.category === "desk" && deskPlaced) spec.note = "must fit the planned free stretch";
    const words = [ar, AR_COLOUR[colour] || "", spec.width_cm ? `${spec.width_cm} سم` : ""].filter(Boolean).join(" ");
    const req = { key: line.key, label: line.label, category: line.category, priority: line.priority, spec, budget_sar: line.planned_sar, range_sar: line.range_sar,
      search: { ar: words, en: [colour && !/or/.test(colour) ? colour : "", en, spec.width_cm ? `${spec.width_cm}cm` : ""].filter(Boolean).join(" ") } };
    const verified = catalog.filter(p => fits(req, p)).sort((a, b) => a.price_sar - b.price_sar)[0] || null;
    out.push({ ...req, status: verified ? "verified" : "suggested",
      product: verified ? { name: verified.name, price_sar: verified.price_sar, url: verified.url, store: verified.store, verified_at: verified.verified_at } : null,
      links: storeLinks({ name_ar: req.search.ar, name_en: req.search.en, search_ar: req.search.ar, search_en: req.search.en }, { amazonTag: opts.amazonTag }) });
  }
  return { requirements: out, verified_count: out.filter(r => r.status === "verified").length,
    note: catalog.length ? "Verified products come from the catalogue; the rest are suggestions with store searches." : "No verified product catalogue yet: every item is a suggestion with store search links; prices are estimated ranges." };
}

module.exports = { matchProducts, fits, NAME };
