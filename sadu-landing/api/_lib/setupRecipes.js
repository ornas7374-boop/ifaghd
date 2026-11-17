// sadu — the 5 setup styles distilled once (by Gemini) from the owner's 100 Pinterest references
// (data/style_presets_setup.json). Only the text recipes are used here: the images were never stored
// or served. A few owner-approved fixes are applied on top of the raw recipes:
//   - no rug in any style (the floor is always protected)
//   - screens show abstract wallpapers (no game scenes / readable text)
//   - the truncated setup_gaming fragment is completed
//   - clearer Arabic names
const RAW = require("../../data/style_presets_setup.json").styles;

const FIX = {
  setup_gaming: {
    ar: "ألعاب بنفسجي RGB",
    en: "dark gaming setup with vivid purple RGB lighting",
    accent: "purple",
    hint: "dark and bold: purple RGB, a glass PC case on show, for gamers who want a moody, high-contrast night setup",
    fragment: "A modern minimalist gaming desk setup with moody low ambient light. A sleek glass PC case with glowing purple internal lighting sits on a clean desk next to a large monitor showing an abstract wallpaper. A backlit mechanical keyboard and gaming mouse rest on a wide desk mat. Vibrant purple LED accent lighting, high-tech and immersive atmosphere.",
    wall: "matte black paint on the wall behind the desk"
  },
  setup_minimal: {
    ar: "أبيض وخشب فاتح",
    en: "calm minimalist white and light wood workspace",
    accent: "warm white",
    hint: "calm, light and simple: white and light wood, plants, hidden cables; suits light rooms, students and people who work and study",
    wall: "soft warm white paint on the wall behind the desk"
  },
  setup_cozy: {
    ar: "دافئ مريح",
    en: "cozy warm wooden desk setup",
    accent: "warm amber",
    hint: "warm and homely: light wood, plants, soft warm lamps, a knitted throw; suits bedrooms and people who want comfort over RGB",
    wall: "warm beige paint on the wall behind the desk"
  },
  setup_home_office: {
    ar: "مكتب منزلي طبيعي",
    en: "cozy organic home office",
    accent: "warm white",
    hint: "natural and professional: wood, earthy greens, plants and shelves; suits a home office or study for work",
    fragment: "Cozy organic home office setup with a warm natural wooden desk, ergonomic upholstered chair, widescreen monitor with a light bar, mechanical keyboard and mouse on a felt desk mat. Floating wooden shelves decorated with lush trailing potted plants and small abstract framed art, warm ambient backlighting, earthy colour palette, peaceful and inspiring workspace.",
    drop: [/rug/i],
    wall: "deep olive green paint on the wall behind the desk"
  },
  setup_dark_gaming: {
    ar: "ألعاب أسود مطفي",
    en: "matte black moody gaming setup",
    accent: "blue",
    hint: "sleek and mature: matte black, ultrawide monitor, see-through PC, hidden LED backlight; suits adults and serious gamers",
    wall: "dark charcoal paint on the wall behind the desk"
  }
};

// recipe product categories -> the planner's product categories (rugs are never offered: floor is protected)
const CAT_MAP = { desk_mat: "mousepad", monitor_light: "lighting", led_strip: "accent_lighting", light_bars: "accent_lighting",
  pegboard: "shelf", wall_art: "decor", rug: null };

const RECIPES = {};
for (const [key, raw] of Object.entries(RAW)) {
  const fix = FIX[key] || {};
  const clean = (arr) => (arr || []).filter(x => !(fix.drop || []).some(r => r.test(x)) && !/\brug\b|carpet/i.test(x));
  const fragment = (fix.fragment || raw.flux_prompt_fragment || "").replace(/,?\s*[^,.]*\brug\b[^,.]*/gi, "").trim();
  const categories = [...new Set((raw.product_categories || []).map(c => (c in CAT_MAP ? CAT_MAP[c] : c)).filter(Boolean))];
  RECIPES[key] = {
    ar: fix.ar || raw.name_ar, en: fix.en || raw.name_en, accent: fix.accent || "warm white",
    hint: fix.hint || raw.lighting,
    prompt: fragment, fragment, wall: fix.wall,
    palette: raw.color_palette || [], lighting: raw.lighting, materials: raw.materials || [],
    key_elements: clean(raw.key_elements), layout_rules: raw.layout_rules || [], avoid: raw.avoid || [],
    categories, images_used: raw.images_used || 0, recipe: true
  };
}

/** Example details for the planner (same shape as STYLE_EXAMPLES entries). */
function recipeExample(key) {
  const r = RECIPES[key];
  if (!r) return null;
  const items = {};
  r.key_elements.forEach((e, i) => { items[`recipe_${i}`] = e; });
  return { refs: [`pinterest-${key} (${r.images_used} images)`], mood: r.lighting, items, wall_option: r.wall || null };
}

module.exports = { RECIPES, CAT_MAP, recipeExample };
