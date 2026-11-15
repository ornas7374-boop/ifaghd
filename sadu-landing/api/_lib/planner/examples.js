// sadu Planning Engine — real-setup examples, distilled from the owner's private reference images
// (sadu-refs/README.md, batches 5-10, images 51-76). The images themselves are never sent anywhere:
// only these short descriptions are used, to make each planned item look like the real setups.
// {accent} is replaced with the plan's accent colour(s); {furniture} with the furniture colour.
// Only items that are already in the plan get a detail: the examples never add items on their own.

const STYLE_EXAMPLES = {
  night_setup: {
    refs: [51, 52, 54, 55],
    mood: "dim, calm and focused night corner, tidy with no clutter",
    items: {
      accent_light: "geometric hexagon LED light panels glowing soft {accent}",
      monitor_light: "slim light bar on top of the monitor",
      mousepad: "large dark grey leather desk pad lying on the desktop",
      keyboard: "grey and black mechanical keyboard with an aluminium knob",
      desk: "{furniture} desk with a grey concrete-look top",
      plant: "small speckled ceramic pot with a plant",
      wall_art: "small framed black and white print"
    }
  },
  white_blue: {
    refs: [58, 59, 60],
    mood: "bright, young and tidy, white with royal blue light",
    items: {
      accent_light: "{accent} LED strip under the front edge of the desk and behind it, plus thin {accent} light bars on the wall",
      wall_storage: "white pegboard with headphones hanging, a small shelf and a white LED digital clock",
      mousepad: "large blue and white Japanese wave pattern desk pad lying on the desktop under the keyboard",
      monitor: "curved monitor",
      monitor_light: "light bar on top of the curved monitor",
      plant: "small cactus in a white pot",
      wall_art: "two black and white movie posters"
    },
    wall_option: "white 3D diamond-pattern wall panels lit warm from below"
  },
  neon_purple: {
    refs: [61, 62, 63],
    mood: "bold night gaming corner with neon colour",
    items: {
      accent_light: "{accent} triangular light panels on the wall above the desk",
      mousepad: "large bright orange desk pad lying on the desktop",
      keyboard: "white keyboard",
      monitor: "wide curved monitor",
      wall_art: "large frame with a handwritten quote",
      plant: "small artificial olive plant"
    }
  },
  rgb_setup: {
    refs: [67, 68, 69],
    mood: "organised gaming corner whose light colour can change",
    items: {
      accent_light: "{accent} LED light bars in a zig-zag mountain line on the wall above the desk",
      wall_storage: "wide white shelf above the desk with small trailing plants at both ends, and a white pegboard with headphones and an LED clock",
      monitor: "white monitor with a light bar",
      keyboard: "small white keyboard",
      microphone: "RGB microphone on a boom arm",
      wall_art: "small cloud and lightning neon sign"
    },
    wall_option: "white 3D diamond-pattern wall panels that take the colour of the light"
  },
  grey_tech: {
    refs: [70, 71],
    mood: "mature, clean and technical, grey with white light",
    items: {
      accent_light: "white hexagon light bars around triangle light panels on the wall",
      desk: "{furniture} floating wall-mounted desk with a concrete-look top",
      chair: "grey mesh ergonomic chair",
      wall_storage: "large white pegboard showing keyboards, headphones and controllers, with white floating shelves",
      mousepad: "marble-pattern desk pad lying on the desktop",
      monitor: "wide curved monitor"
    }
  }
};

// The Saudi touch seen in references 74-76: only when the customer asks for it (سدو / sadu).
const SADU_TOUCH = {
  refs: [74, 75, 76],
  items: {
    mousepad: "large Sadu-pattern desk pad (traditional red, black and white Bedouin weave) lying on the desktop",
    wall_art: "framed Sadu weave pattern in red, black and white"
  }
};
const SADU_WORDS = /سدو|سدوي|sadu/i;

/** Pick the examples for a plan: the style's real setups, plus the Sadu touch when asked. */
function pickExamples(style, intent, palette) {
  const base = STYLE_EXAMPLES[style] || STYLE_EXAMPLES.grey_tech;
  const sadu = SADU_WORDS.test(String(intent.request_text || intent.request || ""));
  const accent = (palette.accents || []).join(" and ") || "white";
  const fill = (s) => s.replace(/\{accent\}/g, accent).replace(/\{furniture\}/g, palette.furniture || "white");
  const items = {};
  for (const [k, v] of Object.entries(base.items)) items[k] = fill(v);
  if (base.wall_option) items.wall_treatment = fill(base.wall_option); // used only if the customer allowed a wall change
  if (sadu) for (const [k, v] of Object.entries(SADU_TOUCH.items)) items[k] = fill(v);
  return { style, refs: sadu ? base.refs.concat(SADU_TOUCH.refs) : base.refs.slice(), mood: base.mood, items, wall_option: base.wall_option || null, sadu };
}

module.exports = { STYLE_EXAMPLES, SADU_TOUCH, pickExamples };
