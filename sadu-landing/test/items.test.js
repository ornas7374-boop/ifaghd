// "Shop the look" tests (network simulated). Run: node --test test/items.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseItems, storeLinks } = require("../api/_lib/shopItems");

const IMG = "data:image/jpeg;base64,AAAA";
const ANSWER = JSON.stringify({ items: [
  { name_ar: "كنب زاوية مخمل", name_en: "velvet corner sofa", category: "seating", material_ar: "مخمل", color_ar: "بيج", quantity: 1, price_min_sar: 3500, price_max_sar: 7000, search_ar: "كنب زاوية مخمل بيج", search_en: "beige velvet corner sofa" },
  { name_ar: "كرسي جانبي", category: "seating", quantity: 2, price_min_sar: 900, price_max_sar: 400, search_ar: "كرسي جانبي" },
  { name_ar: "", category: "decor" },
  { name_ar: "<script>x</script> مزهرية", category: "spaceship", price_min_sar: -5, price_max_sar: 150 }
] });

test("parses items, fixes swapped prices, drops nameless, sanitises text and category", () => {
  const r = parseItems("```json\n" + ANSWER + "\n```");
  assert.equal(r.items.length, 3);
  assert.equal(r.items[1].price_min_sar, 400); assert.equal(r.items[1].price_max_sar, 900);
  assert.ok(!/[<>]/.test(r.items[2].name_ar));
  assert.equal(r.items[2].category, "other");
  assert.equal(r.items[2].price_min_sar, 150, "missing min falls back to max");
  assert.equal(r.total_min, 3500 + 400 * 2 + 150);
  assert.equal(r.total_max, 7000 + 900 * 2 + 150);
});

test("store links are search URLs with encoded queries; Amazon tag only when configured", () => {
  const it = { name_ar: "طاولة", search_ar: "طاولة قهوة رخام", search_en: "marble coffee table" };
  const l = storeLinks(it);
  assert.deepEqual(l.map(x => x.store), ["نون", "أمازون", "ايكيا", "قوقل"]);
  assert.ok(l[0].url.startsWith("https://www.noon.com/saudi-ar/search/?q=%D8"));
  assert.ok(l[2].url.endsWith("marble%20coffee%20table"));
  assert.ok(!l[1].url.includes("tag="));
  assert.ok(storeLinks(it, { amazonTag: "sadu-21" })[1].url.endsWith("&tag=sadu-21"));
});

test("rejects answers with no items", () => {
  assert.throws(() => parseItems('{"items":[]}'), /items_none/);
  assert.throws(() => parseItems("nothing"), /items_no_json/);
});

function mockFetch(handler) {
  const calls = [], real = global.fetch;
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    const { status = 200, json } = handler(String(url));
    return { ok: status < 300, status, headers: { get: () => null }, json: async () => json };
  };
  return { calls, restore: () => { global.fetch = real; } };
}
const mk = () => ({ code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

test("endpoint: needs the Gemini key, rejects foreign URLs (no open proxy), returns items", async () => {
  const handler = require("../api/items");
  const saved = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const r0 = mk(); await handler({ method: "POST", body: { image: IMG } }, r0); assert.equal(r0.body.error, "missing_token");
    process.env.GEMINI_API_KEY = "g";
    const r1 = mk(); await handler({ method: "GET" }, r1); assert.equal(r1.code, 405);
    const m0 = mockFetch(() => ({ status: 500, json: {} }));
    try {
      const r2 = mk(); await handler({ method: "POST", body: { image: "https://evil.example/x.jpg" } }, r2);
      assert.equal(r2.code, 400); assert.equal(m0.calls.length, 0, "must not fetch foreign hosts");
      const r3 = mk(); await handler({ method: "POST", body: { image: "https://169.254.169.254.replicate.delivery.evil.com/x" } }, r3);
      assert.equal(r3.code, 400); assert.equal(m0.calls.length, 0);
    } finally { m0.restore(); }
    const m = mockFetch(() => ({ json: { candidates: [{ content: { parts: [{ text: ANSWER }] } }] } }));
    try {
      const r4 = mk(); await handler({ method: "POST", body: { image: IMG } }, r4);
      assert.equal(r4.code, 200); assert.equal(r4.body.items.length, 3); assert.equal(r4.body.approximate, true);
      assert.ok(m.calls[0].url.includes("generativelanguage"));
    } finally { m.restore(); }
  } finally { if (saved === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved; }
});
