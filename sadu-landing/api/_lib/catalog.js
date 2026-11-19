// sadu — real product catalogue (owner-supplied, data/catalog_ikea_sa.json: IKEA Saudi Arabia).
// The planner picks a real product for a piece when one fits (category, colour family, style, price tier);
// the design then shows that exact product (name, price, link) and the image model gets its photo as a
// reference, so the drawing shows the real piece instead of an invented one.
const DATA = require("../../data/catalog_ikea_sa.json");
const PRODUCTS = DATA.products;
const BY_ID = new Map(PRODUCTS.map(p => [p.id, p]));

// our piece keys -> catalogue categories / types
const SOURCE = {
  sofa: (p) => p.category === "sofa",
  armchair: (p) => p.category === "armchair",
  lounge_chair: (p) => p.category === "armchair" && /swivel|easy|rocking|armchair/i.test(p.type),
  tv_console: (p) => p.category === "tv",
  floor_lamp: (p) => p.category === "lamp",
  coffee_table: (p) => p.category === "table" && /coffee/i.test(p.type),
  side_table: (p) => p.category === "table" && /side|tray/i.test(p.type),
  mirror: (p) => p.category === "mirror",
  curtain: (p) => p.category === "curtain",
  cushion: (p) => p.category === "cushion" && /cushion$|cover/i.test(p.type)
};

const FAMILY = (c) => /^(white|off-white)$/.test(c) ? "white" : /beige|natural|cream/.test(c) ? "beige" : /^(black|anthracite|black-brown)$/.test(c) ? "black"
  : /dark grey/.test(c) ? "black" : /grey/.test(c) ? "grey" : /oak|birch|bamboo|ash/.test(c) ? "light wood" : /brown|walnut/.test(c) ? "dark wood"
  : /gold|brass/.test(c) ? "gold" : "colour";
const WANT = { // furniture colour of the plan -> colour families that sit well with it, best first
  white: ["white", "beige", "light wood", "grey"], grey: ["grey", "white", "black"], black: ["black", "grey", "dark wood"], "matte black": ["black", "grey", "dark wood"],
  "light wood": ["light wood", "beige", "white"], "natural wood": ["light wood", "dark wood", "beige"], "white or light wood": ["white", "light wood", "beige"]
};
const TAGS = (style) => /minimal|cozy|home_office/.test(style) ? ["neutral-minimal", "warm-natural"] : ["modern", "neutral-minimal"];
const tierFor = (budget) => !budget ? "mid" : budget < 2500 ? "budget" : budget < 7000 ? "mid" : "premium";
const TIER_N = { budget: 0, mid: 1, premium: 2 };

/** Best real product for a piece, or null. opts: {furniture, style, budget, prefer: [families]} */
function pick(piece, opts = {}) {
  const ok = SOURCE[piece];
  if (!ok) return null;
  const fams = opts.prefer || WANT[opts.furniture] || ["white", "beige", "grey", "black"];
  const tags = TAGS(opts.style || ""), tier = tierFor(opts.budget);
  const score = (p) => {
    const fs = p.colors.map(FAMILY);
    const fi = Math.min(...fs.map(f => { const i = fams.indexOf(f); return i < 0 ? 9 : i; }), 9);
    return (9 - fi) * 10 + (p.style_tags.some(t => tags.includes(t)) ? 6 : 0) - Math.abs((TIER_N[p.price_tier] ?? 1) - TIER_N[tier]) * 4 - (fs.includes("colour") ? 8 : 0);
  };
  const list = PRODUCTS.filter(ok).sort((a, b) => score(b) - score(a) || a.price_sar - b.price_sar);
  return list[0] || null;
}

/** Short English words for the image prompt, e.g. "IKEA EKTORP 3-seat sofa in dark blue". */
function phrase(p) {
  const [model, ...rest] = p.name.split(",");
  const colour = rest.join(",").replace(/\d+(\s*x\s*\d+)*\s*cm/gi, "").split(",").map(s => s.trim()).filter(Boolean).join(", ") || p.colors.join(" and ");
  return `IKEA ${model.trim()}${colour ? ` in ${colour.toLowerCase()}` : ""}`;
}

/** The product as it is shown to the customer and checked by products.fits(). */
function asProduct(p) {
  return { id: p.id, name: p.name, store: "ايكيا", price_sar: p.price_sar, url: p.product_url, image_url: p.image_url, verified_at: DATA.collected_at, colour: p.colors.join(", ") };
}

module.exports = { pick, phrase, asProduct, byId: (id) => BY_ID.get(id) || null, PRODUCTS, SOURCE, collected_at: DATA.collected_at };
