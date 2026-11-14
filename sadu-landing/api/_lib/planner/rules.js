// sadu Planning Engine — numeric design rules with their sources, in one place.
// Adapted (MIT) from: planhaus scripts/rules/clearances.yaml (Josef Gattermayer, 2026) and the
// interior-design-expert skill references (Erich Owens, 2025), plus the owner's setup guide.
// Each rule keeps its original id so a check can cite it.
const RULES = {
  "WIN-01":   { name: "access to operable windows", min_cm: 60, ideal_cm: 75, source: "planhaus; Panero & Zelnik, Human Dimension & Interior Space" },
  "CIRC-02":  { name: "secondary path between furniture", min_cm: 60, ideal_cm: 75, source: "planhaus; Karlen, Space Planning Basics" },
  "DESK-01":  { name: "desk chair area", min_cm: 90, source: "interior-design-expert space-planning (desk chair area 900x900 mm)" },
  "GEOM-01":  { name: "items do not overlap", source: "planhaus base validator" },
  "LUX-AMB":  { name: "ambient light", lux: [150, 300], source: "IES via interior-design-expert" },
  "LUX-TASK": { name: "task light on the desk", lux: [300, 500], source: "IES via interior-design-expert (reading/detailed work)" },
  "LUX-FACE": { name: "light on the face for camera", lux: [300, 400], source: "IES via interior-design-expert (video calls: 300+ lux, even)" },
  "COL-60":   { name: "60-30-10 colour proportion", shares: { dominant: 60, secondary: 30, accent: 10 }, source: "planhaus concept skill" }
};
module.exports = { RULES };
