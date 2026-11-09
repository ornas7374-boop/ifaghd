// ADE20K (SceneParsing, 150 classes) — standard class order, 0-indexed.
// Used to read a per-pixel class-index map from a segmentation model.
// IMPORTANT: confirm against the chosen model's own id2label during the probe step
// (api/eval/probe.js). Models trained on ADE20K normally use exactly this order, but some
// shift indices by one (0 = "other"). The probe reports the classes it actually sees.

const ADE20K = [
  "wall", "building", "sky", "floor", "tree", "ceiling", "road", "bed", "windowpane", "grass",
  "cabinet", "sidewalk", "person", "earth", "door", "table", "mountain", "plant", "curtain", "chair",
  "car", "water", "painting", "sofa", "shelf", "house", "sea", "mirror", "rug", "field",
  "armchair", "seat", "fence", "desk", "rock", "wardrobe", "lamp", "bathtub", "railing", "cushion",
  "base", "box", "column", "signboard", "chest of drawers", "counter", "sand", "sink", "skyscraper", "fireplace",
  "refrigerator", "grandstand", "path", "stairs", "runway", "case", "pool table", "pillow", "screen door", "stairway",
  "river", "bridge", "bookcase", "blind", "coffee table", "toilet", "flower", "book", "hill", "bench",
  "countertop", "stove", "palm", "kitchen island", "computer", "swivel chair", "boat", "bar", "arcade machine", "hovel",
  "bus", "towel", "light", "truck", "tower", "chandelier", "awning", "streetlight", "booth", "television receiver",
  "airplane", "dirt track", "apparel", "pole", "land", "bannister", "escalator", "ottoman", "bottle", "buffet",
  "poster", "stage", "van", "ship", "fountain", "conveyer belt", "canopy", "washer", "plaything", "swimming pool",
  "stool", "barrel", "basket", "waterfall", "tent", "bag", "minibike", "cradle", "oven", "ball",
  "food", "step", "tank", "trade name", "microwave", "pot", "animal", "bicycle", "lake", "dishwasher",
  "screen", "blanket", "sculpture", "hood", "sconce", "vase", "traffic light", "tray", "ashcan", "fan",
  "pier", "crt screen", "plate", "monitor", "bulletin board", "shower", "radiator", "glass", "clock", "flag"
];

// How each class is treated for preservation.
//  wall / ceiling / floor / window / door / column / stairs / builtin : architecture
//  view    : seen THROUGH a window (sky, buildings, trees...) — protected as part of the window
//  movable : furniture, textiles, decor, appliances, people — editable, and an occluder in the original
const ROLE = {
  wall: "wall", ceiling: "ceiling", floor: "floor",
  windowpane: "window", door: "door", "screen door": "door",
  column: "column", stairs: "stairs", stairway: "stairs", step: "stairs", railing: "stairs", bannister: "stairs",
  fireplace: "builtin", radiator: "builtin",
  sky: "view", building: "view", tree: "view", house: "view", skyscraper: "view", mountain: "view", hill: "view",
  road: "view", sidewalk: "view", grass: "view", field: "view", palm: "view", sea: "view", water: "view",
  river: "view", lake: "view", tower: "view", streetlight: "view", bridge: "view", earth: "view", land: "view",
  path: "view", sand: "view", awning: "view", car: "view", fence: "view"
};

function roleOf(name) { return ROLE[name] || "movable"; }

module.exports = { ADE20K, roleOf };
