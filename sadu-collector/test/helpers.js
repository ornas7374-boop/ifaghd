// Test helpers: in-memory Postgres, synthetic photos, fake sources and a fake vision model.

const sharp = require("sharp");
const { PGlite } = require("@electric-sql/pglite");
const dbm = require("../src/db");

async function newDb() {
  const pg = new PGlite();
  // node-postgres runs a multi-statement script through query(text); PGlite needs exec() for that.
  const db = {
    query: async (text, params) => {
      if (params && params.length) return pg.query(text, params);
      const out = await pg.exec(text);
      return out.length ? out[out.length - 1] : { rows: [] };
    }
  };
  await dbm.migrate(db);
  return db;
}

/** A textured synthetic "photo". Different seeds give clearly different pictures. */
async function photo(seed, { w = 1600, h = 1000, blur = 0, dark = false } = {}) {
  const rnd = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const shapes = Array.from({ length: 28 }, () => {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), rw = 60 + Math.floor(rnd() * 400), rh = 40 + Math.floor(rnd() * 300);
    const c = [Math.floor(rnd() * 255), Math.floor(rnd() * 255), Math.floor(rnd() * 255)].map(v => (dark ? Math.floor(v * 0.04) : v));
    return `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="rgb(${c})"/>`;
  }).join("");
  const bg = dark ? "#000000" : "#d8d0c4";
  let img = sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${shapes}</svg>`));
  if (blur) img = img.blur(blur);
  return img.jpeg({ quality: 85 }).toBuffer();
}

/** Fake source adapter: pages of candidates. */
function fakeSource(name, pages, { perPage = 3, onSearch } = {}) {
  const calls = [];
  return {
    name, perPage, calls,
    async search({ query, page }) {
      calls.push({ query, page });
      if (onSearch) await onSearch({ query, page });
      const items = pages[page - 1] || [];
      return { items, hasMore: page < pages.length, total: pages.flat().length };
    }
  };
}

function cand(source, id, extra = {}) {
  return { source, sourceId: String(id), pageUrl: `https://${source}.test/p/${id}`, imageUrl: `https://images.${source}.com/${id}.jpg`, width: 2400, height: 1600,
    photographer: "Test Photographer", photographerUrl: `https://${source}.test/u/tp`, description: null, license: `${source} license`, licenseUrl: `https://${source}.test/license`,
    attributionRequired: true, ...extra };
}

/** Fake vision classifier: the answer comes from a function of the image data URI count, or a fixed answer. */
function fakeClassifier(answerFor) {
  const calls = [];
  return {
    calls,
    async classify(dataUri) {
      calls.push(dataUri.length);
      const a = typeof answerFor === "function" ? answerFor(calls.length) : answerFor;
      if (a instanceof Error) throw a;
      return { model: "fake/vision", ...a };
    }
  };
}

const GOOD = { isInterior: true, shot: "wide", room: "kitchen", roomConfidence: 0.92, style: "warm_luxury", quality: 0.82, hasPeople: false,
  hasTextOrWatermark: false, objects: ["kitchen island", "bar stool", "pendant light"], materials: ["marble", "wood"], colors: ["white", "gold"],
  lighting: "natural daylight", architecture: ["large window"], camera: { angle: "eye-level", composition: "centered" }, summary: "A bright kitchen.", conflicts: [] };

module.exports = { newDb, photo, fakeSource, cand, fakeClassifier, GOOD };
