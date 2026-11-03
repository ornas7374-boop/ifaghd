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
  dressing: "a walk-in dressing room"
};

// "فخامة ليلية" — مأخوذ من مراجع sadu-refs (16 صورة). انظر sadu-refs/README.md
const NIGHT_BASE = "night luxury style: dark moody palette of charcoal, matte black and warm grey with small accents of dark oak and white-veined black or grey marble; walls finished in large flush matte panels, vertical slats or marble slabs; hidden linear LED lighting is the signature: warm 2700K cove light in a dropped or tray ceiling, thin LED lines along wall panel joints, glowing undersides of floating furniture, backlit niches and shelves; low recessed spotlights, no bright overhead light; very little decor, a single dried-flower vase or sculpture; calm cinematic evening atmosphere";
const NIGHT_SOFT = "soft heavy fabrics in velvet, boucle and wool; floor-length dark curtains with a sheer layer; deep plush carpet or dark wood floor";
const NIGHT_ROOM = {
  bedroom: "low floating platform bed with soft underglow, upholstered panel headboard wall with an LED line above it, dark bedding with a textured throw, floating nightstands, optional wall-mounted TV or projection wall facing the bed",
  living: "oversized deep velvet sectional sofa in grey, low square coffee tables, floating TV console with underglow, media wall in black marble or dark panels with integrated linear fireplace or backlit shelves",
  kitchen: "handleless matte charcoal cabinetry to the ceiling, tall units with integrated black ovens, light grey stone backsplash lit by under-cabinet LED, glossy black island with an LED-lit edge, linear recessed ceiling lights",
  bathroom: "stacked dark natural stone walls, warm wood ceiling, square ceiling-mounted rain shower with LED, floating wood vanity with a white vessel basin and black tap, round mirror, warm wall light",
  dressing: "floor-to-ceiling wardrobes in dark wood veneer with fluted glass doors and LED-lit shelves, upholstered bench under the window, one sculptural armchair",
  dining: "long dark stone or wood dining table, upholstered dark chairs, a linear sculptural pendant over the table, marble feature wall with LED cove",
  majlis_men: "low-profile deep sofas in charcoal velvet along the walls, dark marble feature wall with backlit Arabic calligraphy panel, LED cove ceiling",
  majlis_women: "soft grey and taupe velvet sofas, warm LED cove ceiling, marble feature wall, a sculptural backlit Arabic calligraphy element",
  annex: "deep modular sofa, media wall with large screen and backlit shelves, dark panels with LED lines"
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
  night_luxury: NIGHT_BASE
};

const KEEP = "Keep the exact same room architecture: the position and size of walls, windows, doors, ceiling height, room shape, camera angle and perspective must stay identical. You may change wall and ceiling finishes, furniture, decor, textiles, colors and lighting. Photorealistic interior photograph, high detail, natural proportions.";

function buildPrompt(style, room) {
  let extra = "";
  if (style === "night_luxury") {
    if (room !== "kitchen" && room !== "bathroom") extra += ` Textiles and floor: ${NIGHT_SOFT}.`;
    if (NIGHT_ROOM[room]) extra += ` Key pieces: ${NIGHT_ROOM[room]}.`;
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

