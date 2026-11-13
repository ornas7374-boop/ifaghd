// sadu Planning Engine — shared vocabulary and helpers.
// Coordinates are normalised image coordinates: x from 0 (left edge) to 1 (right edge), y from 0 (top)
// to 1 (bottom). A single photo has no scale, so nothing here is in centimetres unless it is marked
// "estimated" and says what the estimate is based on.

const WALLS = ["left", "back", "right"];
const CERTAINTY = ["confirmed", "estimated", "unknown"];
const SIZE_CLASSES = ["small", "medium", "large"];
const USES = ["gaming", "streaming", "work", "study", "mixed"];

// Typical real dimensions per size class (estimates only; used when the photo gives no scale).
const SIZE_DEFAULTS_M = { small: { width: 2.8, depth: 3.0 }, medium: { width: 3.6, depth: 3.8 }, large: { width: 4.6, depth: 4.8 } };

// Colour words the customer may use (Arabic and English) -> one canonical English name.
const COLOURS = {
  blue: ["blue", "أزرق", "ازرق", "زرقاء", "زرقا", "كحلي", "navy"], cyan: ["cyan", "سماوي", "تركواز", "turquoise"],
  purple: ["purple", "بنفسجي", "بنفسجية", "موف", "violet"], pink: ["pink", "وردي", "وردية", "زهري", "magenta"],
  red: ["red", "أحمر", "احمر", "حمراء"], orange: ["orange", "برتقالي", "برتقالية"], yellow: ["yellow", "أصفر", "اصفر", "صفراء"],
  green: ["green", "أخضر", "اخضر", "خضراء"], white: ["white", "أبيض", "ابيض", "بيضاء", "بيضا"], black: ["black", "أسود", "اسود", "سوداء"],
  grey: ["grey", "gray", "رمادي", "رمادية"], gold: ["gold", "ذهبي", "ذهبية"], beige: ["beige", "بيج"], wood: ["wood", "خشب", "خشبي", "خشبية"],
  warm_white: ["warm white", "دافئ", "دافية", "دافئة", "warm"]
};

const clamp01 = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null; };
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
const text = (v, n = 160) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

/** A horizontal span [x0, x1] on a wall, ordered and clamped; null if unusable. */
function span(o) {
  if (!o) return null;
  let a = clamp01(o.x0), b = clamp01(o.x1);
  if (a == null || b == null) return null;
  if (a > b) [a, b] = [b, a];
  return b - a < 0.005 ? null : { x0: a, x1: b };
}
const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
const width = (s) => (s ? s.x1 - s.x0 : 0);

/** Where on the image a span sits, in words an image model understands. */
function positionWords(s) {
  if (!s) return "";
  const c = (s.x0 + s.x1) / 2;
  return c < 0.38 ? "on the left side" : c > 0.62 ? "on the right side" : "in the centre";
}

/** Canonical colours found in a piece of text (customer words, any language). */
function coloursIn(str) {
  const s = ` ${String(str || "").toLowerCase()} `;
  const found = [];
  for (const [name, words] of Object.entries(COLOURS)) if (words.some(w => s.includes(w.toLowerCase()))) found.push(name);
  return found;
}

module.exports = { WALLS, CERTAINTY, SIZE_CLASSES, USES, SIZE_DEFAULTS_M, COLOURS, clamp01, pick, text, span, overlap, width, positionWords, coloursIn };
