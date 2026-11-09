// sadu — turn a segmentation model's output into a per-pixel ADE20K class map.
//
// The exact output format of the chosen Replicate model is NOT assumed. Supported shapes:
//   1. index map  : an image whose pixel values are class ids (single channel, or R=G=B)
//   2. palette map: a colour-coded label image, mapped through a palette given in
//                   SADU_SEG_PALETTE (JSON {"r,g,b": "class name"}) once the probe has shown it
//   3. segments   : JSON like [{label, mask}] or {labels:[...], masks:[...]} with mask image URLs
// Anything else is reported as "unsupported" with a description, so the probe can show it.
//
// Configuration (preview environment variables):
//   SADU_SEG_MODEL         owner/name[:version]   (default below — must be confirmed by the probe)
//   SADU_SEG_IMAGE_FIELD   input field for the image (default "image")
//   SADU_SEG_INPUT         extra input JSON, e.g. {"task":"semantic"}
//   SADU_SEG_INDEX_OFFSET  0 if class 0 = wall (standard), 1 if 0 = "other"
//   SADU_SEG_PALETTE       palette JSON for colour-coded outputs

const sharp = require("sharp");
const { ADE20K } = require("./ade20k");

const DEFAULT_MODEL = "simbrams/segformer-b5-finetuned-ade-640-640"; // verified 2026-11-09 via the Replicate API: returns [{label, mask, score}]
const MAP_W = 320;                               // class maps are analysed at this width
const UNKNOWN = 255;                             // class id for unmapped pixels (treated as movable)

function config(env = process.env) {
  let extra = {};
  try { extra = env.SADU_SEG_INPUT ? JSON.parse(env.SADU_SEG_INPUT) : {}; } catch { extra = {}; }
  let palette = null;
  try { palette = env.SADU_SEG_PALETTE ? JSON.parse(env.SADU_SEG_PALETTE) : null; } catch { palette = null; }
  return {
    model: env.SADU_SEG_MODEL || DEFAULT_MODEL,
    imageField: env.SADU_SEG_IMAGE_FIELD || "image",
    extra, palette,
    offset: Number(env.SADU_SEG_INDEX_OFFSET || 0) || 0
  };
}

function segInput(dataUri, cfg) { return { ...cfg.extra, [cfg.imageField]: dataUri }; }

function nameOfFactory(cfg) {
  return (i) => (i === UNKNOWN ? null : ADE20K[i - cfg.offset] || null);
}

async function rawAt(buf, w, h) {
  return sharp(buf, { limitInputPixels: 40e6 }).resize(w, h, { fit: "fill", kernel: "nearest" }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
}

/** Describe an output image without interpreting it (for the probe). */
async function describeImage(buf) {
  const meta = await sharp(buf).metadata();
  const { data, info } = await rawAt(buf, 160, Math.max(1, Math.round(160 * meta.height / meta.width)));
  const ch = info.channels, colors = new Map();
  let grey = true, maxV = 0;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = ch > 1 ? data[i + 1] : r, b = ch > 2 ? data[i + 2] : r;
    if (r !== g || g !== b) grey = false;
    maxV = Math.max(maxV, r, g, b);
    const k = `${r},${g},${b}`; colors.set(k, (colors.get(k) || 0) + 1);
  }
  const top = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([c, n]) => ({ rgb: c, share: +(n / (data.length / ch)).toFixed(3) }));
  return { width: meta.width, height: meta.height, channels: meta.channels, format: meta.format,
    uniqueColors: colors.size, greyscale: grey, maxValue: maxV, topColors: top };
}

/** Parse an image output into a class map, if it is an index map or a known palette. */
async function classMapFromImage(buf, cfg, targetW, targetH) {
  const d = await describeImage(buf);
  const { data, info } = await rawAt(buf, targetW, targetH);
  const ch = info.channels, out = new Uint8Array(targetW * targetH);
  if (d.greyscale && d.maxValue <= ADE20K.length + cfg.offset && d.uniqueColors <= 160) {
    for (let i = 0, p = 0; p < out.length; i += ch, p++) out[p] = data[i];
    return { kind: "index", classMap: { w: targetW, h: targetH, data: out }, describe: d };
  }
  if (cfg.palette) {
    const lut = new Map(Object.entries(cfg.palette).map(([rgb, name]) => [rgb.replace(/\s/g, ""), ADE20K.indexOf(name)]));
    let unknown = 0;
    for (let i = 0, p = 0; p < out.length; i += ch, p++) {
      const id = lut.get(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      if (id === undefined || id < 0) { out[p] = UNKNOWN; unknown++; } else out[p] = id + cfg.offset;
    }
    if (unknown / out.length < 0.25) return { kind: "palette", classMap: { w: targetW, h: targetH, data: out }, describe: d, unknownShare: +(unknown / out.length).toFixed(3) };
    return { kind: "unsupported", reason: `palette leaves ${(100 * unknown / out.length).toFixed(0)}% of pixels unmapped`, describe: d };
  }
  return { kind: "unsupported",
    reason: d.uniqueColors > 400 ? "looks like a visualisation blended with the photo, not a label map" : "colour-coded label map: palette needed (SADU_SEG_PALETTE)",
    describe: d };
}

/** ADE20K index for a model label ("windowpane, window" -> "windowpane"); -1 if unknown. */
function labelIndex(name) {
  const n = String(name || "").toLowerCase().trim();
  let i = ADE20K.indexOf(n);
  if (i < 0) i = ADE20K.indexOf(n.split(",")[0].trim());
  if (i < 0) i = ADE20K.findIndex(c => c.split(",")[0].trim() === n.split(",")[0].trim());
  return i;
}

/** A segment mask may be an output URL, a data URI or bare base64 (models differ). */
async function maskBuffer(str, fetchOutput) {
  if (/^https?:\/\//.test(str)) return fetchOutput(str);
  const b64 = str.startsWith("data:") ? str.slice(str.indexOf(",") + 1) : str;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64.slice(0, 200))) throw new Error("mask_unreadable");
  return Buffer.from(b64, "base64");
}

/** Parse JSON segments [{label, mask}] into a class map. */
async function classMapFromSegments(list, fetchOutput, cfg, targetW, targetH) {
  const out = new Uint8Array(targetW * targetH).fill(UNKNOWN); // not covered by any segment = unknown (protected)
  let used = 0;
  const unmatched = [];
  for (const seg of list.slice(0, 200)) {
    const name = String(seg.label || seg.class || seg.name || "").toLowerCase().trim();
    const idx = labelIndex(name);
    const maskStr = seg.mask || seg.mask_url || seg.url;
    if (idx < 0 || typeof maskStr !== "string") { unmatched.push(name); continue; }
    const { data, info } = await rawAt(await maskBuffer(maskStr, fetchOutput), targetW, targetH);
    for (let i = 0, p = 0; p < out.length; i += info.channels, p++) if (data[i] > 127) out[p] = idx + cfg.offset;
    used++;
  }
  if (!used) return { kind: "unsupported", reason: "segments found but none matched ADE20K class names", unmatched };
  return { kind: "segments", classMap: { w: targetW, h: targetH, data: out }, segments: used, unmatched };
}

/**
 * @param output   prediction.output
 * @param fetchOutput  (url) => Buffer, host-restricted
 * @param aspect   original width / height
 */
async function parseOutput(output, fetchOutput, cfg, aspect) {
  const targetW = MAP_W, targetH = Math.max(1, Math.round(MAP_W / aspect));
  const shape = Array.isArray(output) ? `array(${output.length})` : typeof output;
  if (typeof output === "string") return { shape, ...(await classMapFromImage(await fetchOutput(output), cfg, targetW, targetH)) };
  if (Array.isArray(output) && output.length && typeof output[0] === "string") {
    // several images: take the first that parses as a class map, describe the rest
    const tried = [];
    for (const u of output.slice(0, 6)) {
      const r = await classMapFromImage(await fetchOutput(u), cfg, targetW, targetH);
      if (r.kind !== "unsupported") return { shape, ...r, alsoReturned: output.length };
      tried.push({ reason: r.reason, describe: r.describe });
    }
    return { shape, kind: "unsupported", reason: "no returned image is a label map", tried };
  }
  if (Array.isArray(output) && output.length && typeof output[0] === "object")
    return { shape, ...(await classMapFromSegments(output, fetchOutput, cfg, targetW, targetH)) };
  if (output && typeof output === "object") {
    if (Array.isArray(output.segments)) return { shape, ...(await classMapFromSegments(output.segments, fetchOutput, cfg, targetW, targetH)) };
    if (Array.isArray(output.labels) && Array.isArray(output.masks))
      return { shape, ...(await classMapFromSegments(output.labels.map((l, i) => ({ label: l, mask: output.masks[i] })), fetchOutput, cfg, targetW, targetH)) };
    for (const k of ["semantic", "segmentation", "label_map", "mask", "output"]) {
      if (typeof output[k] === "string") return { shape: `${shape}.${k}`, ...(await classMapFromImage(await fetchOutput(output[k]), cfg, targetW, targetH)) };
    }
    return { shape, kind: "unsupported", reason: `unknown object keys: ${Object.keys(output).slice(0, 10).join(", ")}` };
  }
  return { shape, kind: "unsupported", reason: "empty or unrecognised output" };
}

module.exports = { labelIndex, maskBuffer, config, segInput, parseOutput, nameOfFactory, describeImage, classMapFromImage, UNKNOWN, MAP_W };
