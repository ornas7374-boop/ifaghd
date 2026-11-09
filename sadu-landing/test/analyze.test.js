// Tests for the evaluation analysis (metrics and statistics), on constructed exports.

const test = require("node:test");
const assert = require("node:assert/strict");
const { analyze, toMarkdown, wilson, negativesNeeded } = require("../scripts/analyze-eval");

test("Wilson interval: known values", () => {
  const w = wilson(9, 10);
  assert.ok(Math.abs(w.lo - 0.596) < 0.01 && Math.abs(w.hi - 0.982) < 0.01, JSON.stringify(w));
  assert.equal(wilson(0, 0).p, null);
  assert.ok(wilson(0, 20).hi > 0.05, "20 clean negatives are not enough to show ≤ 5%");
});

test("negatives needed to demonstrate ≤ 5% false acceptance with zero errors", () => {
  const n = negativesNeeded(0.05);
  assert.ok(n >= 70 && n <= 80, String(n)); // ≈ 73 with z = 1.96
});

function result(method, sameRoom, accepted, preserved, extra = {}) {
  return { method, category: extra.category || "bedroom", status: "ok", seconds: 10,
    verdict: { accepted, preservation: { passed: preserved, failures: preserved ? [] : [{ code: "element_removed", element: "window_1" }] }, design: { passed: accepted, issues: [] } },
    rating: { sameRoom, quality: extra.quality ?? 4, realism: 4, seams: !!extra.seams, changed: sameRoom ? [] : ["window"] } };
}

test("false acceptance and false rejection are computed against the human rating", () => {
  const exp = { results: [
    result("A", false, true, true),   // false accept
    result("A", false, false, false), // correct reject
    result("A", true, true, true),    // correct accept
    result("A", true, false, false)   // false reject
  ] };
  const a = analyze(exp);
  assert.equal(a.perMethod.A.far.k, 1); assert.equal(a.perMethod.A.far.n, 2);
  assert.equal(a.perMethod.A.frr.k, 1); assert.equal(a.perMethod.A.frr.n, 2);
  assert.equal(a.farTarget.met, false);
});

test("the 5% target is not claimed on small samples, even with zero errors", () => {
  const rs = [];
  for (let i = 0; i < 30; i++) rs.push(result("A", false, false, false));
  for (let i = 0; i < 30; i++) rs.push(result("A", true, true, true));
  const a = analyze({ results: rs });
  assert.equal(a.pooled.far.k, 0);
  assert.equal(a.farTarget.met, false);
  assert.match(a.farTarget.why, /at least \d+ rated changed-room results/);
});

test("the 5% target is reported as demonstrated only when the upper bound is ≤ 5%", () => {
  const rs = [];
  for (let i = 0; i < 80; i++) rs.push(result("A", false, false, false));
  const a = analyze({ results: rs });
  assert.equal(a.farTarget.met, true);
});

test("recommendation: the clearly better method wins; overlapping methods are not separated", () => {
  const rs = [];
  for (let i = 0; i < 40; i++) rs.push(result("C", true, true, true));
  for (let i = 0; i < 40; i++) rs.push(result("A", i < 12, i < 12, i < 12));
  const a = analyze({ results: rs });
  assert.equal(a.recommendation.method, "C");
  assert.equal(a.recommendation.separated, true);

  const close = [];
  for (let i = 0; i < 10; i++) { close.push(result("B", i < 8, i < 8, i < 8)); close.push(result("C", i < 9, i < 9, i < 9)); }
  const b = analyze({ results: close });
  assert.equal(b.recommendation.separated, false);
  assert.match(b.recommendation.text, /does not distinguish/);
});

test("a method with poor quality or many seams is not recommended even if it preserves the room", () => {
  const rs = [];
  for (let i = 0; i < 20; i++) rs.push(result("C", true, true, true, { seams: true }));
  for (let i = 0; i < 20; i++) rs.push(result("B", i < 15, i < 15, i < 15));
  const a = analyze({ results: rs });
  assert.equal(a.recommendation.method, "B");
});

test("per-category breakdown and markdown report", () => {
  const rs = [result("A", true, true, true, { category: "kitchen" }), result("A", false, true, true, { category: "majlis" })];
  const a = analyze({ results: rs, photos: [{}, {}] });
  assert.deepEqual(a.categories, ["kitchen", "majlis"]);
  assert.equal(a.perCategory.majlis.pooled.far.k, 1);
  const md = toMarkdown(a, { exportedAt: "test" });
  assert.match(md, /Validator accuracy against human judgment/);
  assert.match(md, /NOT demonstrated/);
});
