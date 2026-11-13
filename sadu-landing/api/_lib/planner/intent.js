// sadu Planning Engine — B. Intent Engine.
// What the customer wants, from three sources: their own words (any language), the vision model's
// reading of those words, and the form (budget, ticked change types). The customer's explicit words
// win over the model; conflicts between wishes are detected and resolved explicitly.
const { USES, pick, text, coloursIn } = require("./schema");

const USE_WORDS = {
  streaming: ["stream", "ستريم", "بث", "streamer", "twitch", "يوتيوب", "youtube", "تصوير", "podcast", "بودكاست"],
  gaming: ["gaming", "game", "gamer", "قيمنق", "قيمر", "العاب", "ألعاب", "بلايستيشن", "playstation", "ps5", "xbox"],
  work: ["work", "office", "شغل", "عمل", "دوام", "مكتب شغل", "برمجة", "coding", "مونتاج", "editing"],
  study: ["study", "دراسة", "مذاكرة", "جامعة", "طالب", "مدرسة"]
};
const DEVICE_WORDS = {
  computer: ["pc", "بي سي", "كمبيوتر", "كيس", "computer"], laptop: ["laptop", "لابتوب"], console: ["ps5", "ps4", "playstation", "بلايستيشن", "xbox", "سويتش", "switch"],
  monitor: ["monitor", "شاشة", "شاشه"], two_monitors: ["شاشتين", "two monitors", "dual monitor"], microphone: ["mic", "مايك", "microphone"], camera: ["camera", "كاميرا", "webcam"]
};
const OWN_WORDS = ["عندي", "عندى", "حقي", "my ", "i have", "already", "موجود"];
const MINIMAL_WORDS = ["minimal", "simple", "بسيط", "هادي", "هادئ", "ناعم", "clean", "minimalist", "بسيطة"];
const RGB_WORDS = ["rgb", "ألوان كثير", "ملون", "rainbow", "قوس قزح"];
const WALL_WORDS = ["جدار", "wall", "ألواح", "panels", "شرائح", "slats", "ورق جدران", "wallpaper", "صبغ", "paint"];
const CHANGE_TYPES = ["furniture", "lighting", "decor", "wall", "full_setup"];

const has = (s, words) => words.some(w => s.includes(w.toLowerCase()));

/**
 * @param {{description?: string, budget_sar?: number|null, changes?: string[]}} brief  the form
 * @param {object} ai  the vision model's reading of the request (perceive.js "intent")
 */
function understandIntent(brief = {}, ai = {}) {
  const words = text(brief.description, 600);
  const low = ` ${words.toLowerCase()} `;
  const changes = (Array.isArray(brief.changes) ? brief.changes : []).filter(c => CHANGE_TYPES.includes(c));
  const budget = Number(brief.budget_sar);
  const conflicts = [];

  // use: explicit words first, then the model, then "mixed"
  const said = USES.filter(u => USE_WORDS[u] && has(low, USE_WORDS[u]));
  let use = said.length === 1 ? said[0] : said.length > 1 ? (said.includes("streaming") ? "streaming" : "mixed") : pick(ai.use, USES, "mixed");
  if (said.length > 1) conflicts.push({ type: "several_uses", detail: `the request mentions ${said.join(" and ")}`, resolution: `planned as ${use} (covers ${said.join(" + ")})` });

  // colours: the customer's words win; the model may add from its reading
  let colours = coloursIn(words);
  if (!colours.length) colours = (Array.isArray(ai.colors) ? ai.colors : []).map(c => coloursIn(c)[0]).filter(Boolean);
  const avoid = [...new Set([...(Array.isArray(ai.avoid) ? ai.avoid : []).map(c => coloursIn(c)[0]).filter(Boolean)])];
  for (const c of colours.filter(c => avoid.includes(c))) conflicts.push({ type: "colour_wanted_and_avoided", detail: c, resolution: `${c} kept, because it was asked for explicitly` });
  colours = [...new Set(colours)];
  if (colours.length > 2) {
    conflicts.push({ type: "too_many_colours", detail: colours.join(", "), resolution: `using ${colours.slice(0, 2).join(" and ")} as accents (the guide: one or two accent colours)` });
  }
  let accents = colours.slice(0, 2);

  // devices: wanted vs already owned
  const devices = Object.keys(DEVICE_WORDS).filter(d => has(low, DEVICE_WORDS[d]));
  for (const d of (Array.isArray(ai.devices) ? ai.devices : [])) { const k = Object.keys(DEVICE_WORDS).find(x => has(` ${String(d).toLowerCase()} `, DEVICE_WORDS[x])); if (k && !devices.includes(k)) devices.push(k); }
  const owned = has(low, OWN_WORDS) ? devices.filter(d => DEVICE_WORDS[d].some(w => new RegExp(`(عندي|حقي|my|have|already|موجود)[^.،,]{0,25}${w.trim()}`, "i").test(words))) : [];

  const minimal = has(low, MINIMAL_WORDS) || (Array.isArray(ai.style_words) && ai.style_words.some(w => has(` ${String(w).toLowerCase()} `, MINIMAL_WORDS)));
  const wantsRgb = has(low, RGB_WORDS) || colours.length > 2;
  if (minimal && wantsRgb) {
    accents = accents.slice(0, 1);
    conflicts.push({ type: "minimal_vs_rgb", detail: "asks for a calm/minimal look and for many colours", resolution: `calm base with one accent colour (${accents[0] || "none"}) in the lighting only` });
  }

  // wall: allowed if ticked or asked for in words
  const wallAsked = has(low, WALL_WORDS) || ai.wall_change === true;
  const allowWall = changes.includes("wall") || wallAsked;

  const keep = (Array.isArray(ai.keep) ? ai.keep : []).map(s => text(s, 40)).filter(Boolean).slice(0, 6);
  const changeOnly = changes.length && !changes.includes("full_setup") ? changes : ["furniture", "lighting", "decor", ...(allowWall ? ["wall"] : [])];
  if (changes.length && !changes.includes("furniture") && !changes.includes("full_setup") && /مكتب|desk|كرسي|chair/.test(low)) {
    conflicts.push({ type: "furniture_not_ticked", detail: "the text asks for furniture but furniture was not ticked", resolution: "furniture included, because the words are explicit" });
    changeOnly.push("furniture");
  }

  return {
    use, accents, avoid: avoid.filter(c => !accents.includes(c)), devices, owned, minimal,
    style_words: (Array.isArray(ai.style_words) ? ai.style_words : []).map(s => text(s, 30)).filter(Boolean).slice(0, 5),
    keep, changes: [...new Set(changeOnly)], allow_wall: allowWall,
    budget_sar: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : null,
    request_text: words, request_en: text(ai.request_en, 400),
    conflicts
  };
}

module.exports = { understandIntent, CHANGE_TYPES };
