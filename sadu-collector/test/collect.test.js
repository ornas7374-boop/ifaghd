// End-to-end collection runs with fake APIs, synthetic photos and a fake vision model.

const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const dbm = require("../src/db");
const { collect, judge, prefilter } = require("../src/collect");
const { RateLimiter, RateLimitExhausted, AuthError } = require("../src/http");
const { verifyLinks } = require("../src/verify");
const { newDb, photo, fakeSource, cand, fakeClassifier, GOOD } = require("./helpers");

const PLAN = [{ room: "kitchen", terms: ["luxury kitchen"] }];
const hdrs = (o = {}) => ({ get: (k) => o[k.toLowerCase()] ?? null });

/** Fake downloader: serves a synthetic photo per image URL id. */
function fakeFetchImage(map, log = []) {
  return async (url) => {
    log.push(url);
    const id = url.split("/").pop().replace(".jpg", "");
    const v = map[id];
    if (v === undefined) throw Object.assign(new Error("broken"), { code: "broken" });
    if (v instanceof Error) throw v;
    return v;
  };
}

async function setup(pages, { photos, answer = GOOD, source = "pexels", opts = {}, srcOpts } = {}) {
  const db = await newDb();
  const src = fakeSource(source, pages, srcOpts);
  const downloads = [];
  const classifier = fakeClassifier(answer);
  const run = () => collect({ db, sources: { [source]: src }, classifier, fetchImage: fakeFetchImage(photos, downloads), opts: { queryPlan: PLAN, ...opts } });
  return { db, src, classifier, downloads, run };
}

const count = async (db, where = "true") => (await db.query(`select count(*)::int n from reference_images where ${where}`)).rows[0].n;

test("happy path: accepts good photos with full attribution, license and analysis", async () => {
  const photos = { 1: await photo(11), 2: await photo(12), 3: await photo(13) };
  const t = await setup([[cand("pexels", 1), cand("pexels", 2), cand("pexels", 3)]], { photos });
  const r = await t.run();
  assert.equal(r.status, "completed");
  assert.equal(r.stats.accepted, 3); assert.equal(r.stats.classified, 3);
  const row = (await t.db.query("select * from reference_images where source_id = '1'")).rows[0];
  assert.equal(row.status, "accepted"); assert.equal(row.room, "kitchen"); assert.equal(row.style, "warm_luxury");
  assert.equal(row.photographer, "Test Photographer"); assert.equal(row.license, "pexels license"); assert.ok(row.license_url && row.page_url && row.image_url);
  assert.deepEqual(row.analysis.objects, ["kitchen island", "bar stool", "pendant light"]);
  assert.ok(row.relevance > 0.5 && row.dhash !== null && row.checked_at);
  assert.equal(row.width, 1600, "real dimensions measured from the file, not trusted from the API");
});

test("never processes the same photo twice, and a re-run costs nothing", async () => {
  const photos = { 1: await photo(21), 2: await photo(22) };
  const t = await setup([[cand("pexels", 1), cand("pexels", 2)]], { photos });
  await t.run();
  const downloadsAfterFirst = t.downloads.length, classifiedAfterFirst = t.classifier.calls.length, apiAfterFirst = t.src.calls.length;
  await t.db.query("update collection_queries set last_run_at = now() - interval '20 days'");   // the query comes around again
  const r2 = await t.run();
  assert.equal(t.src.calls.length, apiAfterFirst, "the page came from the cache: no API call");
  assert.equal(t.downloads.length, downloadsAfterFirst, "no download");
  assert.equal(t.classifier.calls.length, classifiedAfterFirst, "no paid vision call");
  assert.equal(r2.stats.alreadyKnown, 2);
  assert.equal(await count(t.db), 2);
});

test("duplicates: the same picture under another id, recompressed or resized, is rejected before any paid call", async () => {
  const base = await photo(31, { w: 2400, h: 1500 });
  const recompressed = await sharp(base).resize(1800).jpeg({ quality: 55 }).toBuffer();
  const photos = { 1: base, 2: recompressed, 3: await photo(32) };
  const t = await setup([[cand("pexels", 1), cand("pexels", 2), cand("pexels", 3)]], { photos });
  const r = await t.run();
  assert.equal(r.stats.duplicates, 1);
  assert.equal(t.classifier.calls.length, 2, "the duplicate was never sent to the vision model");
  const dup = (await t.db.query("select status, reject_reason, duplicate_of from reference_images where source_id = '2'")).rows[0];
  assert.equal(dup.reject_reason, "duplicate"); assert.ok(dup.duplicate_of);
});

test("duplicates are detected across sources", async () => {
  const db = await newDb();
  const base = await photo(41, { w: 2400, h: 1500 });
  const classifier = fakeClassifier(GOOD);
  const mk = (n, id) => fakeSource(n, [[cand(n, id)]]);
  await collect({ db, sources: { unsplash: mk("unsplash", "u1") }, classifier, fetchImage: fakeFetchImage({ u1: base }), opts: { queryPlan: PLAN } });
  const r = await collect({ db, sources: { pexels: mk("pexels", "p1") }, classifier, fetchImage: fakeFetchImage({ p1: await sharp(base).resize(1800).jpeg({ quality: 60 }).toBuffer() }), opts: { queryPlan: PLAN } });
  assert.equal(r.stats.duplicates, 1); assert.equal(classifier.calls.length, 1);
});

test("quality control: small, extreme-ratio, blurry, dark, broken and irrelevant results are filtered with reasons", async () => {
  const pages = [[cand("pexels", "small", { width: 600, height: 400 }), cand("pexels", "wide", { width: 6000, height: 1000 }), cand("pexels", "blur"),
    cand("pexels", "dark"), cand("pexels", "dead"), cand("pexels", "ext"), cand("pexels", "ok")]];
  const photos = { blur: await photo(51, { blur: 30 }), dark: await photo(52, { dark: true }), ext: await photo(53), ok: await photo(54) };
  let call = 0;
  const t = await setup(pages, { photos, answer: () => (++call === 1 ? { ...GOOD, isInterior: false } : GOOD) });
  const r = await t.run();
  const reasons = Object.fromEntries((await t.db.query("select source_id, status, reject_reason from reference_images")).rows.map(x => [x.source_id, `${x.status}:${x.reject_reason}`]));
  assert.deepEqual(reasons, { small: "rejected:too_small", wide: "rejected:bad_aspect", blur: "rejected:low_quality_local", dark: "rejected:low_quality_local",
    dead: "broken:url_dead", ext: "rejected:not_interior", ok: "accepted:null" });
  assert.equal(r.stats.classified, 2, "only the two that passed the free checks reached the vision model");
  assert.ok(!t.downloads.some(u => u.includes("small") || u.includes("wide")), "prefilter rejected them before any download");
});

test("judge: rejects people, watermarks, low confidence, details, wrong-room objects; accepts a clean wide interior", () => {
  assert.equal(judge(GOOD, {}), null);
  assert.equal(judge({ ...GOOD, hasPeople: true }, {}), "has_people");
  assert.equal(judge({ ...GOOD, hasPeople: true }, { allowPeople: true }), null);
  assert.equal(judge({ ...GOOD, hasTextOrWatermark: true }, {}), "text_or_watermark");
  assert.equal(judge({ ...GOOD, roomConfidence: 0.4 }, {}), "low_room_confidence");
  assert.equal(judge({ ...GOOD, shot: "detail" }, {}), "not_a_room_view");
  assert.equal(judge({ ...GOOD, room: "other" }, {}), "room_unknown");
  assert.equal(judge({ ...GOOD, quality: 0.3 }, {}), "low_quality");
  assert.equal(judge({ ...GOOD, conflicts: ["bed"] }, {}), "room_object_conflict");
  assert.equal(prefilter(cand("x", 1)), null);
});

test("cost cap: stops at maxClassify and the next run continues from the SAME page without skipping anything", async () => {
  const pages = [[cand("pexels", 1), cand("pexels", 2), cand("pexels", 3)], [cand("pexels", 4), cand("pexels", 5), cand("pexels", 6)]];
  const photos = Object.fromEntries(await Promise.all([1, 2, 3, 4, 5, 6].map(async (i) => [i, await photo(60 + i)])));
  const t = await setup(pages, { photos, opts: { maxClassify: 2, maxPages: 2 } });
  const r1 = await t.run();
  assert.equal(r1.stats.classified, 2); assert.equal(r1.status, "partial"); assert.equal(r1.stats.stoppedBy, "classify_budget");
  assert.equal(await count(t.db), 2);
  const q = (await t.db.query("select next_page from collection_queries")).rows[0];
  assert.equal(q.next_page, 1, "cursor stayed on the page that was not finished");
  const run2 = () => collect({ db: t.db, sources: { pexels: t.src }, classifier: t.classifier, fetchImage: fakeFetchImage(photos, t.downloads), opts: { queryPlan: PLAN, maxClassify: 10, maxPages: 5 } });
  const r2 = await run2();
  assert.equal(await count(t.db, "status = 'accepted'"), 6, "every photo ended up processed exactly once");
  assert.equal(r2.stats.accepted, 4);
  assert.equal((await t.db.query("select exhausted from collection_queries")).rows[0].exhausted, true);
  assert.equal(t.classifier.calls.length, 6);
});

test("pagination cursor advances across runs; cached API pages are not requested twice", async () => {
  const pages = [[cand("pexels", 1)], [cand("pexels", 2)], [cand("pexels", 3)]];
  const photos = { 1: await photo(71), 2: await photo(72), 3: await photo(73) };
  const t = await setup(pages, { photos, opts: { maxPages: 1 } });
  await t.run(); await t.run(); await t.run();
  assert.deepEqual(t.src.calls.map(c => c.page), [1, 2, 3]);
  assert.equal(await count(t.db), 3);
});

test("a cached API response is reused (no second API call for the same page)", async () => {
  const photos = { 1: await photo(81) };
  const t = await setup([[cand("pexels", 1)]], { photos, opts: { maxPages: 1 } });
  await t.run();
  await t.db.query("update collection_queries set next_page = 1, exhausted = false");   // force the same page again
  const r = await t.run();
  assert.equal(t.src.calls.length, 1, "second run served from api_cache");
  assert.equal(r.stats.cacheHits, 1);
});

test("rate limit: stops that source cleanly, keeps what it collected, saves the cursor, and the run is 'partial'", async () => {
  const photos = { 1: await photo(91), 2: await photo(92) };
  let n = 0;
  const t = await setup([[cand("pexels", 1)], [cand("pexels", 2)], [cand("pexels", 3)]], { photos, opts: { maxPages: 5 },
    srcOpts: { onSearch: async () => { if (++n === 2) throw new RateLimitExhausted("pexels", 3_600_000); } } });
  const r = await t.run();
  assert.equal(r.status, "partial"); assert.equal(r.stats.stoppedBy, "rate_limit:pexels");
  assert.equal(await count(t.db, "status = 'accepted'"), 1);
  assert.equal((await t.db.query("select next_page from collection_queries")).rows[0].next_page, 2, "resume from page 2");
  const logged = (await t.db.query("select status, errors from collection_runs order by id desc limit 1")).rows[0];
  assert.equal(logged.status, "partial"); assert.ok(logged.errors.length >= 1);
});

test("one source being spent does not stop the other source", async () => {
  const db = await newDb();
  const photos = { p1: await photo(95) };
  const unsplash = fakeSource("unsplash", [[cand("unsplash", "u1")]], { onSearch: async () => { throw new RateLimitExhausted("unsplash", 1) } });
  const pexels = fakeSource("pexels", [[cand("pexels", "p1")]]);
  const r = await collect({ db, sources: { unsplash, pexels }, classifier: fakeClassifier(GOOD), fetchImage: fakeFetchImage(photos), opts: { queryPlan: PLAN } });
  assert.equal(r.stats.accepted, 1, "Pexels still collected");
  assert.equal(r.stats.stoppedBy, "rate_limit:unsplash");
});

test("a bad API key ends that source with a clear error and never retries", async () => {
  const t = await setup([[cand("pexels", 1)]], { photos: {}, srcOpts: { onSearch: async () => { throw new AuthError("pexels", 401); } } });
  const r = await t.run();
  assert.equal(r.stats.stoppedBy, "auth:pexels"); assert.equal(t.src.calls.length, 1);
});

test("transient failures are retried next time, not stored as verdicts", async () => {
  const photos = { 1: new Error("net"), 2: await photo(101) };
  photos[1].code = "fetch_failed";
  let fail = true;
  const t = await setup([[cand("pexels", 1), cand("pexels", 2)]], { photos });
  const r1 = await t.run();
  assert.equal(r1.stats.transientErrors, 1);
  assert.equal(await count(t.db, "source_id = '1'"), 0, "not recorded: a network hiccup says nothing about the photo");
  photos[1] = await photo(102);
  await t.db.query("update collection_queries set next_page = 1, exhausted = false"); await t.db.query("delete from api_cache");
  await t.run();
  assert.equal(await count(t.db, "source_id = '1' and status = 'accepted'"), 1, "picked up on the next run");
});

test("classifier transient failure: photo is not stored; fatal failure (no credit / no model) ends the run as 'failed'", async () => {
  const photos = { 1: await photo(111), 2: await photo(112) };
  const t = await setup([[cand("pexels", 1), cand("pexels", 2)]], { photos, answer: (n) => (n === 1 ? new Error("replicate_500") : GOOD) });
  const r = await t.run();
  assert.equal(r.stats.accepted, 1); assert.equal(await count(t.db, "source_id = '1'"), 0);
  const f = await setup([[cand("pexels", 1), cand("pexels", 2)]], { photos, answer: () => Object.assign(new Error("replicate_no_credit"), { fatal: true }) });
  const rf = await f.run();
  assert.equal(rf.status, "failed"); assert.equal(f.classifier.calls.length, 1, "stopped at the first fatal error, no money burned");
  assert.equal((await f.db.query("select next_page from collection_queries")).rows[0].next_page, 1);
});

test("a finished query reopens after the quiet period, so the library keeps growing as new photos appear", async () => {
  const db = await newDb();
  await dbm.ensureQueries(db, "pexels", PLAN);
  const q = (await dbm.nextQueries(db, "pexels", 5))[0];
  await dbm.saveProgress(db, q.id, { nextPage: 9, exhausted: true, seen: 100 });
  assert.equal((await dbm.nextQueries(db, "pexels", 5)).length, 0, "just finished: not offered");
  await db.query("update collection_queries set last_run_at = now() - interval '15 days'");
  const again = await dbm.nextQueries(db, "pexels", 5);
  assert.equal(again.length, 1); assert.equal(again[0].exhausted, true);
  const src = fakeSource("pexels", [[cand("pexels", 500)]]);
  await collect({ db, sources: { pexels: src }, classifier: fakeClassifier(GOOD), fetchImage: fakeFetchImage({ 500: await photo(500) }), opts: { queryPlan: PLAN } });
  assert.equal(src.calls[0].page, 1, "starts again from page 1");
});

test("dry run: reads and decides but writes nothing", async () => {
  const photos = { 1: await photo(121) };
  const t = await setup([[cand("pexels", 1)]], { photos, opts: { dryRun: true } });
  const r = await t.run();
  assert.equal(r.stats.accepted, 1);
  assert.equal(await count(t.db), 0);
  assert.equal((await t.db.query("select count(*)::int n from collection_runs")).rows[0].n, 0);
});

test("link check: dead URLs are marked broken, live ones stamped, transient errors left alone", async () => {
  const db = await newDb();
  for (const id of ["live", "dead", "flaky"])
    await dbm.insertImage(db, { source: "pexels", sourceId: id, pageUrl: "u", imageUrl: `https://images.pexels.com/${id}.jpg`, license: "L", status: "accepted", room: "kitchen" });
  const fetchImpl = async (url) => (url.includes("dead") ? { ok: false, status: 404, headers: hdrs() } : url.includes("flaky") ? { ok: false, status: 503, headers: hdrs() } : { ok: true, status: 200, headers: hdrs() });
  await db.query("update reference_images set checked_at = null");
  const r = await verifyLinks(db, { olderThanDays: 7, fetchImpl });
  assert.deepEqual([r.alive, r.broken, r.unknown], [1, 1, 1]);
  const st = Object.fromEntries((await db.query("select source_id, status from reference_images")).rows.map(x => [x.source_id, x.status]));
  assert.deepEqual(st, { live: "accepted", dead: "broken", flaky: "accepted" });
  assert.equal((await dbm.search(db, { room: "kitchen" })).length, 2, "broken images never come back from search");
  assert.equal((await verifyLinks(db, { olderThanDays: 7, fetchImpl })).checked, 1, "only the unknown one is still due");
});
