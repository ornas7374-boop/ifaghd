#!/usr/bin/env node
// sadu-collector command line.
//
//   node bin/cli.js probe                      verify keys, API shapes, rate headers, database and vision model (1 request each)
//   node bin/cli.js migrate                    create/upgrade the database tables
//   node bin/cli.js collect [options]          discover → classify → store
//   node bin/cli.js verify  [--days 7]         re-check stored image links, mark dead ones
//   node bin/cli.js search --room kitchen [--style warm_luxury] [--limit 10]
//   node bin/cli.js stats
//
// collect options:  --sources unsplash,pexels  --max-pages 2  --max-queries 6  --max-classify 60  --dry-run
//
// Environment (never printed):
//   UNSPLASH_ACCESS_KEY, PEXELS_API_KEY   source keys (a source without a key is skipped)
//   REPLICATE_API_TOKEN                   vision classification
//   DATABASE_URL                          Postgres connection string (Supabase → Connect → Session pooler)
//   DATABASE_CA_FILE                      path to the Supabase CA certificate (keeps TLS verification ON)
//   SADU_VISION_MODELS                    comma-separated Replicate model ids to try, in order

const fs = require("fs");
const config = require("../src/config");
const dbm = require("../src/db");
const { RateLimiter } = require("../src/http");
const { collect } = require("../src/collect");
const { verifyLinks } = require("../src/verify");
const { createClassifier } = require("../src/classify");
const unsplash = require("../src/sources/unsplash");
const pexels = require("../src/sources/pexels");

const secrets = [process.env.UNSPLASH_ACCESS_KEY, process.env.PEXELS_API_KEY, process.env.REPLICATE_API_TOKEN, process.env.DATABASE_URL].filter(Boolean);
const redact = (t) => secrets.reduce((s, k) => s.split(k).join("[redacted]"), String(t));
const log = (level, msg, data) => process.stderr.write(redact(JSON.stringify({ t: new Date().toISOString(), level, msg, ...data })) + "\n");

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const { Pool } = require("pg");
  const ssl = process.env.DATABASE_CA_FILE ? { ca: fs.readFileSync(process.env.DATABASE_CA_FILE, "utf8"), rejectUnauthorized: true } : true;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 3 });
  return { query: (t, p) => pool.query(t, p), end: () => pool.end() };
}

function buildSources(names, limiterOpts = {}) {
  const sources = {}, limiters = {};
  for (const n of names) {
    const limiter = new RateLimiter({ name: n, ...limiterOpts, minIntervalMs: n === "unsplash" ? 1200 : 400 });
    if (n === "unsplash" && process.env.UNSPLASH_ACCESS_KEY) { limiters[n] = limiter; sources[n] = unsplash.create({ accessKey: process.env.UNSPLASH_ACCESS_KEY, limiter, log }); }
    else if (n === "pexels" && process.env.PEXELS_API_KEY) { limiters[n] = limiter; sources[n] = pexels.create({ apiKey: process.env.PEXELS_API_KEY, limiter, log }); }
    else log("warn", "source_skipped_no_key", { source: n });
  }
  return { sources, limiters };
}

const models = () => (process.env.SADU_VISION_MODELS ? process.env.SADU_VISION_MODELS.split(",").map(s => s.trim()).filter(Boolean) : undefined);
const num = (v, d) => (v === undefined || v === true ? d : Math.max(0, Math.floor(Number(v)) || d));

async function probe() {
  const out = { sources: {}, database: null, vision: null };
  const { sources, limiters } = buildSources(["unsplash", "pexels"]);
  for (const [name, src] of Object.entries(sources)) {
    try {
      const r = await src.search({ query: "modern kitchen interior", page: 1, perPage: 3 });
      const first = r.raw && (r.raw.results ? r.raw.results[0] : r.raw.photos && r.raw.photos[0]);
      out.sources[name] = { ok: true, items: r.items.length, hasMore: r.hasMore, total: r.total, firstItem: r.items[0] || null,
        rawKeys: first ? Object.keys(first) : [], rateLimit: { remaining: limiters[name].remaining, resetAt: limiters[name].resetAt } };
    } catch (e) { out.sources[name] = { ok: false, error: e.message }; }
  }
  for (const n of ["unsplash", "pexels"]) if (!out.sources[n]) out.sources[n] = { ok: false, error: "no key set" };
  try { const db = await connect(); const r = await db.query("select version() v"); out.database = { ok: true, version: String(r.rows[0].v).slice(0, 30) }; await db.end(); }
  catch (e) { out.database = { ok: false, error: e.message }; }
  try {
    if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not set");
    const sharp = require("sharp");
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#cccccc" } }).jpeg().toBuffer();
    const c = createClassifier({ token: process.env.REPLICATE_API_TOKEN, models: models(), log });
    const r = await c.classify(`data:image/jpeg;base64,${png.toString("base64")}`);
    out.vision = { ok: true, model: r.model, isInterior: r.isInterior, note: "a grey square, so is_interior=false is the correct answer" };
  } catch (e) { out.vision = { ok: false, error: e.message, detail: e.detail }; }
  console.log(redact(JSON.stringify(out, null, 2)));
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  if (!cmd || cmd === "help") { console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 18).map(l => l.replace(/^\/\/ ?/, "")).join("\n")); return; }
  if (cmd === "probe") return probe();
  const db = await connect();
  try {
    if (cmd === "migrate") { console.log("applied:", await dbm.migrate(db)); return; }
    if (cmd === "stats") { console.log(JSON.stringify(await dbm.stats(db), null, 2)); return; }
    if (cmd === "search") { if (!a.room) throw new Error("--room is required"); console.log(JSON.stringify(await dbm.search(db, { room: a.room, style: a.style || null, limit: num(a.limit, 10) }), null, 2)); return; }
    if (cmd === "verify") { console.log(JSON.stringify(await verifyLinks(db, { olderThanDays: num(a.days, 7), limit: num(a.limit, 200), log }))); return; }
    if (cmd === "collect") {
      const names = String(a.sources && a.sources !== true ? a.sources : "unsplash,pexels").split(",").map(s => s.trim()).filter(Boolean);
      const { sources, limiters } = buildSources(names, { maxCalls: num(a["max-api-calls"], 60) });
      if (!Object.keys(sources).length) throw new Error("no source has a key: set UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY");
      const classifier = createClassifier({ token: process.env.REPLICATE_API_TOKEN, models: models(), log });
      const opts = { maxPages: num(a["max-pages"], 2), maxQueries: num(a["max-queries"], 6), maxClassify: num(a["max-classify"], 60), dryRun: !!a["dry-run"] };
      log("info", "collect_start", { sources: Object.keys(sources), ...opts });
      const r = await collect({ db, sources, limiters, classifier, log, opts });
      console.log(JSON.stringify({ runId: r.runId, status: r.status, stats: r.stats, errors: r.errors }, null, 2));
      process.exitCode = r.status === "failed" ? 1 : 0;
      return;
    }
    throw new Error(`unknown command: ${cmd}`);
  } finally { if (db.end) await db.end(); }
}

main().catch((e) => { console.error(redact(e.message)); process.exit(1); });
