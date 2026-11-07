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

const parts = (data) => (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
const errDetail = (data) => String((data && data.error && data.error.message) || "").slice(0, 200);

/** Edit the photo according to `prompt`. Returns { output: "data:image/...;base64,..." }. */
async function generateImage(key, image, prompt, opts = {}) {
  const { mime, data } = splitDataUri(image);
  const model = opts.model || DEFAULT_IMAGE_MODEL;
  const res = await generate(key, model, {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseModalities: ["IMAGE"] }
  });
  if (!res.ok) { const e = new Error(`gemini_${res.status}`); e.detail = errDetail(res.data); throw e; }
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
  const model = opts.model || DEFAULT_VISION_MODEL;
  const res = await generate(key, model, {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ parts: [{ text: userPrompt(exclude) }, { inline_data: { mime_type: mime, data } }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 600, temperature: 0.3 }
  });
  if (!res.ok) { const e = new Error(`gemini_${res.status}`); e.detail = errDetail(res.data); throw e; }
  const text = parts(res.data).map(p => p.text || "").join("");
  return { ...parseAnswer(text, exclude), model };
}

module.exports = { generateImage, analyzeRoomGemini, splitDataUri, DEFAULT_IMAGE_MODEL, DEFAULT_VISION_MODEL };
