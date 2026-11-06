// Image handling: safe download, perceptual hash (duplicates), cheap local quality checks.
// Images are processed in memory and discarded; only the hash and measurements are kept.

const sharp = require("sharp");
const { IMAGE_HOSTS, THRESHOLDS } = require("./config");

class ImageError extends Error {
  constructor(code, detail) { super(code); this.name = "ImageError"; this.code = code; this.detail = detail; }
}

function checkUrl(url, hosts = IMAGE_HOSTS) {
  let u;
  try { u = new URL(url); } catch { throw new ImageError("bad_url"); }
  if (u.protocol !== "https:" || u.username || u.password) throw new ImageError("blocked_host");
  if (!hosts.includes(u.hostname)) throw new ImageError("blocked_host", u.hostname);
  return u;
}

/**
 * Download an image from an allow-listed host. 404/410 → code "broken" (the URL is dead);
 * other failures are transient ("fetch_failed") and must not be recorded as a verdict on the image.
 */
async function fetchImage(url, { fetchImpl = globalThis.fetch, hosts = IMAGE_HOSTS, maxBytes = THRESHOLDS.maxImageBytes, timeoutMs = 20_000 } = {}) {
  checkUrl(url, hosts);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try { res = await fetchImpl(url, { signal: ctl.signal, redirect: "error" }); }
  catch (e) { clearTimeout(t); throw new ImageError("fetch_failed", e.name); }
  try {
    if (res.status === 404 || res.status === 410) throw new ImageError("broken", String(res.status));
    if (!res.ok) throw new ImageError("fetch_failed", String(res.status));
    const type = res.headers.get ? res.headers.get("content-type") || "" : "";
    if (type && !/^image\//i.test(type)) throw new ImageError("not_image", type);
    const len = Number(res.headers.get ? res.headers.get("content-length") : 0);
    if (len > maxBytes) throw new ImageError("too_large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new ImageError("not_image", "empty");
    if (buf.length > maxBytes) throw new ImageError("too_large");
    return buf;
  } finally { clearTimeout(t); }
}

/** Is this URL still alive? Used by the periodic link check. true / false (dead) / null (unknown: transient). */
async function checkAlive(url, { fetchImpl = globalThis.fetch, hosts = IMAGE_HOSTS, timeoutMs = 15_000 } = {}) {
  checkUrl(url, hosts);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: "HEAD", signal: ctl.signal, redirect: "error" });
    if (res.status === 404 || res.status === 410) return { alive: false, status: res.status };
    if (res.ok) return { alive: true, status: res.status };
    return { alive: null, status: res.status };
  } catch { return { alive: null, status: 0 }; }
  finally { clearTimeout(t); }
}

/** 64-bit difference hash: 9x8 greyscale, one bit per "pixel is brighter than its right neighbour". */
async function dHash(buf) {
  const { data } = await sharp(buf, { limitInputPixels: 40e6 }).rotate().resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
  return BigInt.asIntN(64, h);   // signed, so it fits a Postgres bigint
}

function hamming(a, b) {
  let x = BigInt.asUintN(64, a ^ b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/** Local measurements: sharpness (normalised Laplacian variance), brightness and contrast, real size. */
async function measure(buf) {
  const img = sharp(buf, { limitInputPixels: 40e6 }).rotate();
  const meta = await img.metadata();
  const W = 256;
  const { data, info } = await img.clone().resize(W, null, { fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, px = (x, y) => data[y * w + x] / 255;
  let lapSum = 0, lapSq = 0, n = 0, sum = 0, sumSq = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const l = px(x - 1, y) + px(x + 1, y) + px(x, y - 1) + px(x, y + 1) - 4 * px(x, y);
    lapSum += l; lapSq += l * l; n++;
  }
  for (let i = 0; i < data.length; i++) { const v = data[i] / 255; sum += v; sumSq += v * v; }
  const mean = sum / data.length;
  return {
    width: meta.width, height: meta.height,
    sharpness: n ? lapSq / n - (lapSum / n) ** 2 : 0,
    brightness: mean,
    contrast: Math.sqrt(Math.max(0, sumSq / data.length - mean * mean))
  };
}

/** A 640px JPEG data URI for the vision model (keeps token cost low). */
async function modelImage(buf, size = 640) {
  const jpg = await sharp(buf, { limitInputPixels: 40e6 }).rotate().resize(size, size, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString("base64")}`;
}

module.exports = { fetchImage, checkAlive, dHash, hamming, measure, modelImage, checkUrl, ImageError };
