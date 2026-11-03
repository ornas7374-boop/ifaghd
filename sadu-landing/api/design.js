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
  annex: "a guest annex lounge (mulhaq)"
};

const STYLES = {
  najdi: "traditional Najdi style: low floor seating with Sadu-woven cushions in deep red, black and cream, earthy clay and sand tones, carved wooden accents with geometric Najdi motifs, brass coffee set (dallah), warm lantern lighting",
  hijazi: "traditional Hijazi style: carved wooden mashrabiya and rawashin-inspired panels, rich teal and wood tones, ornate wooden furniture, patterned rugs, coral-stone texture accents, soft warm lighting",
  gulf_modern: "modern Gulf style: clean lines, luxurious neutral palette of ivory, taupe and warm grey, low modern sofas, subtle geometric Arabic patterns, marble and brushed brass details, elegant indirect lighting",
  classic_luxury: "classic luxury Arabian style: grand upholstered sofas, rich fabrics in champagne and gold, crystal chandelier, ornate moldings in furniture, Persian rugs, opulent but tasteful",
  neoclassic: "neoclassical style: refined furniture with classic profiles, soft white, beige and grey palette, gold-leaf accents, elegant curtains, symmetric layout, modern simplicity",
  calm_modern: "calm modern minimal style: warm neutral tones, natural wood and linen, uncluttered layout, soft textures, a few plants, diffuse natural lighting",
  boho_gulf: "Gulf bohemian style: layered handwoven rugs and Sadu textiles, rattan and natural wood furniture, floor cushions, plants, terracotta and sand tones, cozy warm lighting",
  emirati: "contemporary Emirati style: modern furniture inspired by Emirati heritage, palm-frond (khoos) weave textures, sand, olive and deep blue accents, arched niches, geometric lattice details, refined lighting"
};

const KEEP = "Keep the exact same room architecture: walls, windows, doors, ceiling, floor area, camera angle and perspective must stay identical. Only change furniture, decor, textiles, colors and lighting. Photorealistic interior photograph, high detail, natural proportions.";

function buildPrompt(style, room) {
  return `Redesign ${ROOMS[room] || "this room"} in ${STYLES[style]}. ${KEEP}`;
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

