// Unit tests: database, hashing, image safety, rate limiting, source adapters, classification parsing.

const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const dbm = require("../src/db");
const image = require("../src/image");
const { newDb, photo } = require("./helpers");
const { RateLimiter, RateLimitExhausted, AuthError, getJson } = require("../src/http");
const unsplash = require("../src/sources/unsplash");
const pexels = require("../src/sources/pexels");
const { parseAnswer } = require("../src/classify");
const { relevance } = require("../src/score");

const hdrs = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });
const res = (status, body, headers = {}) => ({ status, ok: status < 300, headers: hdrs(headers), json: async () => body });

// ---------- database ----------

test("schema: migrates once, enforces uniqueness and locks the Data API with RLS", async () => {
  const db = await newDb();
  assert.deepEqual(await dbm.migrate(db), [], "second migrate applies nothing");
  const rls = await db.query("select relname, relrowsecurity from pg_class where relname in ('reference_images','collection_queries','api_cache','collection_runs') order by 1");
  assert.ok(rls.rows.length === 4 && rls.rows.every(r => r.relrowsecurity === true), "RLS enabled on every table");
  const pol = await db.query("select count(*)::int n from pg_policies");
  assert.equal(pol.rows[0].n, 0, "no policies: anon/authenticated roles get nothing");
  const rec = { source: "pexels", sourceId: "1", pageUrl: "u", imageUrl: "i", license: "L", status: "accepted" };
  assert.ok(await dbm.insertImage(db, rec));
  assert.equal(await dbm.insertImage(db, rec), null, "same (source, source_id) is not inserted twice");
  await assert.rejects(db.query("insert into reference_images (source, source_id, page_url, image_url, license, status) values ('flickr','1','u','i','L','accepted')"), /check/);
});

test("insert round-trips a 64-bit hash and JSON analysis; search ranks by relevance", async () => {
  const db = await newDb();
  const h = BigInt.asIntN(64, 0xf0f0f0f0f0f0f0f0n);
  for (const [id, rel, style] of [["a", 0.5, "warm_luxury"], ["b", 0.9, "warm_luxury"], ["c", 0.7, "night_luxury"]])
    await dbm.insertImage(db, { source: "unsplash", sourceId: id, pageUrl: "u", imageUrl: "i", license: "L", status: "accepted", room: "kitchen", style, relevance: rel, dhash: h + BigInt(id.charCodeAt(0)), analysis: { objects: ["sofa"] } });
  const hashes = await dbm.loadHashes(db);
  assert.equal(hashes.length, 3);
  assert.ok(hashes.some(x => x.hash === h + 97n), "hash survives the round trip exactly");
  const top = await dbm.search(db, { room: "kitchen", limit: 10 });
  assert.deepEqual(top.map(r => r.relevance), [0.9, 0.7, 0.5]);
  assert.equal((await dbm.search(db, { room: "kitchen", style: "night_luxury" })).length, 1);
  assert.deepEqual(top[0].analysis, { objects: ["sofa"] });
});

test("query cursor: resumes where it stopped, least recently run first, exhausted last", async () => {
  const db = await newDb();
  await dbm.ensureQueries(db, "pexels", [{ room: "kitchen", terms: ["a", "b", "c"] }]);
  let qs = await dbm.nextQueries(db, "pexels", 2);
  assert.deepEqual(qs.map(q => q.query), ["a", "b"]);
  await dbm.saveProgress(db, qs[0].id, { nextPage: 3, exhausted: false, seen: 40 });
  await dbm.saveProgress(db, qs[1].id, { nextPage: 5, exhausted: true, seen: 10 });
  qs = await dbm.nextQueries(db, "pexels", 5);
  assert.deepEqual(qs.map(q => q.query), ["c", "a"], "never-run first, then the least recently run; exhausted is skipped");
  assert.equal(qs[1].next_page, 3);
});

test("cache: honours the time to live", async () => {
  const db = await newDb();
  await dbm.cacheSet(db, "k", { items: [1] });
  assert.deepEqual(await dbm.cacheGet(db, "k", 24), { items: [1] });
  await db.query("update api_cache set fetched_at = now() - interval '30 hours'");
  assert.equal(await dbm.cacheGet(db, "k", 24), null);
});

// ---------- image ----------

test("dHash: the same picture survives resize and recompression; different pictures differ", async () => {
  const a = await photo(1), b = await photo(2);
  const ha = await image.dHash(a);
  const resized = await sharp(a).resize(800).jpeg({ quality: 50 }).toBuffer();
  const hr = await image.dHash(resized);
  assert.ok(image.hamming(ha, hr) <= 8, `near-duplicate distance ${image.hamming(ha, hr)}`);
  assert.ok(image.hamming(ha, await image.dHash(b)) > 12, "different photo is not a duplicate");
  assert.equal(image.hamming(ha, ha), 0);
  assert.ok(ha >= -(2n ** 63n) && ha < 2n ** 63n, "fits a signed bigint");
});

test("measure: flags blurry and too-dark images", async () => {
  const sharpP = await image.measure(await photo(3));
  const blurry = await image.measure(await photo(3, { blur: 25 }));
  const dark = await image.measure(await photo(3, { dark: true }));
  assert.ok(sharpP.sharpness > blurry.sharpness * 5, `${sharpP.sharpness} vs ${blurry.sharpness}`);
  assert.ok(dark.brightness < 0.06, `dark brightness ${dark.brightness}`);
});

test("download is restricted to the image hosts, https only, and classifies dead links", async () => {
  const ok = { ok: true, status: 200, headers: hdrs({ "content-type": "image/jpeg" }), arrayBuffer: async () => await photo(4) };
  assert.ok((await image.fetchImage("https://images.unsplash.com/a.jpg", { fetchImpl: async () => ok })).length > 1000);
  for (const bad of ["http://images.unsplash.com/a.jpg", "https://evil.com/a.jpg", "https://images.unsplash.com.evil.com/a.jpg", "https://169.254.169.254/x",
    "https://user:pw@images.unsplash.com/a.jpg", "file:///etc/passwd", "not a url"])
    await assert.rejects(image.fetchImage(bad, { fetchImpl: async () => ok }), (e) => e.code === "blocked_host" || e.code === "bad_url", bad);
  await assert.rejects(image.fetchImage("https://images.pexels.com/a.jpg", { fetchImpl: async () => ({ ok: false, status: 404, headers: hdrs({}) }) }), (e) => e.code === "broken");
  await assert.rejects(image.fetchImage("https://images.pexels.com/a.jpg", { fetchImpl: async () => ({ ok: false, status: 503, headers: hdrs({}) }) }), (e) => e.code === "fetch_failed");
  await assert.rejects(image.fetchImage("https://images.pexels.com/a.jpg", { fetchImpl: async () => ({ ok: true, status: 200, headers: hdrs({ "content-type": "text/html" }), arrayBuffer: async () => Buffer.from("x") }) }), (e) => e.code === "not_image");
  await assert.rejects(image.fetchImage("https://images.pexels.com/a.jpg", { fetchImpl: async () => ({ ok: true, status: 200, headers: hdrs({ "content-type": "image/jpeg", "content-length": "99999999" }), arrayBuffer: async () => Buffer.alloc(1) }) }), (e) => e.code === "too_large");
});

// ---------- rate limiting & retries ----------

test("rate limiter: reads the allowance from headers and stops cleanly when it is spent", async () => {
  const l = new RateLimiter({ name: "unsplash", maxWaitMs: 1000 });
  l.update(hdrs({ "x-ratelimit-remaining": "0" }));
  await assert.rejects(l.acquire(), (e) => e instanceof RateLimitExhausted, "no reset time known → end the run for this source");
  const l2 = new RateLimiter({ name: "pexels", maxWaitMs: 5000, sleep: async (ms) => { l2.slept = ms; }, now: () => 1_000_000 });
  l2.update(hdrs({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(1_002)}));  // reset in 2 s (epoch seconds)
  await l2.acquire();
  assert.ok(l2.slept >= 2000 && l2.slept < 3000, `short wait is honoured: ${l2.slept}`);
  const l3 = new RateLimiter({ name: "x", maxCalls: 2 });
  await l3.acquire(); await l3.acquire();
  await assert.rejects(l3.acquire(), RateLimitExhausted, "per-run call cap");
});

test("getJson: retries 5xx, waits on short 429, never retries or leaks on auth errors", async () => {
  const slept = [];
  let n = 0;
  const r1 = await getJson("https://x/y", { fetchImpl: async () => (++n < 3 ? res(503, {}) : res(200, { ok: 1 })), sleep: async (ms) => slept.push(ms) });
  assert.deepEqual(r1.json, { ok: 1 }); assert.equal(n, 3);
  n = 0;
  const r2 = await getJson("https://x/y", { fetchImpl: async () => (++n === 1 ? res(429, {}, { "retry-after": "2" }) : res(200, { ok: 2 })), sleep: async (ms) => slept.push(ms) });
  assert.deepEqual(r2.json, { ok: 2 }); assert.ok(slept.includes(2000));
  await assert.rejects(getJson("https://x/y", { fetchImpl: async () => res(429, {}, { "retry-after": "3600" }), source: "p", sleep: async () => {} }), RateLimitExhausted);
  n = 0;
  await assert.rejects(getJson("https://x/y", { fetchImpl: async () => { n++; return res(401, {}); }, source: "p" }), (e) => e instanceof AuthError && !String(e.message).includes("Client-ID"));
  assert.equal(n, 1, "no retry on 401");
  const lim = new RateLimiter({ name: "unsplash" });
  await assert.rejects(getJson("https://x/y", { limiter: lim, source: "unsplash", fetchImpl: async () => res(403, {}, { "x-ratelimit-remaining": "0" }) }), RateLimitExhausted, "403 with an empty allowance is a rate limit, not a bad key");
});

// ---------- source adapters ----------

test("unsplash adapter: normalises the documented shape and credits with referral links; key only in the header", async () => {
  let seen;
  const src = unsplash.create({ accessKey: "KEY123", fetchImpl: async (url, init) => { seen = { url, init };
    return res(200, { total: 90, total_pages: 3, results: [{ id: "abc", width: 4000, height: 3000, description: "A majlis", urls: { regular: "https://images.unsplash.com/photo-1?w=1080" },
      links: { html: "https://unsplash.com/photos/abc" }, user: { name: "Jane", links: { html: "https://unsplash.com/@jane" } } }, { id: "bad" }] }, { "x-ratelimit-remaining": "49" }); } });
  const r = await src.search({ query: "majlis", page: 2 });
  assert.ok(seen.url.includes("query=majlis") && seen.url.includes("page=2") && seen.url.includes("per_page=30"));
  assert.equal(seen.init.headers.Authorization, "Client-ID KEY123"); assert.ok(!seen.url.includes("KEY123"), "key never in the URL");
  assert.equal(r.items.length, 1); assert.equal(r.hasMore, true);
  assert.equal(r.items[0].photographer, "Jane");
  assert.ok(r.items[0].pageUrl.includes("utm_source=sadu") && r.items[0].photographerUrl.includes("utm_medium=referral"));
  assert.equal(r.items[0].license, "Unsplash License");
});

test("pexels adapter: bare key in Authorization, normalises the documented shape", async () => {
  let seen;
  const src = pexels.create({ apiKey: "PEXKEY", fetchImpl: async (url, init) => { seen = { url, init };
    return res(200, { page: 1, total_results: 500, next_page: "https://api.pexels.com/v1/search?page=2", photos: [{ id: 77, width: 5000, height: 3300, url: "https://www.pexels.com/photo/77/",
      photographer: "Sam", photographer_url: "https://www.pexels.com/@sam", alt: "kitchen", src: { large2x: "https://images.pexels.com/photos/77/p.jpeg?w=940" } }] }); } });
  const r = await src.search({ query: "kitchen" });
  assert.equal(seen.init.headers.Authorization, "PEXKEY");
  assert.ok(seen.url.includes("per_page=80"));
  assert.equal(r.items[0].sourceId, "77"); assert.equal(r.hasMore, true); assert.equal(r.items[0].photographer, "Sam");
  assert.throws(() => pexels.create({}), /PEXELS_API_KEY/);
});

// ---------- classification parsing ----------

test("classification: validates, normalises and flags objects that do not belong in the room", () => {
  const ok = parseAnswer('noise {"is_interior":true,"shot":"wide","room":"kitchen","room_confidence":0.9,"style":"warm_luxury","quality":0.8,"has_people":false,"has_text_or_watermark":false,"objects":["Kitchen Island","Bar Stool"],"materials":["Marble"],"colors":["white"],"lighting":"daylight","architecture":["window"],"camera":{"angle":"eye-level","composition":"c"},"summary":"s"} tail');
  assert.equal(ok.room, "kitchen"); assert.deepEqual(ok.objects, ["kitchen island", "bar stool"]); assert.deepEqual(ok.conflicts, []);
  const bad = parseAnswer('{"is_interior":true,"shot":"wide","room":"kitchen","room_confidence":2,"style":"cyberpunk","quality":-1,"objects":["bed","sofa","stove"]}');
  assert.equal(bad.style, "other"); assert.equal(bad.roomConfidence, 1); assert.equal(bad.quality, 0);
  assert.deepEqual(bad.conflicts.sort(), ["bed", "sofa"], "a bed in a kitchen is a contradiction");
  assert.equal(parseAnswer('{"room":"garage"}').room, "other");
  assert.throws(() => parseAnswer("no json"), /classify_no_json/);
});

test("relevance: confident, sharp, large, wide shots rank above weak ones", () => {
  const best = relevance({ roomConfidence: 0.95, quality: 0.9, width: 4000, height: 2600, shot: "wide", room: "kitchen", queryRoom: "kitchen" });
  const weak = relevance({ roomConfidence: 0.65, quality: 0.56, width: 1100, height: 900, shot: "medium", room: "kitchen", queryRoom: "bedroom" });
  assert.ok(best > 0.9 && weak < 0.6 && best > weak, `${best} vs ${weak}`);
});
