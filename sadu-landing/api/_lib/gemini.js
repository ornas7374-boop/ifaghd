// sadu — Google Gemini provider (optional alternative to Replicate).
//   generateImage: edit the room photo with a text instruction (synchronous; returns a data URI)
//   analyzeRoomGemini: same JSON answer as roomAnalysis.analyzeRoom, from a Gemini vision model
// The key is passed in by the caller; this module never reads environment secrets itself.
// Model ids are overridable with GEMINI_IMAGE_MODEL / GEMINI_VISION_MODEL (set by the caller).

const API = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_VISION_MODEL = "gemini-2.5-flash";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function splitDataUri(uri) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(uri || ""));
  if (!m) throw new Error("bad_image");
  return { mime: m[1], data: m[2] };
}

// One generateContent call, with retries for 429/5xx, inside a time budget (Vercel stops the
// function at 60 s, so a slow model must fail clearly instead of hanging the request).
async function generate(key, model, body, budgetMs = 50000) {
  const t0 = Date.now();
  for (let attempt = 0; ; attempt++) {
    const left = budgetMs - (Date.now() - t0);
    if (left < 1000) return { ok: false, status: 504, data: { error: { message: "timeout" } }, timeout: true };
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), left);
    let r;
    try {
      r = await fetch(`${API}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctl.signal
      });
    } catch (e) {
      clearTimeout(timer);
      console.log(JSON.stringify({ gemini: model, status: "timeout", ms: Date.now() - t0 }));
      return { ok: false, status: 504, data: { error: { message: "timeout after " + Math.round((Date.now() - t0) / 1000) + "s" } }, timeout: true };
    }
    clearTimeout(timer);
    console.log(JSON.stringify({ gemini: model, status: r.status, ms: Date.now() - t0, attempt }));
    if ((r.status === 429 || r.status >= 500) && attempt < 1 && budgetMs - (Date.now() - t0) > 8000) { await sleep(2000 * 2 ** attempt); continue; }
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
}

// If a model id is not available on the account (404), ask the API which models exist and pick
// the newest one that fits. The choice is remembered for this server instance.
const chosen = {};
const ver = (n) => { const m = /gemini-(\d+(?:\.\d+)?)/.exec(n); return m ? Number(m[1]) : 0; };
function pick(models, kind) {
  const ok = models.filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => String(m.name || "").replace(/^models\//, ""));
  const fits = kind === "image"
    ? ok.filter(n => /^gemini-/.test(n) && /image/.test(n))
    : ok.filter(n => /^gemini-/.test(n) && /flash/.test(n) && !/(image|tts|audio|live|embed|thinking)/.test(n));
  const lite = (n) => (kind === "vision" && /lite/.test(n) ? 1 : 0);
  fits.sort((a, b) => (lite(b) - lite(a)) || (/preview|exp/.test(a) - /preview|exp/.test(b)) || (ver(b) - ver(a)) || (/flash/.test(b) - /flash/.test(a)));
  return fits;
}
async function listModels(key) {
  const out = [];
  let token = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${API}/models?pageSize=200${token ? "&pageToken=" + encodeURIComponent(token) : ""}`, { headers: { "x-goog-api-key": key } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) break;
    out.push(...(d.models || []));
    if (!d.nextPageToken) break;
    token = d.nextPageToken;
  }
  return out;
}
// Analysis does not need long reasoning: ask the model to think little (faster, cheaper).
function withLowThinking(model, body) {
  const t = /gemini-2\.5/.test(model) ? { thinkingBudget: 0 } : /gemini-[3-9]/.test(model) ? { thinkingLevel: "minimal" } : null;
  return t ? { ...body, generationConfig: { ...body.generationConfig, thinkingConfig: t } } : body;
}
async function generateWithFallback(key, kind, preferred, body, budgetMs) {
  const t0 = Date.now(), left = () => budgetMs - (Date.now() - t0);
  // Analysis gets at most 20 s per model, so a stuck model leaves time to try another one.
  const slice = () => (kind === "vision" ? Math.min(left(), 20000) : left());
  const send = async (model) => {
    if (kind !== "vision") return generate(key, model, body, slice());
    let r = await generate(key, model, withLowThinking(model, body), slice());
    if (r.status === 400 && /thinking/i.test(errDetail(r.data))) r = await generate(key, model, body, slice());
    return r;
  };
  let model = chosen[kind] || preferred;
  let res = await send(model);
  // Not on the account (404), or overloaded (503/429/500 after retries): try the next suitable
  // model the account has, newest stable first, while time remains.
  if ([404, 429, 500, 503, 504].includes(res.status) && left() > 8000) {
    const tried = new Set([model]);
    const list = pick(await listModels(key), kind).filter(n => !tried.has(n));
    for (const alt of list.slice(0, 3)) {
      if (left() < 8000) break;
      console.log(JSON.stringify({ gemini_fallback: kind, from: model, status: res.status, to: alt }));
      if (chosen[kind] === model) delete chosen[kind];
      model = alt; res = await send(model);
      if (res.ok || ![404, 429, 500, 503, 504].includes(res.status)) break;
    }
  }
  if (res.ok) chosen[kind] = model;
  return { res, model };
}

const parts = (data) => (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
const errDetail = (data) => String((data && data.error && data.error.message) || "").slice(0, 200);

/** Edit the photo according to `prompt`. Returns { output: "data:image/...;base64,..." }. */
async function generateImage(key, image, prompt, opts = {}) {
  const { mime, data } = splitDataUri(image);
  const { res, model } = await generateWithFallback(key, "image", opts.model || DEFAULT_IMAGE_MODEL, {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseModalities: ["IMAGE"] }
  }, opts.budgetMs || 55000);
  if (!res.ok) { const e = new Error(res.timeout ? "gemini_timeout" : `gemini_${res.status}`); e.detail = `${model}: ${errDetail(res.data)}`.slice(0, 240); throw e; }
  const img = parts(res.data).find(p => (p.inlineData || p.inline_data));
  if (!img) {
    const e = new Error("gemini_no_image");
    const why = res.data && res.data.candidates && res.data.candidates[0] && res.data.candidates[0].finishReason;
    e.detail = String(why || (res.data && res.data.promptFeedback && res.data.promptFeedback.blockReason) || "").slice(0, 200);
    throw e;
  }
  const inl = img.inlineData || img.inline_data;
  return { output: `data:${inl.mimeType || inl.mime_type || "image/png"};base64,${inl.data}`, model };
}

/** Room + style decision with a Gemini vision model (same output as roomAnalysis.analyzeRoom). */
async function analyzeRoomGemini(key, image, opts = {}) {
  const { SYSTEM, userPrompt, parseAnswer, STYLES } = require("./roomAnalysis");
  const exclude = (opts.exclude || []).filter(s => STYLES[s]).slice(0, 10);
  if (exclude.length >= Object.keys(STYLES).length) exclude.length = 0;
  const { mime, data } = splitDataUri(image);
  const { res, model } = await generateWithFallback(key, "vision", opts.model || DEFAULT_VISION_MODEL, {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ parts: [{ text: userPrompt(exclude, opts.brief) }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1000, temperature: 0.3 }
  }, opts.budgetMs || 45000);
  if (!res.ok) { const e = new Error(res.timeout ? "gemini_timeout" : `gemini_${res.status}`); e.detail = `${model}: ${errDetail(res.data)}`.slice(0, 240); throw e; }
  const text = parts(res.data).map(p => p.text || "").join("");
  return { ...parseAnswer(text, exclude), model };
}

/** Ask a Gemini vision model for a JSON answer about one image. Returns { text, model }. */
async function visionJSON(key, image, opts = {}) { return visionJSONImages(key, [image], opts); }

/** Same as visionJSON with several images in order (e.g. original, then generated). */
async function visionJSONImages(key, images, { system, prompt, model, budgetMs = 45000, maxTokens = 2500 } = {}) {
  const imageParts = images.map(img => { const { mime, data } = splitDataUri(img); return { inline_data: { mime_type: mime, data } }; });
  const r = await generateWithFallback(key, "vision", model || DEFAULT_VISION_MODEL, {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: [{ parts: [{ text: prompt }, ...imageParts] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens, temperature: 0.3 }
  }, budgetMs);
  if (!r.res.ok) { const e = new Error(r.res.timeout ? "gemini_timeout" : `gemini_${r.res.status}`); e.detail = `${r.model}: ${errDetail(r.res.data)}`.slice(0, 240); throw e; }
  return { text: parts(r.res.data).map(p => p.text || "").join(""), model: r.model };
}

module.exports = { _reset: () => { for (const k in chosen) delete chosen[k]; }, pick, generateImage, visionJSON, visionJSONImages, analyzeRoomGemini, splitDataUri, DEFAULT_IMAGE_MODEL, DEFAULT_VISION_MODEL };
