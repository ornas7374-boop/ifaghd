import { UpstreamError } from './errors.js';

export interface HttpJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  label?: string;
}

/**
 * fetch() wrapper that turns transport failures and non-2xx responses into
 * UpstreamError with an accurate `retryable` flag, so callers can back off
 * on 429/5xx without retrying a 400 that will never succeed.
 */
export async function httpJson<T = unknown>(url: string, opts: HttpJsonOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs = 15_000, label = 'http request' } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    throw new UpstreamError(aborted ? `${label} timed out after ${timeoutMs}ms` : `${label} network failure`, {
      code: aborted ? 'upstream_timeout' : 'upstream_network_error',
      retryable: true,
      cause: err,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    throw new UpstreamError(`${label} failed with HTTP ${res.status}`, {
      code: `upstream_http_${res.status}`,
      // 408/409/429 and 5xx are worth another attempt; other 4xx are not.
      retryable: res.status >= 500 || [408, 409, 429].includes(res.status),
      details: { status: res.status, body: truncate(parsed) },
    });
  }
  return parsed as T;
}

function truncate(value: unknown, max = 800): unknown {
  const s = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return s && s.length > max ? `${s.slice(0, max)}…` : value;
}
