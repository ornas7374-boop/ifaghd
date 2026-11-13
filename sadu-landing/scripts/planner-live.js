#!/usr/bin/env node
// REAL planner test (not part of `npm test`): runs Gemini perception + the Planning Engine on a local photo.
//   GEMINI_API_KEY=... node scripts/planner-live.js <photo.jpg> "<request>" <budget_sar> > plan.json
// Needs network access to generativelanguage.googleapis.com. Costs nothing on the Gemini free tier.
const fs = require("fs");
const sharp = require("sharp");
const { perceive } = require("../api/_lib/planner/perceive");
const { planDesign } = require("../api/_lib/planner");

(async () => {
  const [photo, desc = "", budget = ""] = process.argv.slice(2);
  if (!photo || !process.env.GEMINI_API_KEY) { console.error("usage: GEMINI_API_KEY=... node scripts/planner-live.js photo.jpg \"request\" 2000"); process.exit(2); }
  const jpg = await sharp(fs.readFileSync(photo)).rotate().resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 88 }).toBuffer();
  const brief = { description: desc, budget_sar: Number(budget) || null, changes: [] };
  const per = await perceive(process.env.GEMINI_API_KEY, `data:image/jpeg;base64,${jpg.toString("base64")}`, brief);
  const plan = planDesign({ ...per, brief });
  console.log(JSON.stringify({ model: per.model, raw_perception: per, plan }, null, 2));
  console.error(`validation: ${plan.validation_results.passed ? "passed" : "failed"}; desk: ${plan.spatial_plan.desk ? plan.spatial_plan.desk.wall : "none"}`);
})().catch(e => { console.error(e.message, e.detail || ""); process.exit(1); });
