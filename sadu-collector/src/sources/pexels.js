// Pexels API source (https://www.pexels.com/api/documentation/).
// Same notes as unsplash.js: shapes follow the public documentation from memory and are verified by `probe`.
// API guidelines honoured: photographers and Pexels are credited, images are hotlinked, the key goes
// only in the Authorization header (Pexels expects the bare key, without a prefix).

const { getJson } = require("../http");
const { SOURCES } = require("../config");

function normalize(p) {
  if (!p || !p.id || !p.src) return null;
  const url = p.src.large2x || p.src.large || p.src.original;
  if (!url) return null;
  return {
    source: "pexels",
    sourceId: String(p.id),
    pageUrl: p.url || `https://www.pexels.com/photo/${p.id}/`,
    imageUrl: url,
    width: Number(p.width) || null,
    height: Number(p.height) || null,
    photographer: p.photographer || null,
    photographerUrl: p.photographer_url || null,
    description: p.alt || null,
    license: SOURCES.pexels.license,
    licenseUrl: SOURCES.pexels.licenseUrl,
    attributionRequired: true
  };
}

function create({ apiKey, fetchImpl, limiter, sleep, log } = {}) {
  if (!apiKey) throw new Error("PEXELS_API_KEY is required");
  return {
    name: "pexels",
    perPage: SOURCES.pexels.perPage,
    async search({ query, page = 1, perPage = SOURCES.pexels.perPage }) {
      const q = new URLSearchParams({ query, page: String(page), per_page: String(Math.min(perPage, 80)), orientation: "landscape" });
      const { json } = await getJson(`https://api.pexels.com/v1/search?${q}`, {
        headers: { Authorization: apiKey },
        limiter, source: "pexels", fetchImpl, sleep, log
      });
      const photos = Array.isArray(json.photos) ? json.photos : [];
      return { items: photos.map(normalize).filter(Boolean), hasMore: !!json.next_page || photos.length >= perPage,
        total: Number.isFinite(Number(json.total_results)) ? Number(json.total_results) : null, raw: json };
    }
  };
}

module.exports = { create, normalize };
