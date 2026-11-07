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

async function generate(key, model, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 2) { await sleep(2000 * 2 ** attempt); continue; }
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
    : ok.filter(n => /^gemini-/.test(n) && /flash/.test(n) && !/(image|tts|audio|live|embed|lite)/.test(n));
  fits.sort((a, b) => (ver(b) - ver(a)) || (/preview|exp/.test(a) - /preview|exp/.test(b)) || (/flash/.test(b) - /flash/.test(a)));
  return fits[0] || null;
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
async function generateWithFallback(key, kind, preferred, body) {
  let model = chosen[kind] || preferred;
  let res = await generate(key, model, body);
  if (res.status === 404 && !chosen[kind]) {
    const alt = pick(await listModels(key), kind);
    if (alt && alt !== model) { model = alt; res = await generate(key, model, body); }
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
  });
  if (!res.ok) { const e = new Error(`gemini_${res.status}`); e.detail = `${model}: ${errDetail(res.data)}`.slice(0, 240); throw e; }
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
    contents: [{ parts: [{ text: userPrompt(exclude) }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 600, temperature: 0.3 }
  });
  if (!res.ok) { const e = new Error(`gemini_${res.status}`); e.detail = `${model}: ${errDetail(res.data)}`.slice(0, 240); throw e; }
  const text = parts(res.data).map(p => p.text || "").join("");
  return { ...parseAnswer(text, exclude), model };
}

module.exports = { _reset: () => { for (const k in chosen) delete chosen[k]; }, pick, generateImage, analyzeRoomGemini, splitDataUri, DEFAULT_IMAGE_MODEL, DEFAULT_VISION_MODEL };
