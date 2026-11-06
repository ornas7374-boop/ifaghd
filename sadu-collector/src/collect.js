// The collection run: discover → pre-filter → download → local quality → duplicates → AI classify → accept/reject → store.
//
// Cost and safety controls:
//   * maxClassify caps paid vision calls per run (the cursor is NOT advanced past unprocessed photos, so nothing is skipped)
//   * the pagination cursor is saved after every page, and API responses are cached, so a stopped run resumes cheaply
//   * photos already in the database (accepted OR rejected) are never downloaded or classified again
//   * dependencies are injected, so the whole run is testable without a network

const config = require("./config");
const dbm = require("./db");
const { RateLimiter, RateLimitExhausted, AuthError, mapLimit } = require("./http");
const image = require("./image");
const { relevance } = require("./score");

const T = config.THRESHOLDS;

function emptyStats() {
  return { queries: 0, apiCalls: {}, cacheHits: 0, candidates: 0, alreadyKnown: 0, prefiltered: 0, downloaded: 0, brokenUrls: 0, lowQuality: 0,
    duplicates: 0, classified: 0, accepted: 0, rejected: 0, transientErrors: 0, stoppedBy: null };
}

/** Pre-filter on API metadata, before any download. Returns a reject reason or null. */
function prefilter(c) {
  if (!c.width || !c.height) return null;   // unknown size: decide after download
  if (Math.min(c.width, c.height) < T.minShortSide) return "too_small";
  const aspect = c.width / c.height;
  if (aspect < T.minAspect || aspect > T.maxAspect) return "bad_aspect";
  return null;
}

/** Decide accept/reject from the classification. Returns a reason string, or null to accept. */
function judge(cls, opts) {
  if (!cls.isInterior) return "not_interior";
  if (cls.room === "other") return "room_unknown";
  if (cls.roomConfidence < T.minRoomConfidence) return "low_room_confidence";
  if (cls.shot === "detail" || cls.shot === "aerial" || cls.shot === "other") return "not_a_room_view";
  if (cls.hasTextOrWatermark) return "text_or_watermark";
  if (cls.hasPeople && !(opts.allowPeople ?? T.allowPeople)) return "has_people";
  if (cls.quality < T.minQuality) return "low_quality";
  if (cls.conflicts.length) return "room_object_conflict";
  return null;
}

function analysisOf(cls, measures) {
  return { objects: cls.objects, materials: cls.materials, colors: cls.colors, lighting: cls.lighting, architecture: cls.architecture,
    camera: cls.camera, shot: cls.shot, summary: cls.summary, hasPeople: cls.hasPeople, conflicts: cls.conflicts, model: cls.model,
    measured: measures ? { sharpness: +measures.sharpness.toFixed(5), brightness: +measures.brightness.toFixed(3), contrast: +measures.contrast.toFixed(3) } : undefined };
}

/**
 * @param {object} d dependencies
 * @param {object} d.db                    { query }
 * @param {Record<string, object>} d.sources  name → adapter { search(), perPage }
 * @param {Record<string, RateLimiter>} d.limiters
 * @param {object} d.classifier            { classify(dataUri) }
 * @param {object} [d.opts]
 */
async function collect(d) {
  const { db, sources, classifier, log = () => {}, fetchImage = image.fetchImage, sleep } = d;
  const opts = { maxPages: 2, maxQueries: 6, maxClassify: 60, concurrency: 4, dryRun: false, queryPlan: config.QUERY_PLAN, ...d.opts };
  const stats = emptyStats(), errors = [];
  const runId = opts.dryRun ? null : await dbm.runStart(db, { ...opts, queryPlan: undefined, sources: Object.keys(sources) });
  const known = await dbm.loadHashes(db);
  let classifyLeft = opts.maxClassify;
  let fatal = false;

  const note = (where, e) => { errors.push({ where, error: String(e && e.message || e).slice(0, 200), at: new Date().toISOString() }); log("error", where, { error: e && e.message }); };

  async function processCandidate(c, queryRoom, queryText, fetched) {
    // fetched = { buf } | { error } computed concurrently; everything below is sequential so duplicate checks see earlier accepts
    const rec = { source: c.source, sourceId: c.sourceId, pageUrl: c.pageUrl, imageUrl: c.imageUrl, width: c.width, height: c.height,
      photographer: c.photographer, photographerUrl: c.photographerUrl, license: c.license, licenseUrl: c.licenseUrl,
      attributionRequired: c.attributionRequired, description: c.description, queryText };
    const store = async (extra) => { if (!opts.dryRun) await dbm.insertImage(db, { ...rec, ...extra }); };
    const reject = async (reason, extra = {}) => { stats.rejected++; await store({ status: "rejected", rejectReason: reason, ...extra }); };

    if (fetched.error) {
      if (fetched.error.code === "broken") { stats.brokenUrls++; await store({ status: "broken", rejectReason: "url_dead", lastHttpStatus: 404 }); }
      else { stats.transientErrors++; log("warn", "download_failed", { id: c.sourceId, code: fetched.error.code }); }   // not stored: try again next time
      return;
    }
    stats.downloaded++;
    let hash, m;
    try { hash = await image.dHash(fetched.buf); m = await image.measure(fetched.buf); }
    catch (e) { await reject("unreadable_image"); return; }
    if (Math.min(m.width, m.height) < T.minShortSide) { await reject("too_small", { dhash: hash }); return; }
    if (m.sharpness < T.minSharpness || m.brightness < T.minBrightness || m.brightness > T.maxBrightness) { stats.lowQuality++; await reject("low_quality_local", { dhash: hash }); return; }

    const dup = known.find(k => image.hamming(k.hash, hash) <= T.maxHashDistance);
    if (dup) { stats.duplicates++; await reject("duplicate", { dhash: hash, duplicateOf: dup.id }); return; }

    if (classifyLeft <= 0) return "budget";
    classifyLeft--; stats.classified++;
    let cls;
    try { cls = await classifier.classify(await image.modelImage(fetched.buf)); }
    catch (e) {
      if (e.fatal) { fatal = true; note("classify_fatal", e); return "fatal"; }
      stats.transientErrors++; note("classify", e); return;   // not stored: it will be retried on a later run
    }

    const reason = judge(cls, opts);
    const analysis = analysisOf(cls, m);
    const common = { dhash: hash, room: cls.room, roomConfidence: cls.roomConfidence, style: cls.style, isInterior: cls.isInterior, quality: cls.quality, analysis, width: m.width, height: m.height };
    if (reason) { await reject(reason, common); return; }
    const rel = relevance({ roomConfidence: cls.roomConfidence, quality: cls.quality, width: m.width, height: m.height, shot: cls.shot, room: cls.room, queryRoom });
    stats.accepted++;
    const id = opts.dryRun ? null : await dbm.insertImage(db, { ...rec, ...common, status: "accepted", relevance: rel });
    known.push({ id, hash });
  }

  const sourceNames = Object.keys(sources);
  outer: for (const name of sourceNames) {
    const src = sources[name], limiter = d.limiters && d.limiters[name];
    if (!opts.dryRun) await dbm.ensureQueries(db, name, opts.queryPlan);
    let queries = await dbm.nextQueries(db, name, opts.maxQueries, opts.reopenDays ?? 14);
    if (opts.dryRun && !queries.length) queries = opts.queryPlan.flatMap(g => g.terms.map(t => ({ id: null, query: t, room_hint: g.room, next_page: 1, exhausted: false }))).slice(0, opts.maxQueries);
    for (const q of queries) {
      stats.queries++;
      let page = q.exhausted ? 1 : q.next_page, exhausted = false, seenTotal = 0, stop = false;   // a reopened query starts over
      for (let p = 0; p < opts.maxPages && !stop; p++, page++) {
        let resp;
        try {
          const key = `${name}|${q.query}|${page}|${src.perPage}`;
          const cached = await dbm.cacheGet(db, key, T.cacheTtlHours);
          if (cached) { resp = cached; stats.cacheHits++; }
          else {
            resp = await src.search({ query: q.query, page, perPage: src.perPage });
            stats.apiCalls[name] = (stats.apiCalls[name] || 0) + 1;
            await dbm.cacheSet(db, key, { items: resp.items, hasMore: resp.hasMore, total: resp.total });
          }
        } catch (e) {
          if (e instanceof RateLimitExhausted) { stats.stoppedBy = `rate_limit:${name}`; note(`rate_limit:${name}`, e); stop = true; break; }
          if (e instanceof AuthError) { stats.stoppedBy = `auth:${name}`; note(`auth:${name}`, e); stop = true; break; }
          stats.transientErrors++; note(`search:${name}`, e); stop = true; break;
        }

        const items = resp.items || [];
        stats.candidates += items.length;
        const knownIds = await dbm.knownSourceIds(db, name, items.map(i => i.sourceId));
        const fresh = [];
        for (const c of items) {
          if (knownIds.has(c.sourceId)) { stats.alreadyKnown++; continue; }
          const pre = prefilter(c);
          if (pre) { stats.prefiltered++; stats.rejected++; if (!opts.dryRun) await dbm.insertImage(db, { source: c.source, sourceId: c.sourceId, pageUrl: c.pageUrl, imageUrl: c.imageUrl,
            width: c.width, height: c.height, license: c.license, licenseUrl: c.licenseUrl, status: "rejected", rejectReason: pre, queryText: q.query }); continue; }
          fresh.push(c);
        }

        // download + hash in parallel (safe: pure functions); everything stateful runs sequentially afterwards
        const batch = fresh.slice(0, Math.max(0, classifyLeft + 25));   // never download far more than we can classify
        const fetched = await mapLimit(batch, opts.concurrency, async (c) => {
          try { return { buf: await fetchImage(c.imageUrl, d.fetchOpts) }; } catch (e) { return { error: e }; }
        });
        let pageComplete = batch.length === fresh.length;
        for (let i = 0; i < batch.length; i++) {
          const r = await processCandidate(batch[i], q.room_hint, q.query, fetched[i]);
          if (r === "budget" || r === "fatal") { pageComplete = false; stop = true; if (r === "budget") stats.stoppedBy = stats.stoppedBy || "classify_budget"; break; }
        }
        seenTotal += items.length;
        if (!pageComplete) break;                                  // do not advance the cursor over unprocessed photos
        if (!resp.hasMore) { exhausted = true; page++; break; }
        if (fatal) break;
      }
      if (!opts.dryRun) await dbm.saveProgress(db, q.id, { nextPage: page, exhausted, seen: seenTotal });
      if (fatal || stats.stoppedBy === "classify_budget") break outer;
      if (stats.stoppedBy && stats.stoppedBy.endsWith(`:${name}`)) break;   // this source is spent: move to the next source
    }
    if (fatal) { stats.stoppedBy = "fatal_error"; break; }
  }

  const status = fatal ? "failed" : (stats.stoppedBy || errors.length) ? "partial" : "completed";
  if (!opts.dryRun) await dbm.runFinish(db, runId, { stats, errors, status });
  return { runId, status, stats, errors };
}

module.exports = { collect, prefilter, judge, emptyStats, RateLimiter };
