// sadu — ONE-TIME style-recipe extraction from the owner's Pinterest reference list
// (data/sadu-setup-references.json). Images are downloaded only for this run, resized, sent to Gemini
// (vision) in batches of ~10, and never stored, returned or served. Only the text recipe is kept,
// in data/style_presets_setup.json.
const RECIPE_KEYS = ["name_ar", "name_en", "color_palette", "lighting", "materials", "key_elements", "layout_rules", "avoid", "product_categories", "flux_prompt_fragment"];
const CATEGORIES = ["desk", "chair", "monitor", "monitor_arm", "monitor_light", "keyboard", "mouse", "desk_mat", "led_strip", "light_bars",
  "desk_lamp", "shelf", "pegboard", "plants", "headphone_stand", "speakers", "microphone", "wall_art", "pc_case", "storage", "rug", "wall_panels"];

const SYSTEM = "You are an interior stylist. You study reference photos of desk and gaming setups and describe the shared STYLE, never one specific photo. Answer with JSON only.";

function batchPrompt(style) {
  return `These photos are references for one setup style ("${style}"). Extract the style recipe they share.
Rules: describe the style, not any single photo; no brand names; no people; no copying of a specific layout.
Return ONLY this JSON:
{"name_ar": "short Arabic style name", "name_en": "short English style name",
 "color_palette": ["#hex", "... 4 to 6 colours"],
 "lighting": "one sentence: light sources, colour temperature, accent colours",
 "materials": ["..."], "key_elements": ["..."], "layout_rules": ["..."], "avoid": ["..."],
 "product_categories": ["only from: ${CATEGORIES.join(", ")}"],
 "flux_prompt_fragment": "English, max 60 words, describes the look to add to a room (furniture, decor, lighting, colours), no walls/floor changes, no people, no brands"}`;
}

function mergePrompt(style, recipes) {
  return `Merge these partial style recipes for "${style}" into ONE recipe with the same JSON keys. Keep what they agree on, drop rare details,
keep 4-6 hex colours, at most 8 items per list, product_categories only from: ${CATEGORIES.join(", ")}.
flux_prompt_fragment: English, max 60 words, no wall or floor changes, no people, no brands.
Partial recipes:
${JSON.stringify(recipes)}
Return ONLY the merged JSON.`;
}

const words = (s, n) => String(s || "").split(/\s+/).filter(Boolean).slice(0, n).join(" ");
const list = (v, n = 8) => (Array.isArray(v) ? v : []).map(x => String(x).trim()).filter(Boolean).slice(0, n);

/** Clean one recipe to the required shape. */
function normalizeRecipe(r) {
  const j = r && typeof r === "object" ? r : {};
  return {
    name_ar: String(j.name_ar || "").slice(0, 40), name_en: String(j.name_en || "").slice(0, 40),
    color_palette: list(j.color_palette, 6).filter(c => /^#[0-9a-f]{6}$/i.test(c)),
    lighting: String(j.lighting || "").slice(0, 300),
    materials: list(j.materials), key_elements: list(j.key_elements), layout_rules: list(j.layout_rules), avoid: list(j.avoid),
    product_categories: list(j.product_categories, 12).map(c => c.toLowerCase().replace(/\s+/g, "_")).filter(c => CATEGORIES.includes(c)),
    flux_prompt_fragment: words(j.flux_prompt_fragment, 60)
  };
}

async function fetchImage(url, f = fetch) {
  const sharp = require("sharp");
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await f(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (style-reference study)" } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const small = await sharp(buf).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${small.toString("base64")}`;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Run one style: batches of ~10 in parallel, then a merge. Returns text only. */
async function extractStyle(key, style, urls, opts = {}) {
  const { visionJSONImages } = require("./gemini");
  const { parseJson } = require("./planner/perceive");
  const size = opts.batchSize || 10;
  const batches = [];
  for (let i = 0; i < urls.length; i += size) batches.push(urls.slice(i, i + size));
  const partial = await Promise.all(batches.map(async (b) => {
    const imgs = (await Promise.all(b.map(u => fetchImage(u, opts.fetch)))).filter(Boolean);
    if (!imgs.length) return { images: 0, recipe: null, error: "no_images" };
    try {
      const r = await visionJSONImages(key, imgs, { system: SYSTEM, prompt: batchPrompt(style), budgetMs: 40000, maxTokens: 1500 });
      return { images: imgs.length, recipe: normalizeRecipe(parseJson(r.text)), model: r.model };
    } catch (e) { return { images: imgs.length, recipe: null, error: e.message }; }
  }));
  const ok = partial.filter(p => p.recipe).map(p => p.recipe);
  if (!ok.length) return { style, images_used: 0, batches: partial.map(p => ({ images: p.images, error: p.error })), recipe: null };
  let merged = ok[0];
  if (ok.length > 1) {
    try { merged = normalizeRecipe(parseJson((await visionJSONImages(key, [], { system: SYSTEM, prompt: mergePrompt(style, ok), budgetMs: 15000, maxTokens: 1500 })).text)); }
    catch { merged = ok[0]; }
  }
  return { style, images_used: partial.reduce((a, p) => a + p.images, 0), batches: partial.map(p => ({ images: p.images, model: p.model, error: p.error })), recipe: merged };
}

module.exports = { extractStyle, normalizeRecipe, batchPrompt, mergePrompt, RECIPE_KEYS, CATEGORIES };
