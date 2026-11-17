// Unit tests for each planner engine and the planner endpoints (simulated, no network).
const test = require("node:test");
const assert = require("node:assert/strict");
const { understandIntent } = require("../../api/_lib/planner/intent");
const { understandRoom } = require("../../api/_lib/planner/roomUnderstanding");
const { allocateBudget, RANGES_SAR } = require("../../api/_lib/planner/budget");
const { matchProducts } = require("../../api/_lib/planner/products");
const { scoreEvaluation } = require("../../api/_lib/planner/evaluate");
const { splitPerception, perceivePrompt } = require("../../api/_lib/planner/perceive");
const { renderInstructions } = require("../../api/_lib/planner/render");
const { planDesign } = require("../../api/_lib/planner");
const { ROOMS } = require("./fixtures");

test("intent: Arabic words for use, colours and owned devices; the customer's words beat the model", () => {
  const i = understandIntent({ description: "أبغى سيت أب قيمنق بإضاءة زرقاء، عندي بلايستيشن", budget_sar: "1500", changes: ["lighting"] }, { use: "work", colors: ["red"] });
  assert.equal(i.use, "gaming"); assert.deepEqual(i.accents, ["blue"]); assert.equal(i.budget_sar, 1500);
  assert.ok(i.devices.includes("console")); assert.ok(i.owned.includes("console"));
  assert.ok(!i.changes.includes("wall"));
  const w = understandIntent({ description: "أبغى جدار خشب ورا المكتب" }, {});
  assert.equal(w.allow_wall, true, "explicit wall words allow a wall change");
});

test("room understanding: separates confirmed / estimated / unknown and never invents metres", () => {
  const r = understandRoom(ROOMS.unknownSize());
  assert.equal(r.size.width_m, null); assert.equal(r.size.certainty, "unknown");
  assert.ok(r.unknowns.some(u => /windows: none visible/.test(u)));
  assert.ok(r.confirmed.some(c => /floor: light beige/.test(c)));
  const bad = understandRoom({ walls: [{ id: "back", x_from: 0.1, x_to: 0.9 }], windows: [{ wall: "ceiling", x0: 0, x1: 1 }], size: { class: "huge", width_m: 99 } });
  assert.equal(bad.windows.length, 0, "unknown wall names are dropped");
  assert.equal(bad.size.class, "medium"); assert.equal(bad.size.width_m, null, "impossible numbers are ignored");
  const door = understandRoom({ walls: [{ id: "back", x_from: 0.2, x_to: 0.8 }], doors: [{ wall: "back", x0: 0.4, x1: 0.5 }] });
  const free = door.walls.find(w => w.id === "back").free;
  assert.ok(free.every(s => s.x1 <= 0.35 || s.x0 >= 0.55), "door plus its swing is not free space");
});

test("budget: for any budget the plan stays within it, essentials come first, reserve is kept", () => {
  const items = [["desk", "desk", "essential"], ["chair", "chair", "essential"], ["monitor", "monitor", "essential"], ["keyboard", "keyboard", "essential"],
    ["mouse", "mouse", "essential"], ["monitor_light", "lighting", "essential"], ["plant", "plants", "optional"], ["wall_art", "decor", "optional"]]
    .map(([key, cat, priority]) => ({ key, cat, label: key, priority }));
  for (const budget of [300, 800, 1500, 2500, 5000, 20000]) {
    const b = allocateBudget(items, budget, "gaming");
    assert.ok(b.total_planned_sar <= budget - b.reserve_sar, `${budget}`);
    const firstDropped = b.lines.findIndex(l => !l.included && l.priority === "essential");
    if (firstDropped >= 0) assert.ok(!b.lines.some(l => l.included && l.priority === "optional"), "no optional item while an essential is missing");
    for (const l of b.lines.filter(l => l.included)) assert.ok(l.planned_sar >= RANGES_SAR[l.category][0][0]);
  }
  const none = allocateBudget(items, null, "work");
  assert.equal(none.status, "no_budget_given"); assert.ok(none.lines.every(l => l.tier === "mid"));
});

test("products: suggestions by default; a catalogue product is used only if it really fits", () => {
  const p = planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" } });
  const items = p._internal.decisions.items, palette = p.color_palette;
  const m0 = matchProducts(items, p.budget_allocation, palette, p.furniture_placement);
  assert.equal(m0.verified_count, 0); assert.ok(m0.requirements.every(r => r.status === "suggested" && r.product === null && r.links.length));
  const desk = m0.requirements.find(r => r.category === "desk");
  const catalog = [
    { category: "desk", name: "Too wide desk", price_sar: 300, width_cm: 200, colour: palette.furniture, url: "https://www.amazon.sa/dp/X1", store: "Amazon.sa", verified_at: "2026-11-13" },
    { category: "desk", name: "Unverified desk", price_sar: 300, width_cm: desk.spec.width_cm, url: "https://www.amazon.sa/dp/X2" },
    { category: "desk", name: "Good desk", price_sar: Math.round(desk.budget_sar * 0.9), width_cm: desk.spec.width_cm, colour: palette.furniture, url: "https://www.amazon.sa/dp/X3", store: "Amazon.sa", verified_at: "2026-11-13" }
  ];
  const m1 = matchProducts(items, p.budget_allocation, palette, p.furniture_placement, { catalog });
  const d1 = m1.requirements.find(r => r.category === "desk");
  assert.equal(d1.status, "verified"); assert.equal(d1.product.name, "Good desk");
});

test("render: refuses an unvalidated plan", () => {
  const p = planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 150 }, suggested: { style: "grey_tech" } });
  assert.equal(p.validation_results.passed, false);
  assert.throws(() => renderInstructions(p), /plan_not_validated/);
});

test("evaluation: classifies failures into accept / regenerate / regenerate_strict / replan, and never claims pixel checks", () => {
  const p = planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" } });
  const allYes = { floor: "yes", walls: "yes", ceiling: "yes", windows_doors: "yes", camera: "yes" };
  const ok = scoreEvaluation({ preservation: allYes, items: [{ item: "desk", present: "yes", placed_as_planned: "yes" }], extra_items: [], colors_match: "yes", request_met: "yes", quality: 4 }, p);
  assert.equal(ok.verdict, "pass"); assert.equal(ok.next_action, "accept"); assert.equal(ok.preservation.pixel, "not_tested");
  const floor = scoreEvaluation({ preservation: { ...allYes, floor: "no" }, items: [], colors_match: "yes", request_met: "yes" }, p);
  assert.equal(floor.next_action, "regenerate_strict");
  const missing = scoreEvaluation({ preservation: allYes, items: [{ item: "chair", present: "no" }], colors_match: "yes", request_met: "partly" }, p);
  assert.equal(missing.next_action, "regenerate");
  const replan = scoreEvaluation({ preservation: allYes, items: [{ item: "desk", present: "yes", placed_as_planned: "yes" }], colors_match: "yes", request_met: "no" }, p);
  assert.equal(replan.next_action, "replan");
  const pixel = scoreEvaluation({ preservation: allYes, items: [], colors_match: "yes", request_met: "yes" }, p, { passed: false, reasons: ["window moved"] });
  assert.equal(pixel.preservation.pixel, "failed"); assert.equal(pixel.next_action, "regenerate_strict");
});

test("perception: one prompt asks for observations with certainty; the answer is split for the engines", () => {
  const pr = perceivePrompt({ description: "أبغى إضاءة زرقاء" });
  assert.match(pr, /certainty/); assert.match(pr, /never about changing the floor/); assert.ok(pr.includes("أبغى إضاءة زرقاء"));
  const s = splitPerception({ space: "gaming_room", style: "white_blue", why: "غرفة.", walls: [], intent: { use: "gaming" } });
  assert.equal(s.suggested.style, "white_blue"); assert.equal(s.aiIntent.use, "gaming"); assert.ok(!("intent" in s.observations));
});

// ---- endpoints with the network simulated
function mockFetch(handler) {
  const calls = [], real = global.fetch;
  global.fetch = async (url, init = {}) => { calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null }); const { status = 200, json } = handler(String(url)); return { ok: status < 300, status, headers: { get: () => null }, json: async () => json }; };
  return { calls, restore: () => { global.fetch = real; } };
}
const mk = () => ({ code: 0, body: null, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const IMG = "data:image/jpeg;base64,AAAA";

test("endpoints: /api/plan observes once and plans in code; /api/design draws only signed plans", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "g" });
  require("../../api/_lib/gemini")._reset();
  const perception = { ...ROOMS.windowLeft(), space: "gaming_room", style: "grey_tech", why: "غرفة.", intent: { use: "gaming", colors: ["blue"], request_en: "blue LED light" } };
  // first Gemini call = perception (text); later Gemini calls = image generation (returns an image part)
  let n = 0;
  const m = mockFetch((url) => !url.includes("generativelanguage") ? { status: 500, json: {} }
    : n++ === 0 ? { json: { candidates: [{ content: { parts: [{ text: JSON.stringify(perception) }] } }] } }
    : { json: { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/jpeg", data: "QUJD" } }] } }] } });
  try {
    const r = mk(); await require("../../api/plan")({ method: "POST", body: { image: IMG, brief: { description: "قيمنق أزرق", budget_sar: 2500 } } }, r);
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.equal(m.calls.filter(c => c.url.includes("generativelanguage")).length, 1, "exactly one vision call");
    const plan = r.body.plan;
    assert.equal(plan.validation_results.passed, true); assert.ok(plan.rendering_instructions.signature);
    const design = require("../../api/design");
    const d1 = mk(); await design({ method: "POST", body: { image: IMG, plan } }, d1);
    assert.equal(d1.code, 200, JSON.stringify(d1.body));
    const sent = m.calls[1].body.contents[0].parts.find(x => typeof x.text === "string").text;
    assert.equal(sent, plan.rendering_instructions.prompt, "the image model gets exactly the plan's instruction");
    const tampered = JSON.parse(JSON.stringify(plan)); tampered.rendering_instructions.prompt += " Also paint the floor red.";
    const d2 = mk(); await design({ method: "POST", body: { image: IMG, plan: tampered } }, d2);
    assert.equal(d2.code, 400); assert.equal(d2.body.error, "plan_not_signed");
    const d3 = mk(); await design({ method: "POST", body: { image: IMG, style: "grey_tech", room: "setup_corner" } }, d3);
    assert.equal(d3.code, 200, "the legacy style path still works");
  } finally { m.restore(); require("../../api/_lib/gemini")._reset(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test("endpoints: /api/evaluate reviews original + result against the plan", async () => {
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "g" });
  require("../../api/_lib/gemini")._reset();
  const p = JSON.parse(JSON.stringify(planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" }, secret: "s" })));
  const review = { preservation: { floor: "yes", walls: "yes", ceiling: "yes", windows_doors: "yes", camera: "yes" }, items: [{ item: "desk", present: "yes", placed_as_planned: "yes" }], colors_match: "yes", request_met: "yes", quality: 4 };
  const m = mockFetch(() => ({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(review) }] } }] } }));
  try {
    const r = mk(); await require("../../api/evaluate")({ method: "POST", body: { original: IMG, generated: IMG, plan: p } }, r);
    assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.evaluation.verdict, "pass");
    assert.equal(m.calls[0].body.contents[0].parts.filter(x => x.inline_data).length, 2, "both images are sent");
    const bad = mk(); await require("../../api/evaluate")({ method: "POST", body: { original: IMG, generated: "https://evil.example/x.jpg", plan: p } }, bad);
    assert.equal(bad.code, 400, "foreign image hosts are not fetched");
  } finally { m.restore(); require("../../api/_lib/gemini")._reset(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});


test("design on Replicate (kontext): match_input_image, no prompt upsampling, png, a logged fixed seed, EXIF + 1536 px, no crop", async () => {
  const sharp = require("sharp");
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "g", REPLICATE_API_TOKEN: "r8_test", SADU_DESIGN_PROVIDER: "replicate", SADU_DESIGN_MODE: "kontext" });
  // a 4000 x 3000 photo stored sideways with EXIF orientation 6 (a phone in portrait)
  const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#888" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const photo = "data:image/jpeg;base64," + big.toString("base64");
  const plan = JSON.parse(JSON.stringify(planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" }, secret: require("../../api/plan").planSecret() })));
  const m = mockFetch((url) => url.includes("api.replicate.com") ? { json: { id: "abcdef123456", status: "succeeded", output: "https://replicate.delivery/x.png" } } : { status: 500, json: {} });
  try {
    const r = mk(); await require("../../api/design")({ method: "POST", body: { image: photo, plan, seed: 1234 } }, r);
    assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.output, "https://replicate.delivery/x.png");
    assert.equal(r.body.seed, 1234, "the seed is returned for a reproducible retry");
    assert.ok(m.calls.every(c => c.url.includes("api.replicate.com")), "no Gemini call for drawing");
    const input = m.calls[0].body.input;
    assert.equal(input.prompt, plan.rendering_instructions.prompt);
    assert.equal(input.aspect_ratio, "match_input_image"); assert.equal(input.prompt_upsampling, false);
    assert.equal(input.output_format, "png"); assert.equal(input.seed, 1234);
    const meta = await sharp(Buffer.from(input.input_image.split(",")[1], "base64")).metadata();
    assert.equal(Math.max(meta.width, meta.height), 1536, "longest side 1536");
    assert.equal(meta.width, 1152); assert.equal(meta.height, 1536, "EXIF applied (portrait) and ratio kept, not cropped");
  } finally { m.restore(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test("evaluation: an added rug counts as a changed floor even when the reviewer said the floor is unchanged", () => {
  const { scoreEvaluation } = require("../../api/_lib/planner/evaluate");
  const p = planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" }, secret: "s" });
  const ev = scoreEvaluation({ preservation: { floor: "yes", walls: "yes", ceiling: "yes", windows_doors: "yes", camera: "yes" }, items: [], extra_items: ["area rug"], quality: 5 }, p);
  assert.equal(ev.preservation.visual.floor, "no");
  assert.ok(ev.failures.some(f => f.type === "architecture_changed" && /rug/.test(f.detail.join(" "))));
  assert.equal(ev.next_action, "regenerate_strict");
});

test("mask path: only the planned box is redrawn; the mask is the photo's size, white inside the box, black outside", async () => {
  const sharp = require("sharp");
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "g", REPLICATE_API_TOKEN: "r8_test", SADU_DESIGN_PROVIDER: "replicate" });
  delete process.env.SADU_DESIGN_MODE;
  const photo = "data:image/jpeg;base64," + (await sharp({ create: { width: 400, height: 200, channels: 3, background: "#ccc" } }).jpeg().toBuffer()).toString("base64");
  const plan = JSON.parse(JSON.stringify(planDesign({ observations: ROOMS.windowLeft(), brief: { budget_sar: 3000 }, suggested: { style: "grey_tech" }, secret: require("../../api/plan").planSecret() })));
  const ri = plan.rendering_instructions;
  assert.ok(ri.fill_prompt && /no rug/.test(ri.fill_prompt));
  assert.ok(ri.edit_region.x0 >= 0.2, "the box stays on the desk wall, away from the window wall");
  const m = mockFetch((url) => url.includes("flux-fill-pro") ? { json: { id: "abcdef123456", status: "succeeded", output: "https://replicate.delivery/f.jpg" } } : { status: 500, json: {} });
  try {
    const r = mk(); await require("../../api/design")({ method: "POST", body: { image: photo, plan } }, r);
    assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.output, "https://replicate.delivery/f.jpg");
    const input = m.calls[0].body.input;
    assert.equal(input.prompt, ri.fill_prompt);
    const mask = Buffer.from(input.mask.split(",")[1], "base64");
    const meta = await sharp(mask).metadata(); assert.equal(meta.width, 400); assert.equal(meta.height, 200);
    const px = await sharp(mask).raw().toBuffer();
    const at = (x, y) => px[(y * 400 + x) * meta.channels];
    assert.equal(at(5, 100), 0, "window side stays black (kept)");
    assert.equal(at(5, 5), 0, "ceiling band stays black (kept)");
    assert.equal(at(Math.round((ri.edit_region.x0 + ri.edit_region.x1) / 2 * 400), 120), 255, "inside the box is white (redrawn)");
    // a tampered fill prompt is refused
    const t = JSON.parse(JSON.stringify(plan)); t.rendering_instructions.fill_prompt += " and a red rug";
    const r2 = mk(); await require("../../api/design")({ method: "POST", body: { image: photo, plan: t } }, r2);
    assert.equal(r2.body.error, "plan_not_signed");
  } finally { m.restore(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test("free Cloudflare path: only the box is redrawn and pasted back; outside the box the photo is pixel-identical", async () => {
  const sharp = require("sharp");
  const cfl = require("../../api/_lib/cloudflare"); cfl._reset();
  const orig = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 180, b: 160 } } }).png().toBuffer();
  const photo = "data:image/png;base64," + orig.toString("base64");
  const red = await sharp({ create: { width: 64, height: 32, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
  let sent;
  const fake = async (url, o = {}) => {
    if (url.includes("/accounts?")) return { ok: true, status: 200, json: async () => ({ result: [{ id: "acc1" }] }) };
    sent = { url, body: JSON.parse(o.body) };
    return { ok: true, status: 200, headers: { get: () => "image/png" }, arrayBuffer: async () => red };
  };
  const region = { x0: 0.5, x1: 0.75, y0: 0.2, y1: 0.9 };
  const r = await cfl.cfInpaint("t", photo, region, "white desk", { fetch: fake });
  assert.match(sent.url, /accounts\/acc1\/ai\/run\/@cf\/runwayml\/stable-diffusion-v1-5-inpainting$/);
  assert.equal(sent.body.width % 8, 0); assert.equal(sent.body.image.length > 0, true); assert.equal(sent.body.mask.length > 0, true);
  const out = await sharp(Buffer.from(r.output.split(",")[1], "base64")).raw().toBuffer({ resolveWithObject: true });
  assert.equal(out.info.width, 400); assert.equal(out.info.height, 200);
  const px = (x, y) => { const i = (y * 400 + x) * out.info.channels; return [out.data[i], out.data[i + 1], out.data[i + 2]]; };
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 3);
  assert.ok(near(px(20, 100), [200, 180, 160]), "outside the box: original");
  assert.ok(near(px(250, 100), [255, 0, 0]), "inside the box: redrawn");
});

test("FLUX.2 on Cloudflare: multipart request; only what really changed is kept, windows stay original", async () => {
  const sharp = require("sharp");
  const cfl = require("../../api/_lib/cloudflare"); cfl._reset();
  const orig = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 200, g: 180, b: 160 } } }).png().toBuffer();
  // the model adds a red desk (x 200-300) and also changes the "window" area (x 0-60) and tints the wall slightly
  const tint = await sharp({ create: { width: 400, height: 200, channels: 3, background: { r: 206, g: 184, b: 164 } } }).png().toBuffer();
  const redBox = await sharp({ create: { width: 100, height: 80, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
  const blueWin = await sharp({ create: { width: 60, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toBuffer();
  const gen = await sharp(tint).composite([{ input: redBox, left: 200, top: 100 }, { input: blueWin, left: 0, top: 20 }]).png().toBuffer();
  let sent;
  const fake = async (url, o = {}) => {
    if (url.includes("/accounts?")) return { ok: true, status: 200, json: async () => ({ result: [{ id: "acc1" }] }) };
    sent = { url, body: o.body };
    return { ok: true, status: 200, json: async () => ({ result: { image: gen.toString("base64") } }) };
  };
  const r = await cfl.cfFlux2("t", "data:image/png;base64," + orig.toString("base64"), null, "add a desk", { fetch: fake, protect: [{ x0: 0, x1: 0.16, y0: 0.05, y1: 0.65 }] });
  assert.match(sent.url, /flux-2-klein-9b$/);
  assert.ok(sent.body instanceof FormData); assert.equal(sent.body.get("prompt"), "add a desk"); assert.ok(sent.body.get("input_image_0"));
  const out = await sharp(Buffer.from(r.output.split(",")[1], "base64")).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * 400 + x) * out.info.channels; return [out.data[i], out.data[i + 1], out.data[i + 2]]; };
  const near = (p, q, t = 8) => p.every((v, i) => Math.abs(v - q[i]) <= t);
  assert.ok(near(px(250, 140), [255, 0, 0], 20), "new object kept " + px(250, 140));
  assert.ok(near(px(350, 40), [200, 180, 160]), "a slight wall tint is ignored: original " + px(350, 40));
  assert.ok(near(px(30, 60), [200, 180, 160]), "protected window stays original " + px(30, 60));
});

test("FLUX.2 on Cloudflare: a falsely flagged result is retried with a new seed, then the 4b model", async () => {
  const sharp = require("sharp");
  const cfl = require("../../api/_lib/cloudflare"); cfl._reset();
  const img = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#ccc" } }).png().toBuffer();
  const calls = [];
  const fake = async (url, o = {}) => {
    if (url.includes("/accounts?")) return { ok: true, status: 200, json: async () => ({ result: [{ id: "acc1" }] }) };
    calls.push({ url, seed: o.body.get("seed") });
    if (calls.length < 3) return { ok: false, status: 400, json: async () => ({ errors: [{ message: "AiError: Your output has been flagged.", code: 3030 }] }) };
    return { ok: true, status: 200, json: async () => ({ result: { image: img.toString("base64") } }) };
  };
  const r = await cfl.cfFlux2("t", "data:image/png;base64," + img.toString("base64"), null, "add a desk", { fetch: fake });
  assert.equal(r.status, "succeeded");
  assert.equal(calls.length, 3);
  assert.notEqual(calls[0].seed, calls[1].seed, "a new seed on retry");
  assert.match(calls[2].url, /flux-2-klein-4b$/, "then the other model");
  // a real error is not retried
  cfl._reset(); let n = 0;
  const bad = async (url) => url.includes("/accounts?") ? { ok: true, status: 200, json: async () => ({ result: [{ id: "a" }] }) } : (n++, { ok: false, status: 401, json: async () => ({ errors: [{ message: "auth" }] }) });
  await assert.rejects(cfl.cfFlux2("t", "data:image/png;base64," + img.toString("base64"), null, "x", { fetch: bad }), /cloudflare_401/);
  assert.equal(n, 1);
});

test("structure check: exact prompt, before + after to Gemini, pass only with score >= 7 and every part preserved", async () => {
  const { STRUCTURE_PROMPT, scoreStructure } = require("../../api/_lib/planner/evaluate");
  assert.equal(STRUCTURE_PROMPT, "Compare these two images. Return JSON: { same_camera_angle: bool, door_preserved: bool, window_preserved: bool, walls_preserved: bool, score_0_to_10: number, issues: string[] }");
  const ok = { same_camera_angle: true, door_preserved: true, window_preserved: true, walls_preserved: true, score_0_to_10: 8, issues: [] };
  assert.equal(scoreStructure(ok).pass, true);
  assert.equal(scoreStructure({ ...ok, score_0_to_10: 6 }).pass, false, "low score");
  assert.equal(scoreStructure({ ...ok, door_preserved: false, issues: ["door on the right wall disappeared"] }).pass, false, "door gone");
  assert.equal(scoreStructure({}).pass, false, "an empty answer never passes");
  const saved = { ...process.env };
  Object.assign(process.env, { GEMINI_API_KEY: "g" });
  require("../../api/_lib/gemini")._reset();
  const m = mockFetch(() => ({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ ...ok, same_camera_angle: false, score_0_to_10: 4, issues: ["camera moved"] }) }] } }] } }));
  try {
    const r = mk(); await require("../../api/evaluate")({ method: "POST", body: { mode: "structure", original: IMG, generated: IMG } }, r);
    assert.equal(r.code, 200, JSON.stringify(r.body));
    assert.equal(r.body.structure.pass, false); assert.deepEqual(r.body.structure.issues, ["camera moved"]);
    const parts = m.calls[0].body.contents[0].parts;
    assert.equal(parts.filter(x => x.inline_data).length, 2, "before + after are sent");
    assert.ok(parts.some(x => x.text === STRUCTURE_PROMPT), "the exact prompt");
  } finally { m.restore(); require("../../api/_lib/gemini")._reset(); for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]; Object.assign(process.env, saved); }
});

test("FLUX.2: when most of the photo changed (light shift), the model's own image is used instead of a patchy paste", async () => {
  const sharp = require("sharp");
  const cfl = require("../../api/_lib/cloudflare"); cfl._reset();
  const orig = await sharp({ create: { width: 200, height: 300, channels: 3, background: { r: 200, g: 200, b: 200 } } }).png().toBuffer();
  const bluish = await sharp({ create: { width: 200, height: 300, channels: 3, background: { r: 150, g: 160, b: 255 } } }).png().toBuffer();
  const fake = async (url) => url.includes("/accounts?") ? { ok: true, status: 200, json: async () => ({ result: [{ id: "a" }] }) }
    : { ok: true, status: 200, json: async () => ({ result: { image: bluish.toString("base64") } }) };
  const r = await cfl.cfFlux2("t", "data:image/png;base64," + orig.toString("base64"), null, "x", { fetch: fake });
  assert.equal(r.whole_image, true);
  const out = await sharp(Buffer.from(r.output.split(",")[1], "base64")).metadata();
  assert.equal(out.width, 200); assert.equal(out.height, 300, "same size as the photo");
});
