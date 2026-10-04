import { chromium } from "playwright";
import { mkdirSync, statSync } from "node:fs";
import { SCENES } from "./scenes.mjs";
const OUT = process.env.OUT;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1200, height: 750 } });
const shots = [
  { angle: 0.6, dist: 22, height: 4 },
  { angle: 2.3, dist: 15, height: 3, lookY: 1.6 },
  { angle: -0.9, dist: 30, height: 7, lookY: 1 },
];
let total = 0;
for (const [slug, sc] of Object.entries(SCENES)) {
  for (let i = 0; i < 3; i++) {
    const cfg = { ...sc, ...shots[i], seed: i, time: sc.times[i] };
    if (sc.angle !== undefined) cfg.angle = sc.angle + (i - 1) * 0.5;
    await p.goto(`file://${process.env.D}/render.html?k=${slug}-${i}#${encodeURIComponent(JSON.stringify(cfg))}`);
    await p.waitForFunction(() => document.title === "done", null, { timeout: 30000 });
    const f = `${OUT}/${slug}-${i + 1}.jpg`;
    await p.locator("canvas").screenshot({ path: f, type: "jpeg", quality: 80 });
    total += statSync(f).size;
  }
  console.log("rendered", slug);
}
console.log("total KB", Math.round(total / 1024));
await b.close();
