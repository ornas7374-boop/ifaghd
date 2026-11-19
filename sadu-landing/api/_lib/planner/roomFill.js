// sadu Planning Engine — full-room fill. After the room is emptied, the desk setup goes on the best wall;
// this step furnishes the REST of the room so no area is left empty: every other visible wall, and the
// free part of the desk wall, gets pieces that suit the room type and the style colours.
// Rules (property-staging / interior-design-expert): tall pieces never in front of a window or a door,
// low pieces may sit under a window, the walkway to the door stays clear, no rugs (the floor is protected),
// and pieces the customer keeps are not bought again.
const { storeLinks } = require("../shopItems");
const catalog = require("../catalog");

// per room type, in order of importance. tall = may not stand in front of a window / beside a door.
// sadu is gaming setups only: the rest of the room gets gaming pieces (no bed, wardrobe or dresser)
const GAMING = [
  { key: "lounge_chair", short: "gaming lounge chair with side table", en: "a gaming lounge chair with a small side table", ar: "كرسي ألعاب للاسترخاء مع طاولة جانبية", tall: false, big: true, range: [250, 900] },
  { key: "tv_console", short: "low TV console with wall-mounted TV and game console", en: "a low TV console with a large wall-mounted TV and a game console", ar: "طاولة تلفزيون منخفضة مع شاشة معلّقة وجهاز ألعاب", tall: false, big: true, range: [400, 1500] },
  { key: "bookcase", short: "tall shelving with games, controllers and LED", en: "a tall shelving unit with games, controllers, headsets and LED strip lighting", ar: "رفوف طويلة للألعاب والإكسسوارات", tall: true, range: [300, 1000] },
  { key: "sofa", short: "low gaming sofa", en: "a low sofa for couch gaming facing the TV", ar: "كنبة ألعاب منخفضة", tall: false, big: true, range: [1200, 3500] }
];
const CATALOG = { setup_corner: GAMING, gaming_room: GAMING, home_office: GAMING };
// small pieces that finish any empty stretch
const FILLERS = [
  { key: "floor_lamp", short: "slim floor lamp", en: "a slim floor lamp with a warm shade", ar: "أباجورة أرضية", tall: true, range: [120, 400] },
  { key: "tall_plant", short: "tall potted plant", en: "a tall indoor plant in a ceramic pot", ar: "نبتة طويلة في أصيص", tall: true, range: [80, 300] },
  { key: "wall_art_set", short: "two framed abstract gaming-style neon prints", en: "a set of two framed abstract gaming-style prints", ar: "لوحتان تجريديتان", tall: false, wall: true, range: [120, 400] }
];
const WALL_EN = { left: "left wall", back: "back wall", right: "right wall" };
const WALL_AR = { left: "الجدار الأيسر", back: "الجدار المقابل", right: "الجدار الأيمن" };

/**
 * @returns {{items: object[], line: string, requirements: object[]}}
 *   items: [{key, en, ar, wall, where}] in placement order; line: one prompt sentence; requirements: product needs
 */
function planRoomFill(room, intent, decisions, spatial, space, opts = {}) {
  if (!intent.clear_room || !spatial || !spatial.best) return { items: [], line: "", lineShort: "", requirements: [], refs: [] };
  const colour = decisions.palette.furniture;
  const keepWords = (intent.keep || []).join(" ").toLowerCase();
  const kept = (it) => keepWords && (keepWords.includes(it.key.replace(/_/g, " ")) || (it.key === "bed" && /سرير|bed/.test(keepWords)) || (it.key === "sofa" && /كنب|sofa|couch/.test(keepWords)) || (it.key === "wardrobe" && /دولاب|wardrobe|closet/.test(keepWords)));
  const pool = (CATALOG[space] || CATALOG.setup_corner).filter(it => !kept(it));
  const blocked = (wallId, kind) => (room[kind] || []).some(o => o.wall === wallId);
  const out = [];
  const take = (pred) => { const i = pool.findIndex(pred); return i >= 0 ? pool.splice(i, 1)[0] : null; };

  // 1) every other visible wall gets one main piece: tall ones only where there is no window or door
  const others = room.walls.filter(w => w.visible !== false && w.id !== spatial.best.wall);
  for (const w of others) {
    const win = blocked(w.id, "windows"), door = blocked(w.id, "doors");
    const main = take(it => it.big && (!it.tall || (!win && !door))) || take(it => !it.tall || (!win && !door));
    if (main) out.push({ ...main, wall: w.id, where: `${w.id} wall${win && !main.tall ? ", under the window" : ""}` });
    // a second, smaller piece on long walls
    const second = take(it => !it.big && (!it.tall || (!win && !door)));
    if (second) out.push({ ...second, wall: w.id, where: `${w.id} wall` });
  }
  // 2) the free part of the desk wall (desk on one side) gets a filler
  const dw = room.walls.find(w => w.id === spatial.best.wall);
  if (dw && dw.extent && spatial.best.desk) {
    const leftGap = spatial.best.desk.x0 - dw.extent.x0, rightGap = dw.extent.x1 - spatial.best.desk.x1;
    const gap = Math.max(leftGap, rightGap);
    if (gap > 0.12) {
      const side = rightGap >= leftGap ? "right" : "left";
      const f = take(it => !it.big && !it.tall) || FILLERS[0];
      out.push({ ...f, wall: dw.id, where: `${dw.id} wall, ${side} of the desk` });
    }
  }
  // 3) finishing touches so no corner stays bare
  if (!out.some(x => x.key === "tall_plant")) out.push({ ...FILLERS[1], wall: null, where: "empty corner" });
  if (!out.some(x => x.key === "floor_lamp")) out.push({ ...FILLERS[0], wall: null, where: "by the seating" });
  out.push({ ...FILLERS[2], wall: (others.find(w => !blocked(w.id, "windows")) || dw || {}).id || null, where: "bare wall" });

  // real products from the catalogue (IKEA Saudi) replace the generic piece when one fits
  for (const x of out) {
    const prod = catalog.pick(x.key, { furniture: colour, style: opts.style, budget: opts.budget });
    if (prod) { x.product = prod; x.short = catalog.phrase(prod); }
  }
  // compact wording: the image model reads a limited prompt, and the desk setup must keep its details
  const phrase = (x) => `${!x.product && colour && !/plant|art|lamp/.test(x.key) ? colour + " " : ""}${x.short} (${x.where})`;
  const sentence = (list) => list.length ? `Furnish the whole room, no empty areas: ${list.map(phrase).join("; ")}. Clear walkway to the door; nothing in front of the window; include everything the customer listed.` : "";
  const line = sentence(out);
  // shorter version (main pieces only) used when the prompt is too long, so the desk setup keeps its details
  const lineShort = sentence(out.filter(x => !FILLERS.some(f => f.key === x.key)));
  const requirements = out.map(x => {
    const ar = `${x.ar}${opts.colourAr ? " " + opts.colourAr : ""}`;
    const base = { key: `room_${x.key}`, label: x.en, label_ar: x.ar, category: x.key, priority: "room", spec: { colour }, where_ar: x.wall ? WALL_AR[x.wall] : "ركن فاضي" };
    if (x.product) {
      const pr = catalog.asProduct(x.product);
      return { ...base, budget_sar: pr.price_sar, range_sar: [pr.price_sar, pr.price_sar], search: { ar, en: x.product.name }, status: "verified", product: pr,
        links: [{ store: "ايكيا", url: pr.url }, ...storeLinks({ name_ar: ar, name_en: x.product.name, search_ar: ar, search_en: x.product.name }, { amazonTag: opts.amazonTag }).slice(0, 2)] };
    }
    return { ...base, budget_sar: Math.round((x.range[0] + x.range[1]) / 2), range_sar: x.range,
      search: { ar, en: `${colour && !/plant|art|lamp/.test(x.key) ? colour + " " : ""}${x.en.replace(/^a |^an /, "").split(" with ")[0]}` }, status: "room", product: null,
      links: storeLinks({ name_ar: ar, name_en: x.en, search_ar: ar, search_en: x.en }, { amazonTag: opts.amazonTag }) };
  });
  // up to 3 product photos go to the image model as references (biggest pieces first)
  const refs = out.filter(x => x.product && !FILLERS.some(f => f.key === x.key)).sort((a, b) => (b.big ? 1 : 0) - (a.big ? 1 : 0)).slice(0, 3).map(x => ({ id: x.product.id, label: x.short.replace(/^IKEA /, "") }));
  return { items: out.map(x => ({ key: x.key, en: x.short, ar: x.ar, wall: x.wall, where: x.where, product: x.product ? catalog.asProduct(x.product) : null })), line, lineShort, requirements, refs };
}

module.exports = { planRoomFill, CATALOG, FILLERS };
