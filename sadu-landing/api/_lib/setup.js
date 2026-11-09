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
// Styles. `prompt` = what to ADD (furniture, gear, lighting, decor) and never touches the room's
// surfaces; `wall` = an optional wall treatment, used only when the customer asks for a wall change.
// The floor is never part of a style.
const STYLES = {
  night_setup: {
    ar: "ركن ليلي",
    hint: "dark, calm and mature: suits rooms with little daylight, dark existing walls or floors, small spaces, people who want a cosy night mood",
    prompt: "a dark night desk setup: a black desk with a grey concrete-texture top and a large grey leather desk mat; one large monitor and a second vertical monitor; " +
      "a slim light bar on top of the monitor; one or two warm amber LED light bars in a geometric line shape mounted on the wall behind the desk; dim, warm, moody lighting; " +
      "a grey and black mechanical keyboard; a black PC tower with a glass side; small decor: a silver astronaut figure, black die-cast cars, a speckled ceramic mug, a glass coffee carafe; tidy, no clutter",
    wall: "matte charcoal paint on the wall behind the desk"
  },
  white_blue: {
    ar: "أبيض وأزرق",
    hint: "bright, fresh and youthful: suits white or light walls, daylight, teenagers and students, small bedrooms that should feel bigger",
    prompt: "a white and blue gaming setup: a white desk; a royal-blue LED strip under the desk edge and behind the monitor; a white pegboard mounted on the wall holding two headphones, a small shelf and a white LED digital clock; " +
      "a curved monitor on an arm with a light bar; a large desk mat with a blue and white wave pattern; a white game controller; a microphone on a boom arm; a small succulent in a white pot; " +
      "a glowing moon lamp; two small framed black-and-white posters without readable text; clean and organised",
    wall: "white 3D geometric diamond wall panels behind the desk"
  },
  neon_purple: {
    ar: "نيون بنفسجي",
    hint: "bold and colourful: suits a full gaming room or a young person's room, people who want a party / streamer vibe",
    prompt: "a purple neon gaming setup: a vertical column of triangular purple and blue LED light panels mounted on the wall; a dark wood desk with an ultrawide curved monitor, a second vertical monitor and a large orange-red desk mat; " +
      "a white glass-panel PC case with purple fans; a floor lamp with a glowing purple shade; a light grey gaming chair; a small aurora projector on the desk; " +
      "a large framed black-and-white art print hanging on the wall; a tall faux olive tree in a pot",
    wall: "a soft purple accent paint on the wall behind the desk"
  },
  rgb_setup: {
    ar: "RGB متغيّر",
    hint: "organised and playful: suits people who like changing colours, rooms with a wall that can take shelves and panels, gamers who want everything on display",
    prompt: "an RGB gaming setup: RGB light bars mounted on the wall in a zig-zag mountain line above a wide white floating shelf; small round puck lights under the shelf; " +
      "trailing artificial plants hanging from both ends of the shelf; a neon cloud-and-lightning sign on a white pegboard mounted on the wall; the pegboard holds headphones and a white LED digital clock; " +
      "a white desk with a light grey marble-texture desk mat, a compact white mechanical keyboard, a white monitor with a light bar, an RGB microphone on a boom arm, a headphone stand and a white game console; " +
      "all lighting in one colour theme (cyan, purple or magenta)",
    wall: "white 3D geometric diamond wall panels behind the desk"
  },
  grey_tech: {
    ar: "رمادي تقني",
    hint: "mature, clean and premium: suits grey or neutral existing walls and floors, adults, work-and-play setups, people who want it tidy and technical",
    prompt: "a grey tech setup: a long floating wall-mounted desk with a grey concrete-texture top and metal brackets; clean white light only: white triangular LED light panels forming a hexagon pattern mounted on the wall; " +
      "a light bar on the monitor and a soft white glow behind the desk; an ultrawide curved monitor with a second monitor on arms; a podcast microphone and an audio mixer on arms; " +
      "a white glass PC case with white fans; a large white pegboard mounted on the wall displaying keyboards, headphones and controllers; small white floating shelves with a few figures; a grey ergonomic mesh office chair; a marble-pattern desk mat; very tidy and cable-managed",
    wall: "dark grey paint on the wall behind the desk"
  }
};

const clip = (v, n = 140) => String(v || "").replace(/[\u0000-\u001f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Edit instruction for the image model. The room's surfaces are described as they are in the photo
 * (from the analysis, when available) and the model is told to keep them; the style only adds things.
 * @param {string} style  style key
 * @param {string} space  space key
 * @param {{keep?: {floor?: string, walls?: string, ceiling?: string}, allowWall?: boolean}} opts
 */
function buildPrompt(style, space, opts = {}) {
  const s = STYLES[style], p = SPACES[space];
  const k = opts.keep || {};
  const floor = clip(k.floor), walls = clip(k.walls), ceiling = clip(k.ceiling);
  const wallRule = opts.allowWall && s.wall
    ? `the walls keep their position and size; only the wall behind the desk may get ${s.wall}`
    : `every wall exactly as it is${walls ? ` (${walls})` : ""}: same paint colour and texture, no new paint, panels, slats, wallpaper or colour wash`;
  return [
    `Edit this photo of ${p ? p.prompt : "a room"}: add ${s.prompt}.`,
    "This is an edit of the existing photo, not a new room.",
    `Keep unchanged: the floor exactly as it is${floor ? ` (${floor})` : ""}: same material, colour, tile or plank pattern, grout lines and reflections, and do not add rugs or floor coverings;`,
    `${wallRule};`,
    `the ceiling exactly as it is${ceiling ? ` (${ceiling})` : ""}: same shape, height and lights;`,
    "every window and door in the same position, size and frame; the same camera angle, framing and perspective.",
    "Only add or replace: the desk, chair, monitors, computer, accessories, shelves, pegboards and light bars mounted on the existing walls, lamps, plants and decor.",
    "Lights may glow, but they must not repaint the walls or the floor.",
    "If there is no desk, place it against the most suitable wall without covering any window or door.",
    "Remove any people. No brand logos and no readable text; screens show abstract colourful wallpapers.",
    "Photorealistic interior photograph, natural proportions."
  ].join(" ");
}

module.exports = { SPACES, STYLES, buildPrompt };
