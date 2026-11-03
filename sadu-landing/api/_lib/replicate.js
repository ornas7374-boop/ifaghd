// sadu — minimal Replicate client for the evaluation endpoints.
// The token is always passed in by the caller (from the eval guard); this module never reads
// environment variables, so it cannot pick up the production key by accident.

const API = "https://api.replicate.com/v1";
const OFFICIAL_OWNERS = new Set(["black-forest-labs"]); // models callable without a version id
const OUTPUT_HOSTS = [/\.replicate\.delivery$/, /^replicate\.delivery$/, /\.replicate\.com$/];
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;

const versionCache = new Map();

async function call(token, path, { method = "GET", body, headers = {}, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    if ((r.status === 429 || r.status >= 500) && attempt < retries) {
      const ra = Number(r.headers.get("retry-after"));
      await new Promise(res => setTimeout(res, Number.isFinite(ra) && ra > 0 ? Math.min(ra, 10) * 1000 : 1000 * 2 ** attempt));
      continue;
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(`replicate_${r.status}`);
      err.status = r.status;
      err.detail = String(data.detail || data.title || "").slice(0, 300);
      throw err;
    }
    return data;
  }
}

function splitModel(model) {
  const m = /^([a-z0-9][\w.-]*)\/([a-z0-9][\w.-]*)(?::([0-9a-f]{64}))?$/i.exec(model);
  if (!m) throw new Error("bad_model_id");
  return { owner: m[1], name: m[2], version: m[3] || null };
}

/** Model info incl. latest version and its OpenAPI schema (for the probe). */
async function getModel(token, model) {
  const { owner, name } = splitModel(model);
  return call(token, `/models/${owner}/${name}`);
}

async function resolveVersion(token, model) {
  const { owner, name, version } = splitModel(model);
  if (version) return version;
  const key = `${owner}/${name}`;
  if (versionCache.has(key)) return versionCache.get(key);
  const info = await call(token, `/models/${owner}/${name}`);
  const v = info.latest_version && info.latest_version.id;
  if (!v) throw new Error("no_version");
  versionCache.set(key, v);
  return v;
}

/** Create a prediction; waits up to waitSec for a synchronous result. */
async function createPrediction(token, model, input, { waitSec = 50 } = {}) {
  const { owner, name, version } = splitModel(model);
  const headers = waitSec ? { Prefer: `wait=${waitSec}` } : {};
  if (!version && OFFICIAL_OWNERS.has(owner)) {
    return call(token, `/models/${owner}/${name}/predictions`, { method: "POST", body: { input }, headers });
  }
  const v = await resolveVersion(token, model);
  return call(token, `/predictions`, { method: "POST", body: { version: v, input }, headers });
}

async function getPrediction(token, id) {
  if (!/^[a-z0-9]{8,64}$/i.test(String(id))) throw new Error("bad_id");
  return call(token, `/predictions/${id}`);
}

function isAllowedOutputUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && OUTPUT_HOSTS.some(re => re.test(url.hostname));
  } catch { return false; }
}

/** Download a model output file. Only Replicate's delivery hosts are allowed (SSRF guard). */
async function fetchOutput(u) {
  if (!isAllowedOutputUrl(u)) throw new Error("output_host_not_allowed");
  const r = await fetch(u, { redirect: "error" });
  if (!r.ok) throw new Error(`output_${r.status}`);
  const len = Number(r.headers.get("content-length") || 0);
  if (len > MAX_OUTPUT_BYTES) throw new Error("output_too_large");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_OUTPUT_BYTES) throw new Error("output_too_large");
  return buf;
}

/** Normalise a prediction for the client. */
function summarize(p) {
  return {
    id: p.id, status: p.status, error: p.error ? String(p.error).slice(0, 300) : null,
    predictTime: p.metrics && p.metrics.predict_time != null ? p.metrics.predict_time : null,
    output: p.output
  };
}

module.exports = { createPrediction, getPrediction, getModel, fetchOutput, isAllowedOutputUrl, summarize, splitModel };
