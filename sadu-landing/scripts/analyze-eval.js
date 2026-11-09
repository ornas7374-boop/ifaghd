#!/usr/bin/env node
// sadu — analyse an evaluation export (from eval/index.html) and write the comparison report.
//
//   node scripts/analyze-eval.js eval-export.json > eval-report.md
//
// Definitions (human rating = ground truth):
//   same-room rate        share of results the rater judged to be the same physical room
//   validator FAR         validator ACCEPTED a result the rater judged NOT the same room
//                         (the harmful error: a changed room presented as a success)
//   validator FRR         validator REJECTED (preservation) a result the rater judged the same room
//   A 5% FAR target is "demonstrated" only when the upper 95% Wilson bound is ≤ 5%.

const fs = require("fs");

function wilson(k, n, z = 1.96) {
  if (!n) return { k, n, p: null, lo: null, hi: null };
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return { k, n, p, lo: Math.max(0, (c - r) / d), hi: Math.min(1, (c + r) / d) };
}
const pct = (x) => (x == null ? "—" : `${(100 * x).toFixed(1)}%`);
const ci = (w) => (w.n ? `${pct(w.p)} (${w.k}/${w.n}; 95% CI ${pct(w.lo)}–${pct(w.hi)})` : "no data");
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

/** Smallest number of negatives with 0 false accepts for the Wilson upper bound to reach ≤ target. */
function negativesNeeded(target = 0.05) { for (let n = 1; n < 5000; n++) if (wilson(0, n).hi <= target) return n; return null; }

function analyze(exp) {
  const results = (exp.results || []).filter(r => r && r.method);
  const rated = results.filter(r => r.status === "ok" && r.rating && typeof r.rating.sameRoom === "boolean");
  const methods = [...new Set(results.map(r => r.method))].sort();
  const categories = [...new Set(rated.map(r => r.category || "unknown"))].sort();
  const valAccepted = (r) => !!(r.verdict && r.verdict.accepted && !r.verdict.unverifiable);
  const valPreserved = (r) => !!(r.verdict && r.verdict.preservation && r.verdict.preservation.passed);

  const errorStats = (rs) => {
    const neg = rs.filter(r => !r.rating.sameRoom), pos = rs.filter(r => r.rating.sameRoom);
    return {
      far: wilson(neg.filter(valAccepted).length, neg.length),
      farPreservation: wilson(neg.filter(valPreserved).length, neg.length),
      frr: wilson(pos.filter(r => !valPreserved(r)).length, pos.length)
    };
  };

  const perMethod = {};
  for (const m of methods) {
    const all = results.filter(r => r.method === m), rs = rated.filter(r => r.method === m);
    const sameRoom = wilson(rs.filter(r => r.rating.sameRoom).length, rs.length);
    const good = rs.filter(r => r.rating.sameRoom);
    const failureCodes = {}, humanChanged = {};
    for (const r of rs) {
      for (const f of (r.verdict && r.verdict.preservation && r.verdict.preservation.failures) || []) failureCodes[f.code] = (failureCodes[f.code] || 0) + 1;
      for (const c of r.rating.changed || []) humanChanged[c] = (humanChanged[c] || 0) + 1;
    }
    perMethod[m] = {
      results: all.length, errors: all.filter(r => r.status !== "ok").length, rated: rs.length,
      sameRoom, ...errorStats(rs),
      quality: mean(rs.map(r => r.rating.quality).filter(Number.isFinite)),
      qualityWhenSameRoom: mean(good.map(r => r.rating.quality).filter(Number.isFinite)),
      realism: mean(rs.map(r => r.rating.realism).filter(Number.isFinite)),
      seams: wilson(rs.filter(r => r.rating.seams).length, rs.length),
      noRealRedesign: rs.filter(r => r.verdict && r.verdict.design && (r.verdict.design.issues || []).some(i => i.code === "no_real_redesign")).length,
      medianSeconds: (() => { const t = all.map(r => r.seconds).filter(Number.isFinite).sort((a, b) => a - b); return t.length ? t[t.length >> 1] : null; })(),
      failureCodes, humanChanged
    };
  }

  const perCategory = {};
  for (const c of categories) {
    perCategory[c] = { pooled: errorStats(rated.filter(r => (r.category || "unknown") === c)), byMethod: {} };
    for (const m of methods) {
      const rs = rated.filter(r => r.method === m && (r.category || "unknown") === c);
      perCategory[c].byMethod[m] = wilson(rs.filter(r => r.rating.sameRoom).length, rs.length);
    }
  }

  const pooled = errorStats(rated);
  const need = negativesNeeded(0.05);
  const farTarget = pooled.far.n === 0
    ? { met: false, why: "no changed-room results were rated, so false acceptance cannot be measured" }
    : pooled.far.hi <= 0.05
      ? { met: true, why: `upper 95% bound ${pct(pooled.far.hi)} ≤ 5%` }
      : { met: false, why: `upper 95% bound is ${pct(pooled.far.hi)} (> 5%); with zero false accepts, at least ${need} rated changed-room results are needed to show ≤ 5%` };

  // recommendation: best lower bound of the same-room rate among methods with acceptable quality
  const eligible = methods.filter(m => perMethod[m].rated >= 5 && (perMethod[m].qualityWhenSameRoom ?? 0) >= 3 && (perMethod[m].seams.p ?? 1) <= 0.25);
  const ranked = eligible.slice().sort((a, b) => (perMethod[b].sameRoom.lo ?? 0) - (perMethod[a].sameRoom.lo ?? 0));
  let recommendation;
  if (!ranked.length) recommendation = { method: null, text: "No method met the minimum quality bar (mean quality ≥ 3 when the room is preserved, seams ≤ 25%, at least 5 rated results). No method should go to production." };
  else {
    const best = ranked[0], runner = ranked[1];
    const separated = !runner || perMethod[best].sameRoom.lo > perMethod[runner].sameRoom.hi;
    recommendation = { method: best, separated,
      text: separated
        ? `Method ${best} has the highest preserved-room rate and its confidence interval does not overlap the next method's.`
        : `Method ${best} ranks first, but its interval overlaps method ${runner}'s: the data does not distinguish them. Collect more photos or decide on cost, speed and quality.` };
  }
  return { methods, categories, perMethod, perCategory, pooled, farTarget, recommendation,
    counts: { photos: (exp.photos || []).length, results: results.length, rated: rated.length } };
}

function toMarkdown(a, exp) {
  const L = [];
  L.push(`# sadu — A/B/C evaluation results`, ``, `Export: ${exp.exportedAt || "?"} · photos: ${a.counts.photos} · results: ${a.counts.results} · rated: ${a.counts.rated}`, ``);
  L.push(`## Preservation (human judgment: same physical room?)`, ``, `| Method | Rated | Same room | Errors |`, `|---|---|---|---|`);
  for (const m of a.methods) { const p = a.perMethod[m]; L.push(`| ${m} | ${p.rated} | ${ci(p.sameRoom)} | ${p.errors} |`); }
  L.push(``, `## Design quality (separate from preservation)`, ``, `| Method | Quality (all) | Quality when room preserved | Realism | Visible seams/ghosting | Median time |`, `|---|---|---|---|---|---|`);
  for (const m of a.methods) { const p = a.perMethod[m]; L.push(`| ${m} | ${p.quality?.toFixed(2) ?? "—"} | ${p.qualityWhenSameRoom?.toFixed(2) ?? "—"} | ${p.realism?.toFixed(2) ?? "—"} | ${ci(p.seams)} | ${p.medianSeconds ?? "—"} s |`); }
  L.push(``, `## Validator accuracy against human judgment`, ``, `| Scope | False acceptance (accepted, not same room) | False rejection (preservation failed, same room) |`, `|---|---|---|`);
  L.push(`| All methods pooled | ${ci(a.pooled.far)} | ${ci(a.pooled.frr)} |`);
  for (const m of a.methods) L.push(`| Method ${m} | ${ci(a.perMethod[m].far)} | ${ci(a.perMethod[m].frr)} |`);
  L.push(``, `**5% false-acceptance target:** ${a.farTarget.met ? "demonstrated" : "NOT demonstrated"} — ${a.farTarget.why}.`, ``);
  L.push(`## Per room category`, ``, `| Category | ${a.methods.map(m => `${m} same room`).join(" | ")} | Validator FAR (pooled) | Validator FRR (pooled) |`, `|---|${a.methods.map(() => "---").join("|")}|---|---|`);
  for (const c of a.categories) { const pc = a.perCategory[c]; L.push(`| ${c} | ${a.methods.map(m => ci(pc.byMethod[m])).join(" | ")} | ${ci(pc.pooled.far)} | ${ci(pc.pooled.frr)} |`); }
  L.push(``, `## Failure analysis`, ``);
  for (const m of a.methods) {
    const p = a.perMethod[m];
    const fc = Object.entries(p.failureCodes).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ×${v}`).join(", ") || "none";
    const hc = Object.entries(p.humanChanged).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ×${v}`).join(", ") || "none";
    L.push(`- **Method ${m}** — validator failure codes: ${fc}. Elements the rater saw changed: ${hc}. "No real redesign": ${p.noRealRedesign}.`);
  }
  L.push(``, `## Recommendation`, ``, a.recommendation.text, ``,
    `_Human ratings are the ground truth. Intervals are 95% Wilson intervals. Results from one rater only measure that rater's judgment; a second rater on a subset is recommended before production approval._`);
  return L.join("\n");
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node scripts/analyze-eval.js <export.json>"); process.exit(1); }
  const exp = JSON.parse(fs.readFileSync(file, "utf8"));
  process.stdout.write(toMarkdown(analyze(exp), exp) + "\n");
}

module.exports = { analyze, toMarkdown, wilson, negativesNeeded };
