// sadu — sends the photo of the corner or room and returns the setup design.
// Drawing: Replicate (FLUX Kontext) when SADU_DESIGN_PROVIDER=replicate, otherwise Gemini.
// Keys (REPLICATE_API_TOKEN / GEMINI_API_KEY) stay on the server and never reach the browser.
//
// POST /api/design   { image: "data:image/jpeg;base64,...", plan }  (or the legacy { style, room })
//   -> { status: "succeeded", output: <image URL or data URI> }  or  { status: "processing", id }
// GET  /api/design?id=...   (Replicate only) status of a slow prediction

// Setup focus: spaces, styles and the preservation rule live in _lib/setup.js (shared with analysis).
const { STYLES, buildPrompt } = require("./_lib/setup");
// Descriptions of the existing floor / walls / ceiling from the analysis step; they are put into
// the prompt as things to keep. Walls stay protected here (no wall change yet).
const briefOf = (b) => ({
  request: typeof b.request === "string" ? b.request : "",
  placement: typeof b.placement === "string" ? b.placement : "",
  use: typeof b.use === "string" ? b.use : "",
  changes: Array.isArray(b.changes) ? b.changes.map(String).filter(x => /^[a-z_]{2,20}$/.test(x)).slice(0, 6) : []
});
// Prompt for a request: a SIGNED plan from /api/plan (the Planning Engine decides, we only draw it),
// or the legacy style path. Returns {prompt} or {error}.
const { verify } = require("./_lib/planner");
const { planSecret } = require("./plan");
function promptFor(b) {
  if (b.plan) {
    const ri = b.plan.rendering_instructions;
    if (!ri || !verify(ri, planSecret())) return { error: "plan_not_signed" };
    return { prompt: ri.prompt, fill: ri.fill_prompt || null, region: ri.edit_region || null, protect: ri.protect || [], references: Array.isArray(ri.references) ? ri.references.slice(0, 3) : [] };
  }
  if (!STYLES[b.style]) return { error: "bad_style" };
  return { prompt: buildPrompt(b.style, b.room, { keep: keepOf(b.keep), ...briefOf(b) }) };
}
const keepOf = (k) => (k && typeof k === "object" ? { floor: k.floor, walls: k.walls, ceiling: k.ceiling } : {});

// Step 1 of a design: empty the room (fixed server-side prompt, no customer text, so no signature needed).
// The planner then looks at the EMPTY room, decides the best spot, and the design is drawn on it.
const EMPTY_PROMPT = "Remove ALL furniture and objects from this room so it becomes a completely empty room: remove every sofa, bed, table, chair, desk, " +
  "cabinet, wardrobe that is free-standing, shelf, lamp, rug, carpet, curtains, blinds and curtain rods, wall decor, frames, plants, TV, electronics, cables, bags and clutter. " +
  "Keep exactly the same walls and wall colour, the same floor, the same ceiling and ceiling lights, the door, the window frame and glass, built-in fixtures, " +
  "and the same camera angle, perspective, framing and daylight. Fill the areas behind the removed objects with the same wall and floor, seamlessly. " +
  "Do not add anything. No people. The result is a bare, unoccupied room with clean walls and an uncovered floor. Photorealistic empty room, real-estate photography quality.";

// photos of the real products in the plan (catalogue ids only: never a URL from the request)
async function productRefs(ids) {
  const cat = require("./_lib/catalog"), sharp = require("sharp");
  const out = [];
  for (const id of ids || []) {
    const p = cat.byId(String(id));
    if (!p || !/^https:\/\/www\.ikea\.com\/sa\//.test(p.image_url)) continue;
    try {
      const r = await fetch(p.image_url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      out.push(await sharp(buf).resize(512, 512, { fit: "inside" }).flatten({ background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer());
    } catch (_) { /* a missing photo only means one reference less */ }
  }
  return out;
}

function reply(res, code, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(code).json(body);
}

module.exports = async function handler(req, res) {
  const useRep = process.env.SADU_DESIGN_PROVIDER === "replicate", useCf = process.env.SADU_DESIGN_PROVIDER === "cloudflare";
  const token = useCf ? process.env.CLOUDFLARE_API_TOKEN : useRep ? process.env.REPLICATE_API_TOKEN : process.env.GEMINI_API_KEY;
  if (!token) return reply(res, 500, { status: "failed", error: "missing_token" });
  if (useRep && req.method === "GET") {
    try { return reply(res, 200, await require("./_lib/replicateDesign").getPrediction(token, String((req.query || {}).id || ""))); }
    catch (e) { return reply(res, e.message === "bad_id" ? 400 : 502, { status: "failed", error: e.message }); }
  }
  if (req.method !== "POST") return reply(res, 405, { status: "failed", error: "method" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const pr = b.step === "empty" ? { prompt: EMPTY_PROMPT, empty: true } : promptFor(b);
    if (pr.error) return reply(res, 400, { status: "failed", error: pr.error });
    if (typeof b.image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.image)) return reply(res, 400, { status: "failed", error: "bad_image" });
    if (b.image.length > 4_000_000) return reply(res, 413, { status: "failed", error: "too_large" });
    try {
      if (pr.empty) {
        if (useCf) return reply(res, 200, { ...(await require("./_lib/cloudflare").cfFlux2(token, b.image, null, EMPTY_PROMPT, { protect: [] })), step: "empty" });
        if (useRep) return reply(res, 200, await require("./_lib/replicateDesign").replicateKontext(token, b.image, EMPTY_PROMPT, {}));
        const g0 = await require("./_lib/gemini").generateImage(token, b.image, EMPTY_PROMPT, { model: process.env.GEMINI_IMAGE_MODEL || undefined });
        return reply(res, 200, { status: "succeeded", output: g0.output, step: "empty" });
      }
      if (useCf) {
        // free (Cloudflare daily allowance): mask path only, needs a signed plan with a box
        if (!pr.fill || !pr.region) return reply(res, 400, { status: "failed", error: "plan_required" });
        const cfl = require("./_lib/cloudflare");
        // FLUX.2 edits with the full instruction; only the planned box is pasted onto the original photo
        if (process.env.SADU_CF_MODE === "inpaint") return reply(res, 200, await cfl.cfInpaint(token, b.image, pr.region, pr.fill));
        const refs = await productRefs(pr.references);
        return reply(res, 200, await cfl.cfFlux2(token, b.image, pr.region, pr.prompt, { protect: pr.protect, refs }));
      }
      if (useRep) {
        const rd = require("./_lib/replicateDesign");
        // mask path (default): only the planned box is redrawn, the rest of the photo stays pixel-identical
        if (pr.fill && pr.region && process.env.SADU_DESIGN_MODE !== "kontext") return reply(res, 200, await rd.replicateFill(token, b.image, pr.region, pr.fill));
        return reply(res, 200, await rd.replicateKontext(token, b.image, pr.prompt, { seed: Number.isInteger(b.seed) ? b.seed : undefined }));
      }
      const g = await require("./_lib/gemini").generateImage(token, b.image, pr.prompt, { model: process.env.GEMINI_IMAGE_MODEL || undefined });
      return reply(res, 200, { status: "succeeded", output: g.output });
    } catch (e) {
      return reply(res, 502, { status: "failed", error: e.message || "design_failed", detail: e.detail || "" });
    }
  } catch (e) {
    return reply(res, 500, { status: "failed", error: "server_error" });
  }
};

module.exports.EMPTY_PROMPT = EMPTY_PROMPT;
