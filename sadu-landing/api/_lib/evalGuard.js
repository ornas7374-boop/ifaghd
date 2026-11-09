// sadu — guard for the isolated evaluation endpoints (api/eval/*).
//
// The evaluation endpoints must never run in production, even if this code is merged by
// mistake. They respond only when ALL of these hold:
//   1. VERCEL_ENV === "preview"        (set by Vercel; "production" on production deployments)
//   2. SADU_EVAL === "1"                (explicit opt-in, set only for the preview environment)
//   3. REPLICATE_API_TOKEN_EVAL exists  (a separate key; the production key is never used)
// Otherwise they answer 404 as if they did not exist.
// Access control itself comes from Vercel Deployment Protection (login required on previews).

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel's request limit is 4.5 MB

function evalEnabled(env = process.env) {
  return env.VERCEL_ENV === "preview" && env.SADU_EVAL === "1" && !!env.REPLICATE_API_TOKEN_EVAL;
}

/** Returns the eval token, or ends the response and returns null. */
function guard(req, res, { methods = ["POST"], env = process.env } = {}) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (!evalEnabled(env)) { res.status(404).json({ error: "not_found" }); return null; }
  if (!methods.includes(req.method)) { res.status(405).json({ error: "method_not_allowed" }); return null; }
  const len = Number(req.headers && req.headers["content-length"] || 0);
  if (len > MAX_BODY_BYTES) { res.status(413).json({ error: "too_large" }); return null; }
  return env.REPLICATE_API_TOKEN_EVAL;
}

/** Parse a JSON body defensively. */
function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") { try { return JSON.parse(b); } catch { return {}; } }
  return typeof b === "object" ? b : {};
}

/** data:image/...;base64,... → Buffer (jpeg/png/webp only, size-limited). */
function imageFromDataUri(s, maxBytes = 3.5 * 1024 * 1024) {
  if (typeof s !== "string") throw new Error("image_required");
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) throw new Error("bad_image");
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > maxBytes) throw new Error("bad_image_size");
  return buf;
}

module.exports = { guard, body, imageFromDataUri, evalEnabled, MAX_BODY_BYTES };
