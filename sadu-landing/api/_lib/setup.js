// sadu — catalogue for the "setup" focus (gaming / desk setups). One source of truth for:
//   - the design prompt (api/design.js)
//   - the AI's choice of space and style (api/_lib/roomAnalysis.js)
// Styles are distilled from the private references in sadu-refs (batches 5–9, images 51–71).

// Space types: what the photo shows. `prompt` goes to the image model, `hint` to the vision model.
const SPACES = {
  setup_corner: {
    ar: "ركن سيت أب",
    prompt: "a desk setup corner inside a bedroom",
    hint: "a corner or wall inside a bedroom (a bed or bedroom furniture is visible or likely) where a gaming / desk setup is or will be"
  },
  gaming_room: {
    ar: "غرفة ألعاب",
    prompt: "a dedicated gaming room",
    hint: "a room used mainly for gaming or streaming: desk setup, TV and console wall, sofa, no bed as the focus"
  },
  home_office: {
    ar: "مكتب منزلي",
    prompt: "a home office desk setup",
    hint: "a study or work space at home: desk for work or study, shelves, a calmer and more professional use"
  }
};

// Styles. `prompt` is the full look for the image model; `hint` tells the vision model when it fits.
const STYLES = {
  night_setup: {
    ar: "ركن ليلي",
    hint: "dark, calm and mature: suits rooms with little daylight, dark existing walls or floors, small spaces, people who want a cosy night mood",
    prompt: "dark night desk setup style: charcoal, matte black and dark grey walls; a desk with a grey microcement or concrete-texture top and a large grey leather desk mat; " +
      "a slim light bar on top of the monitor; one or two warm amber LED light panels in a geometric arrow or line shape on the wall behind the desk; dim, warm and moody lighting; " +
      "one large monitor and a second vertical monitor; a grey and black mechanical keyboard with an aluminium knob; a black PC tower with a glass side; small decor: silver astronaut figure, black die-cast cars, a speckled ceramic mug, a glass pour-over coffee carafe; tidy, no clutter"
  },
  white_blue: {
    ar: "أبيض وأزرق",
    hint: "bright, fresh and youthful: suits white or light walls, daylight, teenagers and students, small bedrooms that should feel bigger",
    prompt: "white and blue gaming setup style: white desk and white walls with white 3D geometric diamond wall panels behind the desk, lit from below with warm light so the facets cast shadows; " +
      "a royal-blue LED strip under the desk edge and behind the monitor; a white pegboard on the wall holding two headphones, a small shelf and a white LED digital clock; " +
      "a curved monitor on an arm with a light bar, a large desk mat with a blue and white Japanese wave pattern, a white game controller, a microphone on a boom arm, a small succulent in a white pot, " +
      "a glowing moon lamp, two framed black-and-white film-style posters without readable titles; clean and organised"
  },
  neon_purple: {
    ar: "نيون بنفسجي",
    hint: "bold and colourful: suits a full gaming room or a young person's room, white walls that can take coloured light, people who want a party / streamer vibe",
    prompt: "purple neon gaming room style: white walls washed with purple, magenta and electric-blue light; an aurora projector casting pink and blue light waves on the ceiling; " +
      "a vertical column of triangular blue LED light panels on the wall; a dark wood desk with an ultrawide curved monitor, a second vertical monitor and a large orange-red desk mat; " +
      "a white glass-panel PC case; a large wall-mounted TV with orange backlight above a white low TV unit with drawers and a console; a floor lamp with a glowing shade; " +
      "a light grey sectional sofa with cushions and a red heart pillow, a round black metal side table; large framed black-and-white wall art and posters leaning on the floor; a tall faux olive tree in the corner"
  },
  rgb_setup: {
    ar: "RGB متغيّر",
    hint: "organised and playful: suits people who like changing colours, rooms with a wall that can take shelves and panels, gamers who want everything on display",
    prompt: "RGB gaming setup style: white 3D geometric diamond wall panels behind the desk; RGB light bars mounted on the wall in a zig-zag mountain line above a wide white floating shelf; " +
      "small round puck spotlights under the shelf; trailing artificial plants hanging from both ends of the shelf; a flexible neon rope light and a neon cloud-and-lightning sign on a white pegboard; " +
      "the pegboard holds headphones, keychains and a white LED digital clock; a light grey marble-texture desk mat, a compact white mechanical keyboard, a white monitor with a light bar, " +
      "an RGB microphone on a boom arm, a headphone stand, a controller charging dock and a white game console; all lighting in one colour theme (cyan, purple or magenta)"
  },
  grey_tech: {
    ar: "رمادي تقني",
    hint: "mature, clean and premium: suits grey or neutral existing walls and floors, adults, work-and-play setups, people who want it tidy and technical",
    prompt: "grey tech setup style: dark grey walls, grey wood-look floor; a long floating wall-mounted desk with a grey concrete-texture top and metal brackets; " +
      "clean white light only: white triangular LED panels forming a hexagon pattern on the wall with white hexagonal light bars around them; a light bar on the monitor and a soft white glow behind the desk; " +
      "an ultrawide curved monitor with a second monitor on arms, a podcast microphone and an audio mixer on arms; a white glass PC case with white fans and a little amber accent light; " +
      "a large white pegboard displaying keyboards, headphones, controllers and mice on a small shelf; white floating shelves with a few figures; a grey ergonomic mesh office chair; a marble-pattern desk mat; very tidy and cable-managed"
  }
};

// Preservation rule shared by every design request.
const KEEP = "Keep the exact same room architecture: the position and size of walls, windows, doors, ceiling height, room shape, camera angle and perspective must stay identical. " +
  "You may change wall finishes (paint, stick-on 3D wall panels, LED light panels), the desk, chair, shelves, pegboards, electronics, decor, textiles and lighting. " +
  "If there is no desk, place the setup against the most suitable wall without blocking any window or door. " +
  "Remove any people. No brand logos and no readable text on screens, posters or devices; screens show abstract colourful wallpapers. " +
  "Photorealistic interior photograph, high detail, natural proportions.";

function buildPrompt(style, space) {
  const s = STYLES[style], p = SPACES[space];
  return `Redesign ${p ? p.prompt : "this space as a desk setup"} in ${s.prompt}. ${KEEP}`;
}

module.exports = { SPACES, STYLES, KEEP, buildPrompt };
