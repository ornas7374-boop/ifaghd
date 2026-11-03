// sadu — strict-mode prompts for the evaluation (methods A and C).
// Strict mode: only movable interior elements change. No wall finishes, no ceiling work,
// no floor replacement. Each style is expressed through furniture, textiles, freestanding
// and plug-in lighting, rugs, curtains, art and decor only.

const STRICT_RULES = "This is a photo of a real, existing room. Furnish and decorate THIS room only. " +
  "Do not change the architecture in any way: keep every wall, window, door, the ceiling, the floor surface, " +
  "columns and built-in elements exactly where and as they are, with the same size, shape, colour and finish. " +
  "Keep the same camera position, angle, lens and framing; do not crop, zoom, widen or rotate the view; the room must not look bigger or smaller. " +
  "Do not add or remove windows or doors, do not change the view through the windows, do not add ceiling coves, panels, beams or lights built into the ceiling, " +
  "do not repaint or panel the walls, do not replace the floor. " +
  "You may only add, remove, replace or rearrange movable items: furniture, rugs on top of the floor, curtains, lamps (floor, table, wall-plug-in or pendant), " +
  "art, mirrors, shelves standing or hung on the wall, plants, textiles and decor. Keep doors and walkways clear. " +
  "The result must look like a realistic photograph of the same room after furnishing.";

const STYLES = {
  warm_luxury: {
    name: "فخامة دافئة",
    look: "warm modern luxury: cream, beige and taupe upholstery in boucle and velvet, walnut or light oak furniture, " +
      "marble-topped tables, brushed gold and brass accents, curved and rounded furniture, one muted accent colour (olive or sage), " +
      "a large textured cream rug, layered sheer and linen curtains, a sculptural gold ring pendant or floor lamps"
  },
  night_luxury: {
    name: "فخامة ليلية",
    look: "night luxury: charcoal, black and warm grey furniture, deep velvet and wool textiles, dark oak or black marble-topped tables, " +
      "warm low lighting from floor and table lamps and LED strips fixed on furniture only, dark floor-length curtains with a sheer layer, " +
      "a large dark plush rug, minimal decor"
  }
};

const ROOM_PIECES = {
  bedroom: "a bed with an upholstered headboard, two bedside tables with lamps, a bench or armchair, a rug under the bed, curtains",
  living: "a sofa and armchairs, a coffee table, a TV console standing against the wall, a rug, floor lamps, curtains",
  majlis: "low Arabic-style sofas along the walls, small coffee tables, a large rug, floor lamps, curtains",
  kitchen: "bar stools at the existing counter or island, a small dining table if space allows, pendant lights hung from existing points, decor on open surfaces; do not replace cabinets, counters or appliances",
  dining: "a dining table with upholstered chairs, a sideboard against the wall, a pendant light over the table, a rug",
  bathroom: "towels, a freestanding stool or tray, plants, a framed mirror only where a mirror already exists; do not change fixtures, tiles or the shower",
  office: "a desk facing a suitable wall, an ergonomic chair, shelving standing against the wall, a desk lamp, a rug",
  other: "furniture that suits the room's evident purpose"
};

function promptA(style, room) {
  const s = STYLES[style], pieces = ROOM_PIECES[room] || ROOM_PIECES.other;
  return `${STRICT_RULES} Style: ${s.look}. Suggested pieces for this ${room}: ${pieces}.`;
}

// Method C fills only the editable mask; the instruction describes what goes there.
function promptC(style, room) {
  const s = STYLES[style], pieces = ROOM_PIECES[room] || ROOM_PIECES.other;
  return `Photorealistic interior photograph. Furnish this ${room} with ${pieces}, in ${s.look}. ` +
    "Match the room's existing perspective, light direction and shadows exactly; the new furniture must sit naturally on the existing floor.";
}

module.exports = { STYLES, ROOM_PIECES, promptA, promptC, STRICT_RULES };
