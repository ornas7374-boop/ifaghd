// Unsplash API source (https://unsplash.com/documentation).
// Response shapes below follow the public documentation from memory; `probe` prints the real shape
// and rate headers on the first live call, and the adapter tolerates missing optional fields.
// API guidelines honoured: images are hotlinked (never copied), the photographer and Unsplash are
// credited with referral links, the access key is sent only in the Authorization header.

const { getJson } = require("../http");
const { SOURCES } = require("../config");

const UTM = "utm_source=sadu&utm_medium=referral";
const withUtm = (u) => (u ? `${u}${u.includes("?") ? "&" : "?"}${UTM}` : u);

function normalize(p) {
  if (!p || !p.id || !p.urls) return null;
  const url = p.urls.regular || p.urls.full || p.urls.small;
  if (!url) return null;
  return {
    source: "unsplash",
    sourceId: String(p.id),
    pageUrl: withUtm((p.links && p.links.html) || `https://unsplash.com/photos/${p.id}`),
    imageUrl: url,
    width: Number(p.width) || null,
    height: Number(p.height) || null,
    photographer: (p.user && p.user.name) || null,
    photographerUrl: withUtm(p.user && p.user.links && p.user.links.html),
    description: p.description || p.alt_description || null,
    license: SOURCES.unsplash.license,
    licenseUrl: SOURCES.unsplash.licenseUrl,
    attributionRequired: true
  };
}

function create({ accessKey, fetchImpl, limiter, sleep, log } = {}) {
  if (!accessKey) throw new Error("UNSPLASH_ACCESS_KEY is required");
  return {
    name: "unsplash",
    perPage: SOURCES.unsplash.perPage,
    /** @returns {{items:object[], hasMore:boolean, total:number|null, raw:object}} */
    async search({ query, page = 1, perPage = SOURCES.unsplash.perPage }) {
      const q = new URLSearchParams({ query, page: String(page), per_page: String(Math.min(perPage, 30)), orientation: "landscape", order_by: "relevant", content_filter: "high" });
      const { json } = await getJson(`https://api.unsplash.com/search/photos?${q}`, {
        headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
        limiter, source: "unsplash", fetchImpl, sleep, log
      });
      const results = Array.isArray(json.results) ? json.results : [];
      const totalPages = Number(json.total_pages);
      return { items: results.map(normalize).filter(Boolean), hasMore: Number.isFinite(totalPages) ? page < totalPages : results.length >= perPage,
        total: Number.isFinite(Number(json.total)) ? Number(json.total) : null, raw: json };
    }
  };
}

module.exports = { create, normalize };
