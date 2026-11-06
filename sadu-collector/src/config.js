// sadu collector — taxonomy, search plan and thresholds.
// Everything the collector decides on its own is driven from here, so nobody has to type queries.

// Must match sadu-landing/api/design.js (rooms and styles the generator understands).
const ROOMS = ["majlis_men", "majlis_women", "living", "bedroom", "annex", "dining", "kitchen", "bathroom", "dressing", "office"];
// Rooms a reference is classified into. Men's/women's majlis are one visual category in stock photos.
const CLASSIFY_ROOMS = ["majlis", "living", "bedroom", "dining", "kitchen", "bathroom", "dressing", "office"];
const STYLES = ["night_luxury", "warm_luxury", "quiet_luxury", "najdi", "hijazi", "gulf_modern", "classic_luxury", "neoclassic", "calm_modern", "boho_gulf", "emirati"];

// Automatic search plan: room → search terms. English, because stock sites index English tags.
const QUERY_PLAN = [
  { room: "majlis", terms: ["arabic majlis interior", "majlis sitting room", "arabic sitting room luxury", "saudi villa interior", "najdi interior design", "mashrabiya interior", "arabian living room sofas"] },
  { room: "living", terms: ["luxury living room interior", "modern villa living room", "neoclassic living room", "living room evening lighting", "minimalist living room marble"] },
  { room: "bedroom", terms: ["luxury bedroom interior", "master bedroom design", "modern bedroom led lighting", "minimal bedroom interior", "dark bedroom interior", "hotel suite bedroom"] },
  { room: "kitchen", terms: ["luxury kitchen interior", "modern kitchen island", "black kitchen design", "marble kitchen", "open plan kitchen villa"] },
  { room: "bathroom", terms: ["luxury bathroom interior", "modern bathroom marble", "bathroom freestanding bathtub", "stone bathroom spa"] },
  { room: "dining", terms: ["luxury dining room interior", "modern dining room table", "formal dining room chandelier"] },
  { room: "office", terms: ["modern home office interior", "luxury study room", "gaming room setup", "executive office interior"] },
  { room: "dressing", terms: ["walk-in closet luxury", "dressing room design", "wardrobe interior led"] }
];

const THRESHOLDS = {
  minShortSide: 1000,        // px, from the API metadata
  minAspect: 0.6,            // width / height
  maxAspect: 2.2,
  minSharpness: 0.0006,      // normalised Laplacian variance of a 256px grey copy
  minBrightness: 0.06,       // mean grey 0..1 (rejects near-black or blown-out images)
  maxBrightness: 0.97,
  minQuality: 0.55,          // vision model quality 0..1
  minRoomConfidence: 0.6,
  maxHashDistance: 8,        // Hamming distance of 64-bit dHash at or below which two images are duplicates
  allowPeople: false,        // people in frame: privacy and distraction, rejected by default
  maxImageBytes: 6 * 1024 * 1024,
  cacheTtlHours: 24
};

// Objects that must not appear in a room. A classification that contradicts itself is rejected,
// so the library never teaches the generator irrelevant furniture for a room.
const FORBIDDEN_OBJECTS = {
  kitchen: ["bed", "sofa", "couch", "toilet", "bathtub", "wardrobe", "desk"],
  bedroom: ["stove", "oven", "refrigerator", "toilet", "bathtub", "kitchen island", "dining table"],
  bathroom: ["bed", "sofa", "couch", "stove", "oven", "refrigerator", "dining table", "desk"],
  living: ["bed", "stove", "oven", "refrigerator", "toilet", "bathtub"],
  majlis: ["bed", "stove", "oven", "refrigerator", "toilet", "bathtub"],
  dining: ["bed", "toilet", "bathtub", "stove", "oven"],
  office: ["bed", "toilet", "bathtub", "stove", "oven", "refrigerator"],
  dressing: ["stove", "oven", "refrigerator", "toilet", "bathtub", "dining table"]
};

const SOURCES = {
  unsplash: { perPage: 30, hourlyLimit: 50, license: "Unsplash License", licenseUrl: "https://unsplash.com/license" },
  pexels: { perPage: 80, hourlyLimit: 200, license: "Pexels License", licenseUrl: "https://www.pexels.com/license/" }
};

// Image hosts the collector may download from (SSRF guard). Exact host names.
const IMAGE_HOSTS = ["images.unsplash.com", "images.pexels.com"];

module.exports = { ROOMS, CLASSIFY_ROOMS, STYLES, QUERY_PLAN, THRESHOLDS, FORBIDDEN_OBJECTS, SOURCES, IMAGE_HOSTS };
