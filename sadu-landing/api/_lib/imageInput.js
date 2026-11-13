// sadu — read an image given by the browser: a data URI, or an https URL of a generated result on
// replicate.delivery (fetched server-side; no other host is fetched, so this is not an open proxy).
async function toDataUri(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const ok = (h) => [ "replicate.delivery" ].some(d => h === d || h.endsWith("." + d));
  if (u.protocol !== "https:" || !ok(u.hostname)) return null;
  const r = await fetch(u, { redirect: "error" });
  const type = (r.headers.get("content-type") || "").split(";")[0];
  if (!r.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 6_000_000) return null;
  return `data:${type};base64,${buf.toString("base64")}`;
}

/** Data URI as given, hosted result fetched; null when not acceptable. */
async function readImage(v) {
  if (typeof v !== "string") return null;
  if (/^https:\/\//.test(v)) return toDataUri(v);
  return /^data:image\/(jpeg|png|webp);base64,/.test(v) ? v : null;
}

module.exports = { toDataUri, readImage };
