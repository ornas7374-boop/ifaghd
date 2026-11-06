// Repository over a Postgres connection. `db` is anything with  query(text, params) → { rows }
// (node-postgres Pool in production, PGlite in tests). No ORM, no driver-specific features.

const fs = require("fs");
const path = require("path");

const SQL_DIR = path.join(__dirname, "..", "sql");
const json = (v) => JSON.stringify(v ?? {});
const big = (v) => (v === null || v === undefined ? null : BigInt(v));

async function migrate(db) {
  await db.query("create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())");
  const applied = new Set((await db.query("select version from schema_migrations")).rows.map(r => r.version));
  const done = [];
  for (const f of fs.readdirSync(SQL_DIR).filter(x => x.endsWith(".sql")).sort()) {
    if (applied.has(f)) continue;
    await db.query(fs.readFileSync(path.join(SQL_DIR, f), "utf8"));
    await db.query("insert into schema_migrations (version) values ($1)", [f]);
    done.push(f);
  }
  return done;
}

// ---------- duplicates ----------

/** All known perceptual hashes as BigInt (accepted + rejected, so a rejected image is never re-processed under a new id). */
async function loadHashes(db) {
  const r = await db.query("select id, dhash from reference_images where dhash is not null and status <> 'broken'");
  return r.rows.map(x => ({ id: x.id, hash: BigInt(x.dhash) }));
}

async function knownSourceIds(db, source, ids) {
  if (!ids.length) return new Set();
  const r = await db.query("select source_id from reference_images where source = $1 and source_id = any($2::text[])", [source, ids]);
  return new Set(r.rows.map(x => x.source_id));
}

// ---------- images ----------

/** Insert; a (source, source_id) that already exists is left untouched. Returns the new id or null. */
async function insertImage(db, c) {
  const r = await db.query(
    `insert into reference_images
       (source, source_id, page_url, image_url, width, height, photographer, photographer_url, license, license_url, attribution_required,
        description, dhash, duplicate_of, status, reject_reason, room, room_confidence, style, is_interior, quality, relevance, analysis,
        query_text, checked_at, last_http_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24, now(), $25)
     on conflict (source, source_id) do nothing returning id`,
    [c.source, c.sourceId, c.pageUrl, c.imageUrl, c.width ?? null, c.height ?? null, c.photographer ?? null, c.photographerUrl ?? null,
     c.license, c.licenseUrl ?? null, c.attributionRequired !== false, c.description ?? null,
     c.dhash === null || c.dhash === undefined ? null : String(c.dhash), c.duplicateOf ?? null, c.status, c.rejectReason ?? null,
     c.room ?? null, c.roomConfidence ?? null, c.style ?? null, c.isInterior ?? null, c.quality ?? null, c.relevance ?? null, json(c.analysis),
     c.queryText ?? null, c.lastHttpStatus ?? null]);
  return r.rows[0] ? r.rows[0].id : null;
}

async function markBroken(db, id, status) {
  await db.query("update reference_images set status = 'broken', reject_reason = 'url_dead', checked_at = now(), last_http_status = $2 where id = $1", [id, status ?? null]);
}
async function markChecked(db, id, status) {
  await db.query("update reference_images set checked_at = now(), last_http_status = $2 where id = $1", [id, status ?? null]);
}
async function dueForCheck(db, olderThanDays, limit) {
  const r = await db.query(
    `select id, image_url from reference_images where status = 'accepted'
       and (checked_at is null or checked_at < now() - ($1 || ' days')::interval) order by checked_at nulls first limit $2`, [String(olderThanDays), limit]);
  return r.rows;
}

// ---------- queries & pagination cursor ----------

async function ensureQueries(db, source, plan) {
  for (const group of plan) for (const term of group.terms)
    await db.query("insert into collection_queries (source, query, room_hint) values ($1,$2,$3) on conflict (source, query) do nothing", [source, term, group.room]);
}
/**
 * Never-run first, then least recently run. A query that reached the end of its results is reopened
 * after `reopenDays` (stock sites add new photos all the time), which is how the library keeps growing.
 */
async function nextQueries(db, source, limit, reopenDays = 14) {
  const r = await db.query(
    `select id, query, room_hint, next_page, exhausted from collection_queries
      where source = $1 and (not exhausted or last_run_at < now() - ($3 || ' days')::interval)
      order by exhausted, last_run_at nulls first, id limit $2`, [source, limit, String(reopenDays)]);
  return r.rows;
}
async function saveProgress(db, id, { nextPage, exhausted, seen }) {
  await db.query("update collection_queries set next_page = $2, exhausted = $3, total_seen = total_seen + $4, last_run_at = now() where id = $1", [id, nextPage, !!exhausted, seen || 0]);
}

// ---------- API response cache ----------

async function cacheGet(db, key, ttlHours) {
  const r = await db.query("select response from api_cache where cache_key = $1 and fetched_at > now() - ($2 || ' hours')::interval", [key, String(ttlHours)]);
  return r.rows[0] ? r.rows[0].response : null;
}
async function cacheSet(db, key, response) {
  await db.query("insert into api_cache (cache_key, response) values ($1, $2::jsonb) on conflict (cache_key) do update set response = excluded.response, fetched_at = now()", [key, json(response)]);
}

// ---------- runs ----------

async function runStart(db, options) {
  const r = await db.query("insert into collection_runs (options) values ($1::jsonb) returning id", [json(options)]);
  return r.rows[0].id;
}
async function runFinish(db, id, { stats, errors, status }) {
  await db.query("update collection_runs set finished_at = now(), stats = $2::jsonb, errors = $3::jsonb, status = $4 where id = $1", [id, json(stats), JSON.stringify(errors || []), status]);
}

// ---------- retrieval & stats ----------

/** Best accepted references for a room (and optionally a style), most relevant first. */
async function search(db, { room, style = null, limit = 10 }) {
  const r = await db.query(
    `select id, source, page_url, image_url, photographer, photographer_url, license, room, style, relevance, quality, analysis
       from reference_images where status = 'accepted' and room = $1 and ($2::text is null or style = $2)
       order by relevance desc nulls last limit $3`, [room, style, limit]);
  return r.rows;
}

async function stats(db) {
  const by = await db.query("select status, count(*)::int n from reference_images group by status order by status");
  const rooms = await db.query("select room, style, count(*)::int n from reference_images where status = 'accepted' group by room, style order by room, n desc");
  const reasons = await db.query("select reject_reason, count(*)::int n from reference_images where status <> 'accepted' group by reject_reason order by n desc");
  const last = await db.query("select id, started_at, finished_at, status, stats from collection_runs order by id desc limit 5");
  return { byStatus: by.rows, byRoomStyle: rooms.rows, rejectReasons: reasons.rows, lastRuns: last.rows };
}

module.exports = { migrate, loadHashes, knownSourceIds, insertImage, markBroken, markChecked, dueForCheck, ensureQueries, nextQueries, saveProgress,
  cacheGet, cacheSet, runStart, runFinish, search, stats, big };
