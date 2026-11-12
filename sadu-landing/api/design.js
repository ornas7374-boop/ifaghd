// sadu — يرسل صورة الركن أو الغرفة ويرجّع تصميم السيت أب
// المفتاح يُقرأ من متغير البيئة REPLICATE_API_TOKEN في Vercel، ولا يظهر في المتصفح أبداً.
//
// POST /api/design   { image: "data:image/jpeg;base64,...", style: "grey_tech", room: "setup_corner" }
//   ← { status: "succeeded", output: "https://..." }  أو  { status: "processing", id: "..." }
// GET  /api/design?id=...   ← حالة التوليد (للمتابعة إذا تأخر)

const MODEL = process.env.REPLICATE_MODEL || "black-forest-labs/flux-kontext-pro";
const API = "https://api.replicate.com/v1";

// Setup focus: spaces, styles and the preservation rule live in _lib/setup.js (shared with analysis).
const { STYLES, buildPrompt } = require("./_lib/setup");
// Descriptions of the existing floor / walls / ceiling from the analysis step; they are put into
// the prompt as things to keep. Walls stay protected here (no wall change yet).
const briefOf = (b) => ({
  request: typeof b.request === "string" ? b.request : "",
  placement: typeof b.placement === "string" ? b.placement : "",
  use: typeof b.use === "string" ? b.use : "",
  changes: Array.isArray(b.changes) ? b.changes.map(String).filter(x => /^[a-z_]{2,20}$/.test(x)).slice(0, 6) : []
});
const keepOf = (k) => (k && typeof k === "object" ? { floor: k.floor, walls: k.walls, ceiling: k.ceiling } : {});

// Replicate rate-limits accounts (strictly when the credit balance is low): retry 429 and
// transient 5xx a few times, waiting what Replicate asks for, within the function's time budget.
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function retryDelay(r, attempt) {
  const ra = Number(r.headers && r.headers.get && r.headers.get("retry-after"));
  return Number.isFinite(ra) && ra > 0 ? Math.min(ra, 12) * 1000 : 2000 * 2 ** attempt;
}

async function replicate(path, opts = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        ...(opts.headers || {})
      }
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 3) { await sleep(retryDelay(r, attempt)); continue; }
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
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
  // Provider for the design image: SADU_DESIGN_PROVIDER (gemini | replicate), falling back to
  // SADU_PROVIDER. So analysis can stay on (free) Gemini while Replicate designs.
  const useGemini = (process.env.SADU_DESIGN_PROVIDER || process.env.SADU_PROVIDER) === "gemini";
  if (!(useGemini ? process.env.GEMINI_API_KEY : process.env.REPLICATE_API_TOKEN)) {
    return reply(res, 500, { status: "failed", error: "missing_token" });
  }

  try {
    if (useGemini) {
      if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (!STYLES[b.style]) return reply(res, 400, { status: "failed", error: "bad_style" });
      if (typeof b.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.image)) return reply(res, 400, { status: "failed", error: "bad_image" });
      if (b.image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });
      try {
        const g = await require("./_lib/gemini").generateImage(process.env.GEMINI_API_KEY, b.image, buildPrompt(b.style, b.room, { keep: keepOf(b.keep), ...briefOf(b) }), { model: process.env.GEMINI_IMAGE_MODEL || undefined });
        return reply(res, 200, { status: "succeeded", output: g.output });
      } catch (e) {
        return reply(res, 502, { status: "failed", error: e.message || "gemini_failed", detail: e.detail || "" });
      }
    }

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
          prompt: buildPrompt(style, room, { keep: keepOf(body.keep), ...briefOf(body) }),
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

