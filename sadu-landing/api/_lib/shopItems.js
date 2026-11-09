// sadu — "shop the look": list the furnishings seen in a design image, with an approximate
// Saudi price range and search links to stores. Prices are AI estimates, shown as approximate.

const CATEGORIES = ["desk", "chair", "monitor", "monitor_arm", "keyboard", "mouse", "mousepad", "headset", "microphone", "speakers", "computer", "console", "controller",
  "lighting", "wall_panels", "shelf", "pegboard", "storage", "seating", "table", "rug", "textiles", "wall_art", "decor", "plants", "other"];

const SYSTEM = "You are a gaming and desk setup stylist and shopping assistant for customers in Saudi Arabia. " +
  "You look at a photo of a setup or room and list the pieces a customer could buy to recreate it. Answer with JSON only.";

const PROMPT = `List the purchasable items visible in this setup photo: desk, chair, monitors and monitor arms, keyboard, mouse, desk mat, headset, microphone, speakers, PC or console,
LED light bars, LED wall panels, neon signs, 3D wall panels, shelves, pegboards, plants, posters and decor, and any furniture (sofa, TV unit, rug).
Do NOT list fixed architecture (walls, floor, ceiling, windows, doors) or people. Describe items generically (type, style, colour); do not guess brand names.
Merge identical items (e.g. 4 matching chairs = one item, quantity 4). Most visible items first. At most 12 items.

For each item:
- name_ar: short natural Arabic product name, as a Saudi shopper would search for it (e.g. "شاشة منحنية 34 بوصة" or "لوحات إضاءة مثلثة RGB")
- name_en: short English product name
- category: one of ${CATEGORIES.join(", ")}
- material_ar, color_ar: short Arabic words
- quantity: integer
- price_min_sar, price_max_sar: typical retail price range for ONE piece in Saudi Arabia, mid-range (Amazon.sa, noon, Jarir, Extra, IKEA), whole riyals
- search_ar, search_en: the best short search query for this exact piece (style + material + type), 2 to 6 words

Return ONLY: {"items":[{"name_ar":"","name_en":"","category":"","material_ar":"","color_ar":"","quantity":1,"price_min_sar":0,"price_max_sar":0,"search_ar":"","search_en":""}]}`;

const clean = (v, n) => String(v == null ? "" : v).replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };

function storeLinks(it, opts = {}) {
  const ar = encodeURIComponent(it.search_ar || it.name_ar), en = encodeURIComponent(it.search_en || it.name_en || it.search_ar);
  const tag = opts.amazonTag ? `&tag=${encodeURIComponent(opts.amazonTag)}` : "";
  return [
    { store: "نون", url: `https://www.noon.com/saudi-ar/search/?q=${ar}` },
    { store: "أمازون", url: `https://www.amazon.sa/s?k=${ar}${tag}` },
    { store: "ايكيا", url: `https://www.ikea.com/sa/ar/search/?q=${en}` },
    { store: "قوقل", url: `https://www.google.com/search?tbm=shop&q=${ar}` }
  ];
}

/** Validate the model's JSON; returns { items, total_min, total_max }. */
function parseItems(text, opts = {}) {
  if (typeof text !== "string") throw new Error("items_no_text");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("items_no_json");
  let j;
  try { j = JSON.parse(text.slice(a, b + 1)); } catch { throw new Error("items_bad_json"); }
  const raw = Array.isArray(j.items) ? j.items : [];
  const items = [];
  for (const r of raw.slice(0, 16)) {
    const it = {
      name_ar: clean(r.name_ar, 60), name_en: clean(r.name_en, 60),
      category: CATEGORIES.includes(r.category) ? r.category : "other",
      material_ar: clean(r.material_ar, 40), color_ar: clean(r.color_ar, 40),
      quantity: Math.min(int(r.quantity) || 1, 20),
      search_ar: clean(r.search_ar, 80), search_en: clean(r.search_en, 80)
    };
    if (!it.name_ar) continue;
    let lo = Math.min(int(r.price_min_sar), 200000), hi = Math.min(int(r.price_max_sar), 200000);
    if (lo && hi && lo > hi) [lo, hi] = [hi, lo];
    if (!hi) hi = lo; if (!lo) lo = hi;
    it.price_min_sar = lo; it.price_max_sar = hi;
    it.links = storeLinks(it, opts);
    items.push(it);
    if (items.length >= 12) break;
  }
  if (!items.length) throw new Error("items_none");
  const total_min = items.reduce((s, i) => s + i.price_min_sar * i.quantity, 0);
  const total_max = items.reduce((s, i) => s + i.price_max_sar * i.quantity, 0);
  return { items, total_min, total_max };
}

async function shopItems(key, image, opts = {}) {
  const { visionJSON } = require("./gemini");
  const r = await visionJSON(key, image, { system: SYSTEM, prompt: PROMPT, model: opts.model, budgetMs: opts.budgetMs || 50000 });
  return { ...parseItems(r.text, opts), model: r.model };
}

module.exports = { shopItems, parseItems, storeLinks, CATEGORIES, PROMPT };
