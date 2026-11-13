// sadu Planning Engine — D. Design Decision Engine.
// Decides WHAT goes into the room and why: the item list (essential vs optional), target sizes,
// colour palette, lighting layers and the style, from the room (size, light, surfaces) and the intent
// (use, colours, devices, minimal...). Every decision carries its reason.

const ITEMS = {
  desk:            { cat: "desk",            anchor: "floor", label: "desk" },
  chair:           { cat: "chair",           anchor: "floor", label: "chair" },
  monitor:         { cat: "monitor",         anchor: "desk",  label: "main monitor" },
  second_monitor:  { cat: "monitor",         anchor: "desk",  label: "second monitor" },
  monitor_arm:     { cat: "monitor_arm",     anchor: "desk",  label: "monitor arm" },
  keyboard:        { cat: "keyboard",        anchor: "desk",  label: "keyboard" },
  mouse:           { cat: "mouse",           anchor: "desk",  label: "mouse" },
  mousepad:        { cat: "mousepad",        anchor: "desk",  label: "large desk mat" },
  monitor_light:   { cat: "lighting",        anchor: "desk",  label: "monitor light bar" },
  desk_lamp:       { cat: "desk_lamp",       anchor: "desk",  label: "desk lamp" },
  accent_light:    { cat: "accent_lighting", anchor: "wall",  label: "wall LED light bars" },
  key_light:       { cat: "key_light",       anchor: "floor", label: "key light on a stand" },
  microphone:      { cat: "microphone",      anchor: "desk",  label: "microphone on a boom arm" },
  webcam:          { cat: "webcam",          anchor: "desk",  label: "webcam at eye level" },
  wall_storage:    { cat: "shelf",           anchor: "wall",  label: "wall pegboard and floating shelf" },
  drawers:         { cat: "storage",         anchor: "floor", label: "drawer unit under the desk" },
  plant:           { cat: "plants",          anchor: "desk",  label: "small plant" },
  wall_art:        { cat: "decor",           anchor: "wall",  label: "framed art print" },
  wall_treatment:  { cat: "wall_panels",     anchor: "wall",  label: "wall treatment behind the desk" }
};

const STYLE_FOR_COLOUR = { blue: "white_blue", cyan: "rgb_setup", purple: "neon_purple", pink: "neon_purple", red: "night_setup", orange: "night_setup",
  yellow: "night_setup", gold: "night_setup", warm_white: "night_setup", black: "night_setup", grey: "grey_tech", white: "grey_tech", green: "rgb_setup", wood: "night_setup", beige: "grey_tech" };
const STYLE_ACCENT = { night_setup: "warm amber", white_blue: "blue", neon_purple: "purple", rgb_setup: "cyan", grey_tech: "cool white" };
const DESK_WIDTH_CM = { small: 120, medium: 140, large: 160 };

function isLight(desc) { return /white|off-white|cream|beige|light|ivory|أبيض|بيج|فاتح/i.test(desc || ""); }

/**
 * @param {object} room   understandRoom() output
 * @param {object} intent understandIntent() output
 * @param {{suggestedStyle?: string, styles: object}} opts  vision model's style pick + the style catalogue
 */
function decide(room, intent, opts = {}) {
  const rationale = [];
  const why = (decision, reason) => rationale.push({ decision, why: reason });
  const size = room.size.class;
  const use = intent.use;
  const items = [];
  const add = (key, priority, reason, spec = {}) => { if (!items.some(i => i.key === key)) items.push({ key, ...ITEMS[key], priority, reason, spec }); };
  const owns = (d) => intent.owned.includes(d);
  const only = intent.changes;

  // --- furniture: the base of every setup
  if (only.includes("furniture") || only.includes("full_setup")) {
    add("desk", "essential", "the base of the setup", { width_cm: DESK_WIDTH_CM[size], depth_cm: size === "small" ? 60 : 70 });
    add("chair", "essential", use === "work" || use === "study" ? "comfort comes first for long work hours (guide: chair first)" : "needed for every desk setup");
    if (!owns("monitor")) add("monitor", "essential", "the screen is what the user looks at all day");
    if (intent.devices.includes("two_monitors") || (use === "streaming" && size !== "small")) add("second_monitor", "optional", intent.devices.includes("two_monitors") ? "asked for two monitors" : "streamers use a second screen for chat and tools");
    if (size === "small") add("monitor_arm", "essential", "small room: an arm frees desk depth so a 60 cm desk is enough (guide)");
    else add("monitor_arm", "optional", "frees desk space");
    add("keyboard", "essential", "primary reach zone"); add("mouse", "essential", "primary reach zone");
    add("mousepad", use === "gaming" ? "essential" : "optional", use === "gaming" ? "gaming: a large mouse pad matters more than accessories (guide)" : "protects the desk");
    if (use === "work" || use === "study") add("drawers", "optional", "every item needs a home; keeps the desk clear for focus");
  }
  // --- lighting: layers (guide), never the ceiling light alone
  if (only.includes("lighting") || only.includes("full_setup")) {
    add("monitor_light", "essential", "task light on the desk without screen glare (lighting in layers)");
    add("desk_lamp", use === "work" || use === "study" ? "essential" : "optional", "second task-light layer");
    const accentWanted = intent.accents.length > 0 || use === "gaming" || use === "streaming";
    if (accentWanted && !(intent.minimal && !intent.accents.length)) add("accent_light", intent.accents.length ? "essential" : "optional", intent.accents.length ? `asked for ${intent.accents.join(" and ")} light` : "accent light gives a gaming setup its mood");
  }
  if (use === "streaming") {
    add("key_light", "essential", "streaming: lighting comes first (guide: light before camera)");
    add("microphone", "essential", "streaming: a close microphone on a boom arm");
    if (!owns("camera")) add("webcam", "essential", "streaming needs a camera at eye level");
  }
  // --- storage and decor depend on room size
  if (only.includes("decor") || only.includes("full_setup") || only.includes("furniture")) {
    add("wall_storage", size === "small" ? "essential" : "optional", size === "small" ? "small room: vertical storage keeps the floor clear" : "keeps accessories off the desk");
    if (!intent.minimal) add("plant", "optional", "a living touch at the edge of the desk");
    if (size !== "small" && !intent.minimal) add("wall_art", "optional", "personal touch on the wall, outside the main view (guide)");
  }
  if (intent.allow_wall) add("wall_treatment", "optional", "the customer allowed a wall change behind the desk");
  if (size === "small") why("fewer items", "small room: no floor-standing extras, at most one decor piece, vertical storage");
  if (intent.minimal) why("calm look", "the customer asked for a simple, calm design");
  for (const d of intent.owned) why(`keep own ${d}`, "the customer already has it; it is placed, not bought");
  if (intent.devices.includes("computer") || intent.devices.includes("console")) why("place the customer's PC / console", "devices are placed with open airflow, not bought");

  // --- style: the customer's colour wins over the model's pick
  const styles = opts.styles || {};
  let style = opts.suggestedStyle && styles[opts.suggestedStyle] ? opts.suggestedStyle : Object.keys(styles)[0];
  if (intent.accents[0] && STYLE_FOR_COLOUR[intent.accents[0]] && styles[STYLE_FOR_COLOUR[intent.accents[0]]] && STYLE_FOR_COLOUR[intent.accents[0]] !== style) {
    why("style", `changed from ${style} to ${STYLE_FOR_COLOUR[intent.accents[0]]} to match the requested ${intent.accents[0]}`);
    style = STYLE_FOR_COLOUR[intent.accents[0]];
  } else why("style", `${style}: fits the room as analysed`);

  // --- palette: keep the room's surfaces, choose furniture colours that sit with them, 1-2 accents
  const lightRoom = isLight(room.surfaces.walls) || isLight(room.surfaces.floor);
  const furnitureColour = intent.minimal ? (lightRoom ? "white" : "black") : style === "white_blue" || style === "grey_tech" ? (lightRoom ? "white" : "grey") : lightRoom ? "white or light wood" : "black";
  const accents = (intent.accents.length ? intent.accents : [STYLE_ACCENT[style]]).slice(0, intent.minimal ? 1 : 2);
  const palette = { keep: { floor: room.surfaces.floor || "existing floor", walls: room.surfaces.walls || "existing walls", ceiling: room.surfaces.ceiling || "existing ceiling" },
    furniture: furnitureColour, accents, rule: "large surfaces stay calm; accents only in lights and small items" };
  why("furniture colour", `${furnitureColour}: sits with the existing ${lightRoom ? "light" : "dark"} walls and floor, which are kept`);

  // --- lighting plan (layers + direction relative to the window)
  const win = room.light.window_side;
  const keySide = win === "left" ? "right" : win === "right" ? "left" : "left";
  const lighting = {
    ambient: room.light.artificial.length ? `keep existing: ${room.light.artificial.join(", ")}` : "existing ceiling light",
    natural: win !== "none" ? `window on the ${win}: desk planned so the window is to the side of the screen` : "no window seen",
    task: items.some(i => i.key === "desk_lamp") ? "desk lamp, neutral white (~4000K) for work" : null,
    monitor: items.some(i => i.key === "monitor_light") ? "light bar on top of the monitor" : null,
    bias: intent.accents.length ? `soft ${intent.accents[0]} glow behind the monitor (customer's choice)` : "soft white glow behind the monitor (6500K, guide)",
    accent: items.some(i => i.key === "accent_light") ? `${accents.join(" and ")} wall light bars above the desk` : null,
    streaming: use === "streaming" ? { key: `key light on the ${keySide} of the camera, 30-45 degrees and above eye level`, fill: "softer light on the opposite side", back: "back light behind the user" } : null
  };
  if (intent.accents.length && use !== "work") why("bias light colour", "the guide prefers white behind the screen; the customer's colour wins");

  return { style, items, palette, lighting, rationale, desk: items.find(i => i.key === "desk") ? items.find(i => i.key === "desk").spec : null };
}

module.exports = { decide, ITEMS, STYLE_FOR_COLOUR, DESK_WIDTH_CM };
