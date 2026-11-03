// sadu — يرسل صورة الغرفة إلى Replicate ويرجّع التصميم
// المفتاح يُقرأ من متغير البيئة REPLICATE_API_TOKEN في Vercel، ولا يظهر في المتصفح أبداً.
//
// POST /api/design   { image: "data:image/jpeg;base64,...", style: "najdi", room: "majlis_men" }
//   ← { status: "succeeded", output: "https://..." }  أو  { status: "processing", id: "..." }
// GET  /api/design?id=...   ← حالة التوليد (للمتابعة إذا تأخر)

const MODEL = process.env.REPLICATE_MODEL || "black-forest-labs/flux-kontext-pro";
const API = "https://api.replicate.com/v1";

const ROOMS = {
  majlis_men: "a Saudi men's majlis (formal guest sitting room)",
  majlis_women: "a Saudi women's majlis (elegant guest sitting room)",
  living: "a family living room",
  bedroom: "a bedroom",
  annex: "a guest annex lounge (mulhaq)",
  dining: "a Saudi guest dining room (muqallat)",
  kitchen: "a kitchen",
  bathroom: "a bathroom",
  dressing: "a walk-in dressing room",
  office: "a home office"
};

// "فخامة ليلية" — مأخوذ من مراجع sadu-refs (16 صورة). انظر sadu-refs/README.md
const NIGHT_BASE = "night luxury style: dark moody palette of charcoal, matte black and warm grey with small accents of dark oak and white-veined black or grey marble; walls finished in large flush matte panels, vertical slats or marble slabs; hidden linear LED lighting is the signature: warm 2700K cove light in a dropped or tray ceiling, thin LED lines along wall panel joints, glowing undersides of floating furniture, backlit niches and shelves; low recessed spotlights, no bright overhead light; very little decor, a single dried-flower vase or sculpture; calm cinematic evening atmosphere";
const NIGHT_SOFT = "soft heavy fabrics in velvet, boucle and wool; floor-length dark curtains with a sheer layer; deep plush carpet or dark wood floor";
const NIGHT_ROOM = {
  bedroom: "low floating platform bed in black oak or walnut with warm underglow, full-width headboard wall in dark wood veneer or upholstered panels with a recessed LED line and small spotlights above it, built-in dark shelving beside the bed, dark bedding in grey or black with a textured throw, floating nightstands, optional black leather bed with thin brass trim and a large round mirror, optional wall-mounted TV or projection wall facing the bed",
  living: "oversized deep velvet sectional sofa in grey, low sculptural black coffee table, floating TV console with underglow, media wall in black marble or dark panels with integrated linear fireplace, built-in black shelving with LED under each shelf, layered dropped ceiling with recessed linear LED lines and black inlay strips, geometric LED lines on dark wall panels, polished light stone floor with a large grey rug",
  kitchen: "handleless matte black or charcoal cabinetry to the ceiling, tall units with integrated black ovens, black stone or light grey stone backsplash lit by warm under-cabinet LED, black open shelves with LED, large black island with a thick dark stone top, dark wood-grain front panels with recessed LED lines and warm underglow, black dropped ceiling over the island with downlights and a flush ceiling hood, slim black bar stools, warm wood floor",
  bathroom: "large-format dark grey stone walls and floor, matte black freestanding oval bathtub on a raised platform with a warm LED edge, frameless glass walk-in shower with black rain shower, LED-lit wall niches, floating black vanity with a black vessel basin, round backlit mirror, matte black wall-hung toilet and fixtures, optional stacked natural stone wall with wood ceiling",
  dressing: "floor-to-ceiling matte black or dark wood wardrobes with open hanging and shelving, vertical and under-shelf LED strips, center island with a glass-top jewelry drawer, round grey velvet pouf, dressing table with a curved velvet chair, LED cove ceiling, warm wood floor with a pale rug",
  dining: "long dark stone or wood dining table, upholstered dark chairs, a linear sculptural pendant over the table, marble feature wall with LED cove",
  majlis_men: "low-profile deep sofas in charcoal velvet along the walls, dark marble feature wall with backlit Arabic calligraphy panel, LED cove ceiling",
  majlis_women: "soft grey and taupe velvet sofas, warm LED cove ceiling, marble feature wall, a sculptural backlit Arabic calligraphy element",
  annex: "deep modular sofa, media wall with large screen and backlit shelves, dark panels with LED lines",
  office: "large black L-shaped or straight desk with a leather-like top and contrast stitching, ergonomic or gaming chair in black, one to three monitors, dark wall with a backlit 3D wall feature, black pegboard or floating shelves with LED, track spotlights, dark carpet or light grey floor with a geometric rug"
};

// "فخامة دافئة" — مأخوذ من مراجع sadu-refs (الصور 17–30). انظر sadu-refs/README.md
const WARM_BASE = "warm modern luxury style: light warm palette of cream, beige, greige and taupe with walnut or light oak wood; floor-to-ceiling fluted wood slats or vertical wood panels; tall upholstered fabric wall panels; polished white Calacatta or grey-veined marble on floors and feature walls, sometimes with a thin black inlay line; textured plaster walls; brushed gold and brass accents; a sculptural ring or linear gold chandelier as the focal light; warm 3000K cove LED in a dropped ceiling plus small recessed spotlights; curved and rounded furniture; one muted accent color only, such as olive, sage green or terracotta; bright, airy, elegant daytime atmosphere";
const WARM_SOFT = "boucle, velvet and linen upholstery in cream and taupe; layered sheer and linen curtains floor to ceiling; light herringbone wood or marble floor with a large textured cream rug";
const WARM_ROOM = {
  bedroom: "tall upholstered headboard wall of fabric panels, upholstered bed in cream, olive or grey, channel-tufted bench at the foot of the bed, rounded nightstands, gold ring chandelier or slim glass pendants beside the bed, built-in wardrobe in wood with tinted glass doors",
  living: "curved boucle sofas and rounded armchairs in cream, wood-veneer TV wall with LED outline beside white fluted slats, marble and wood coffee tables, gold ring chandelier",
  kitchen: "large wood dining island on a fluted marble base with clear acrylic bar stools on black legs, grey-veined marble backsplash wall with brass open shelves, black upper cabinets with wood accents, polished white marble floor, gold linear stick chandelier over the island, built-in stainless refrigerator",
  bathroom: "white Calacatta marble walls with a grey marble accent wall or rough stone feature, floating marble or wood vanity with a sculptural vessel basin, organic-shaped or wood-framed mirror, black or brass fixtures, slim black pendant lights, wall-hung toilet, LED-lit niche shelf",
  dressing: "wood-veneer wardrobes with tinted glass doors and LED shelves, upholstered bench, one rounded armchair",
  dining: "long wood or marble dining table, upholstered curved chairs in cream boucle, gold linear chandelier, fluted wood wall panels and marble floor",
  majlis_men: "deep curved boucle sofas in cream arranged around wood and stone coffee tables, exposed wood ceiling beams, textured backlit feature wall, brass wall sconces, rattan pendant, marble floor with a black inlay border",
  majlis_women: "rounded cream boucle sofas and armchairs, warm wood ceiling beams or cove ceiling, textured plaster feature wall with LED, brass sconces, marble floor with inlay",
  annex: "curved cream sofa, wood TV wall with LED outline, fluted slats, warm cove lighting",
  office: "light oak or walnut desk with a marble or leather top, cream boucle office chair, fluted wood wall with brass shelves, gold linear pendant, warm cove lighting"
};

// "فخامة هادئة" — مأخوذ من مراجع sadu-refs (الصور 31–38، مشروع VISION). انظر sadu-refs/README.md
const QUIET_BASE = "quiet luxury style: calm monochrome palette of greige, warm taupe, soft stone and off-white, with smoked walnut wood and bronze-tinted glass as the only darker notes; walls in large flush matte panels separated by thin shadow-gap reveal lines; vertical fluted panels framing feature walls; floating furniture with soft rounded edges; warm 3000K LED cove lighting along the ceiling perimeter plus slim vertical LED light slots in the wall; small paired recessed downlights; one large textured plaster or fabric art panel as the only artwork; no gold, no chandelier, no strong colors, almost no decor except a dried-flower vase and a small bronze object; serene, soft, hotel-suite atmosphere";
const QUIET_SOFT = "velvet and boucle upholstery in greige; floor-length linen curtains in taupe; medium-tone wood plank floor with a large cream rug with a subtle zigzag weave; chunky dark knit throw as the one contrast";
const QUIET_ROOM = {
  bedroom: "wide wraparound curved upholstered headboard in greige velvet that spans the wall, upholstered bed, small off-white nightstands with a bronze handle, opposite wall with flush panels and a wall-mounted TV above a long floating rounded-edge console that continues into a desk, a pair of rounded boucle armchairs with a floor lamp in the corner",
  living: "low rounded sofa and boucle armchairs in greige, flush panel TV wall with a long floating rounded-edge console, vertical LED slots, textured art panel, round side table in bronze",
  kitchen: "flush handleless cabinets in warm greige, smoked walnut tall units, light stone countertops and backsplash, under-cabinet LED, island with rounded edges, slim recessed downlights",
  bathroom: "large-format warm stone or microcement walls in greige, floating vanity with rounded edges, LED-backlit mirror, smoked walnut accents, bronze fixtures, vertical LED slot",
  dressing: "open walk-in wardrobe niches with warm LED strips under every shelf and hanging rail, tall bronze-tinted glass framed doors, off-white flush cabinetry and smoked walnut panels, cove ceiling light",
  dining: "rounded-edge stone dining table, upholstered greige chairs, flush panel walls with vertical LED slots, a single slim linear pendant",
  majlis_men: "low deep sofas in greige velvet along flush paneled walls, fluted panels framing a large textured art panel, cove lighting, rounded stone coffee tables",
  majlis_women: "rounded boucle sofas in off-white and greige, flush panels with vertical LED slots, textured plaster art panel, soft cove light",
  annex: "low modular sofa in greige, flush TV wall with floating console, cove lighting",
  office: "long floating rounded-edge desk in off-white built into a flush paneled wall, greige upholstered chair, vertical LED slot, textured art panel, small bronze desk lamp"
};

const STYLE_EXTRAS = {
  night_luxury: { soft: NIGHT_SOFT, room: NIGHT_ROOM },
  warm_luxury: { soft: WARM_SOFT, room: WARM_ROOM },
  quiet_luxury: { soft: QUIET_SOFT, room: QUIET_ROOM }
};

const STYLES = {
  najdi: "traditional Najdi style: low floor seating with Sadu-woven cushions in deep red, black and cream, earthy clay and sand tones, carved wooden accents with geometric Najdi motifs, brass coffee set (dallah), warm lantern lighting",
  hijazi: "traditional Hijazi style: carved wooden mashrabiya and rawashin-inspired panels, rich teal and wood tones, ornate wooden furniture, patterned rugs, coral-stone texture accents, soft warm lighting",
  gulf_modern: "modern Gulf style: clean lines, luxurious neutral palette of ivory, taupe and warm grey, low modern sofas, subtle geometric Arabic patterns, marble and brushed brass details, elegant indirect lighting",
  classic_luxury: "classic luxury Arabian style: grand upholstered sofas, rich fabrics in champagne and gold, crystal chandelier, ornate moldings in furniture, Persian rugs, opulent but tasteful",
  neoclassic: "neoclassical style: refined furniture with classic profiles, soft white, beige and grey palette, gold-leaf accents, elegant curtains, symmetric layout, modern simplicity",
  calm_modern: "calm modern minimal style: warm neutral tones, natural wood and linen, uncluttered layout, soft textures, a few plants, diffuse natural lighting",
  boho_gulf: "Gulf bohemian style: layered handwoven rugs and Sadu textiles, rattan and natural wood furniture, floor cushions, plants, terracotta and sand tones, cozy warm lighting",
  emirati: "contemporary Emirati style: modern furniture inspired by Emirati heritage, palm-frond (khoos) weave textures, sand, olive and deep blue accents, arched niches, geometric lattice details, refined lighting",
  night_luxury: NIGHT_BASE,
  warm_luxury: WARM_BASE,
  quiet_luxury: QUIET_BASE
};

const KEEP = "Keep the exact same room architecture: the position and size of walls, windows, doors, ceiling height, room shape, camera angle and perspective must stay identical. You may change wall and ceiling finishes, furniture, decor, textiles, colors and lighting. Photorealistic interior photograph, high detail, natural proportions.";

function buildPrompt(style, room) {
  let extra = "";
  const x = STYLE_EXTRAS[style];
  if (x) {
    if (room !== "kitchen" && room !== "bathroom") extra += ` Textiles and floor: ${x.soft}.`;
    if (x.room[room]) extra += ` Key pieces: ${x.room[room]}.`;
  }
  return `Redesign ${ROOMS[room] || "this room"} in ${STYLES[style]}.${extra} ${KEEP}`;
}

async function replicate(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {})
    }
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

function reply(res, code, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json(body);
}

function shape(p) {
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  if (p.status === "succeeded" && out) return { status: "succeeded", output: out };
  if (p.status === "failed" || p.status === "canceled") return { status: "failed", error: p.error ? String(p.error).slice(0, 300) : "failed" };
  return { status: "processing", id: p.id };
}

module.exports = async function handler(req, res) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return reply(res, 500, { status: "failed", error: "missing_token" });
  }

  try {
    if (req.method === "GET") {
      const id = String(req.query.id || "");
      if (!/^[a-z0-9]{10,40}$/i.test(id)) return reply(res, 400, { status: "failed", error: "bad_id" });
      const r = await replicate(`/predictions/${id}`);
      if (!r.ok) return reply(res, 502, { status: "failed", error: `replicate_${r.status}` });
      return reply(res, 200, shape(r.data));
    }

    if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { image, style, room } = body;
    if (!STYLES[style]) return reply(res, 400, { status: "failed", error: "bad_style" });
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      return reply(res, 400, { status: "failed", error: "bad_image" });
    }
    if (image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });

    const r = await replicate(`/models/${MODEL}/predictions`, {
      method: "POST",
      headers: { Prefer: "wait=50" },
      body: JSON.stringify({
        input: {
          prompt: buildPrompt(style, room),
          input_image: image,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2
        }
      })
    });
    if (!r.ok) {
      const detail = r.data && (r.data.detail || r.data.title) ? String(r.data.detail || r.data.title).slice(0, 300) : "";
      return reply(res, 502, { status: "failed", error: `replicate_${r.status}`, detail });
    }
    return reply(res, 200, shape(r.data));
  } catch (e) {
    return reply(res, 500, { status: "failed", error: "server_error" });
  }
};

