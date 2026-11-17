#!/usr/bin/env node
// ONE-TIME local script: Pinterest reference URLs (data/sadu-setup-references.json) -> Gemini (vision,
// batches of ~10) -> one text recipe per style -> data/style_presets_setup.json.
// Images are downloaded into memory only, resized, sent to Gemini and dropped: nothing is saved or served.
// Run:  GEMINI_API_KEY=... node scripts/extract-style-recipes.js
const fs = require("fs");
const path = require("path");
const { extractStyle } = require("../api/_lib/styleRecipe");

(async () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error("Set GEMINI_API_KEY first."); process.exit(1); }
  const refs = require("../data/sadu-setup-references.json");
  const out = { generated_at: new Date().toISOString(), source: "owner's Pinterest reference list (images not stored)", styles: {} };
  for (const [style, items] of Object.entries(refs.styles)) {
    process.stdout.write(`${style}: ${items.length} images... `);
    const r = await extractStyle(key, style, items.map(x => x.url));
    console.log(r.recipe ? `ok (${r.images_used} used)` : `failed ${JSON.stringify(r.batches)}`);
    out.styles[style] = { images_used: r.images_used, ...(r.recipe || {}) };
  }
  const file = path.join(__dirname, "..", "data", "style_presets_setup.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log("saved", file);
})().catch(e => { console.error(e.message, e.detail || ""); process.exit(1); });
