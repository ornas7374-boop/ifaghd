// HTTP helpers: timeouts, retry with backoff, and API rate-limit tracking.
// Design rule: when a source's hourly allowance is spent, the run STOPS cleanly for that source
// (RateLimitExhausted). The pagination cursor is saved, so the next scheduled run resumes there.

const defaultSleep = (ms) => new Promise(r => setTimeout(r, ms));

class RateLimitExhausted extends Error {
  constructor(source, waitMs) { super(`rate_limit_exhausted:${source}`); this.name = "RateLimitExhausted"; this.source = source; this.waitMs = waitMs; }
}
class AuthError extends Error {
  constructor(source, status) { super(`auth_failed:${source}:${status}`); this.name = "AuthError"; this.source = source; this.status = status; }
}
class HttpError extends Error {
  constructor(status, source) { super(`http_${status}`); this.name = "HttpError"; this.status = status; this.source = source; }
}

const header = (h, name) => (h && typeof h.get === "function" ? h.get(name) : h && h[name]) ?? null;

/** Tracks one source's allowance from its response headers and enforces a per-run call cap. */
class RateLimiter {
  /**
   * @param {{name:string, maxCalls?:number, maxWaitMs?:number, minIntervalMs?:number, sleep?:Function, now?:Function}} o
   */
  constructor(o) {
    this.name = o.name;
    this.maxCalls = o.maxCalls ?? Infinity;   // calls allowed in this run
    this.maxWaitMs = o.maxWaitMs ?? 60_000;   // longer waits end the run for this source instead
    this.minIntervalMs = o.minIntervalMs ?? 0;
    this.sleep = o.sleep || defaultSleep;
    this.now = o.now || Date.now;
    this.calls = 0;
    this.remaining = null;
    this.resetAt = null;                       // epoch ms when the allowance renews, if the API says so
    this.lastCallAt = 0;
  }

  async acquire() {
    if (this.calls >= this.maxCalls) throw new RateLimitExhausted(this.name, 0);
    if (this.remaining !== null && this.remaining <= 0) {
      const wait = this.resetAt ? Math.max(0, this.resetAt - this.now()) : Infinity;
      if (wait > this.maxWaitMs) throw new RateLimitExhausted(this.name, Number.isFinite(wait) ? wait : 3_600_000);
      await this.sleep(wait + 250);
      this.remaining = null;
    }
    const since = this.now() - this.lastCallAt;
    if (since < this.minIntervalMs) await this.sleep(this.minIntervalMs - since);
    this.calls++;
    this.lastCallAt = this.now();
  }

  update(headers) {
    const rem = header(headers, "x-ratelimit-remaining");
    if (rem !== null && rem !== "" && Number.isFinite(Number(rem))) this.remaining = Number(rem);
    const reset = header(headers, "x-ratelimit-reset");
    if (reset && Number.isFinite(Number(reset))) {
      const n = Number(reset);
      this.resetAt = n > 1e12 ? n : n * 1000;   // epoch seconds (Pexels) or milliseconds
    }
  }
}

async function withTimeout(fetchImpl, url, init, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetchImpl(url, { ...init, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

/**
 * GET JSON from an API with rate limiting and retries.
 * Retries: network errors, 5xx, and 429 when the wait is short. 401/403 never retry (and never log the key).
 */
async function getJson(url, { headers = {}, limiter, source = "api", fetchImpl = globalThis.fetch, sleep = defaultSleep,
  retries = 3, timeoutMs = 20_000, log = () => {} } = {}) {
  for (let attempt = 0; ; attempt++) {
    if (limiter) await limiter.acquire();
    let res;
    try {
      res = await withTimeout(fetchImpl, url, { headers }, timeoutMs);
    } catch (e) {
      if (attempt < retries) { const ms = Math.min(1000 * 2 ** attempt, 10_000); log("warn", "network_error_retry", { source, attempt, error: e.name }); await sleep(ms); continue; }
      throw new HttpError(0, source);
    }
    if (limiter) limiter.update(res.headers);
    if (res.status === 401 || res.status === 403) {
      // Unsplash answers 403 when the hourly allowance is gone ("Rate Limit Exceeded"); keep that distinct from a bad key.
      if (limiter && limiter.remaining === 0) throw new RateLimitExhausted(source, 3_600_000);
      throw new AuthError(source, res.status);
    }
    if (res.status === 429) {
      const ra = Number(header(res.headers, "retry-after"));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(2000 * 2 ** attempt, 15_000);
      if (wait > (limiter ? limiter.maxWaitMs : 60_000) || attempt >= retries) throw new RateLimitExhausted(source, wait);
      log("warn", "rate_limited_wait", { source, waitMs: wait }); await sleep(wait); continue;
    }
    if (res.status >= 500 && attempt < retries) { await sleep(Math.min(1000 * 2 ** attempt, 10_000)); continue; }
    if (!res.ok) throw new HttpError(res.status, source);
    const json = await res.json();
    return { json, headers: res.headers, status: res.status };
  }
}

/** Run an async function over items with bounded concurrency, keeping result order. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k], k); }
  }));
  return out;
}

module.exports = { getJson, RateLimiter, RateLimitExhausted, AuthError, HttpError, mapLimit, defaultSleep };
