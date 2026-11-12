// sadu — how a setup designer thinks. Distilled from the owner's guide "دليل تصميم السيت اب"
// (sadu-refs/setup-design-guide.md: OSHA, ANSI/HFES, Cornell, EN 12464-1, Shure, Genelec + YouTube,
// TikTok and Reddit research). Used by:
//   - the analysis (decide use, desk placement, priorities)      -> ANALYSIS_RULES
//   - the image prompt (short layout rules the editor can follow) -> layoutRules()
//   - the shopping list (what to buy first)                       -> BUY_PRIORITY
// Numbers marked (official) come from standards; the rest are practical starting points.

const ANALYSIS_RULES = `DESIGN PRINCIPLES (follow them like a professional setup designer):
- Design for use first, looks last. Decide what happens here daily: work/study, gaming, streaming, or mixed.
- Desk placement: the monitor should be PERPENDICULAR to the window (window to the side), never facing the window and never with the window behind the monitor or behind the user. Do not block windows, doors or the door swing. Keep the desk away from the walkway. Prefer a wall near power outlets.
- Clearance: about 90-107 cm free behind the chair to push back and stand up.
- Desk size (official ANSI): width 152 cm recommended, 117 cm minimum; depth 70-80 cm for a 27" monitor, or 60 cm with a monitor arm. A bigger desk is not better; extra space collects clutter.
- Monitor: main screen straight in front, top edge at or below eye level, 50-100 cm away (official OSHA); a second screen angled 30-45 degrees to the side, never side-by-side split in the middle and never stacked.
- Reach zones: keyboard and mouse centred 30-40 cm from the edge; daily items within arm's reach; lights, plants and decor only at the edges and on the walls. Keep the main area clear.
- Lighting in layers: general room light + a desk/task light + a monitor light bar or soft bias light behind the screen. Never rely on the ceiling light alone. Use one or two accent colours at most; large surfaces (walls, desk) stay calm.
- Storage: every item needs a home (drawers, shelf, pegboard); no clutter on the desk.
- PC: in open airflow, not inside a closed cabinet, not under the AC's direct airflow; decor must not block vents.
- Cables: hidden in a tray under the desk.
- Streaming: key light 30-45 degrees to one side of the camera and above eye level, a softer fill light on the other side, a back light behind; microphone on a boom arm close to the mouth; camera at eye level.`;

// Kept short on purpose: image-model prompts have a limited length.
function layoutRules(use) {
  const base = "Professional layout: desk on a wall with the window to the side; main monitor centred, top at eye level; second monitor angled, not stacked; keyboard and mouse centred; decor only at the edges; cables hidden; PC in open air; one or two accent colours; monitor light bar and a desk lamp.";
  return use === "streaming" ? `${base} Add a key light on a stand to one side, a microphone on a boom arm and a webcam at eye level.` : base;
}

// What to buy first, by setup type (from the guide).
const BUY_PRIORITY = {
  work: ["chair", "monitor", "monitor_arm", "desk", "keyboard", "mouse", "lighting", "storage", "decor"],
  gaming: ["desk", "monitor", "mouse", "mousepad", "keyboard", "chair", "lighting", "decor"],
  streaming: ["lighting", "microphone", "monitor_arm", "camera", "desk", "monitor", "chair", "decor"],
  mixed: ["chair", "desk", "monitor", "keyboard", "mouse", "lighting", "storage", "decor"]
};
const USES = Object.keys(BUY_PRIORITY);

module.exports = { ANALYSIS_RULES, layoutRules, BUY_PRIORITY, USES };
