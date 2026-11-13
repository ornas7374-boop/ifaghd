// sadu — read an image given by the browser. Only data URIs are accepted: Gemini returns the design
// as a data URI, so the server never fetches a URL for the browser (no open proxy).
async function readImage(v) {
  if (typeof v !== "string") return null;
  return /^data:image\/(jpeg|png|webp);base64,/.test(v) ? v : null;
}
const toDataUri = async () => null;

module.exports = { toDataUri, readImage };
