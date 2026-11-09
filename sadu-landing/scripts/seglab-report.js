#!/usr/bin/env node
// Offline report for one /api/eval/seglab result:
//   node scripts/seglab-report.js <seglab.json> <photo.jpg> <truth.json> <out-prefix>
// - draws the class map over the photo (overlay PNG) and the protected/unknown map
// - measures point accuracy against manually labelled points (truth.json)
// Measurement: each labelled point (x = offset + col*step, y = offset + row*step) is looked up in the
// class map (nearest cell). Per region: recall = share of that region's points the model labels correctly.
// Unknown pixels are reported separately: they are protected, so they are safe but not "correct".
const fs = require("fs");
const sharp = require("sharp");
const { ADE20K } = require("../api/_lib/ade20k");

const ROLE = { wall: "wall", floor: "floor", ceiling: "ceiling", windowpane: "window", door: "door" };
const COLOURS = { wall: [150, 120, 255], floor: [60, 200, 120], ceiling: [200, 200, 200], window: [70, 160, 255], door: [255, 170, 60], other: [250, 220, 60], unknown: [255, 40, 40] };

function decode(cm) {
  const out = new Uint8Array(cm.w * cm.h); let p = 0;
  for (const part of cm.rle.split(",")) { const [v, n] = part.split(":").map(Number); out.fill(v, p, p + n); p += n; }
  if (p !== out.length) throw new Error(`rle length ${p} != ${out.length}`);
  return out;
}
function roleOf(id, unknownId) {
  if (id === unknownId) return "unknown";
  const name = ADE20K[id] || "";
  return ROLE[name] || "other";
}

async function main() {
  const [resFile, photo, truthFile, prefix] = process.argv.slice(2);
  const r = JSON.parse(fs.readFileSync(resFile, "utf8"));
  const cm = r.classMap, map = decode(cm);
  const meta = await sharp(photo).metadata();
  // overlay: class colours at 55% over the photo
  const px = Buffer.alloc(cm.w * cm.h * 4);
  for (let i = 0; i < map.length; i++) { const c = COLOURS[roleOf(map[i], cm.unknownId)]; px.set([c[0], c[1], c[2], 140], i * 4); }
  const layer = await sharp(px, { raw: { width: cm.w, height: cm.h, channels: 4 } }).resize(meta.width, meta.height, { kernel: "nearest" }).png().toBuffer();
  await sharp(photo).composite([{ input: layer }]).png().toFile(`${prefix}-overlay.png`);
  const solid = Buffer.alloc(cm.w * cm.h * 3);
  for (let i = 0; i < map.length; i++) solid.set(COLOURS[roleOf(map[i], cm.unknownId)], i * 3);
  await sharp(solid, { raw: { width: cm.w, height: cm.h, channels: 3 } }).resize(meta.width, meta.height, { kernel: "nearest" }).png().toFile(`${prefix}-mask.png`);

  // point accuracy
  const t = JSON.parse(fs.readFileSync(truthFile, "utf8"));
  const stats = {}, confusion = {};
  for (const [rc, truth] of Object.entries(t.labels)) {
    const [row, col] = rc.split(",").map(Number);
    const x = t.offset + col * t.step, y = t.offset + row * t.step;
    const mx = Math.min(cm.w - 1, Math.floor(x * cm.w / t.w)), my = Math.min(cm.h - 1, Math.floor(y * cm.h / t.h));
    const pred = roleOf(map[my * cm.w + mx], cm.unknownId);
    stats[truth] = stats[truth] || { points: 0, correct: 0, unknown: 0 };
    stats[truth].points++; if (pred === truth) stats[truth].correct++; if (pred === "unknown") stats[truth].unknown++;
    confusion[truth] = confusion[truth] || {}; confusion[truth][pred] = (confusion[truth][pred] || 0) + 1;
  }
  let all = 0, ok = 0;
  const rows = Object.entries(stats).map(([k, s]) => { all += s.points; ok += s.correct; return { region: k, points: s.points, correct: s.correct, accuracy: +(100 * s.correct / s.points).toFixed(1), unknown: s.unknown, predictedAs: confusion[k] }; });
  const share = {}; for (const v of map) { const k = roleOf(v, cm.unknownId); share[k] = (share[k] || 0) + 1; }
  for (const k in share) share[k] = +(100 * share[k] / map.length).toFixed(1);
  const report = { photo: t.image, model: r.model, predictTime: r.predictTime, classMap: `${cm.w}x${cm.h}`, overall: +(100 * ok / all).toFixed(1), points: all, perRegion: rows, pixelShareByRole: share, modelLabels: r.rawOutput && r.rawOutput.labels, unmatched: r.parsed && r.parsed.unmatched };
  fs.writeFileSync(`${prefix}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
