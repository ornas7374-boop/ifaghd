import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify Meta's X-Hub-Signature-256 header.
 *
 * Must run against the RAW request body — any JSON re-serialisation changes
 * the bytes and the HMAC will not match. That is why the webhook route uses
 * express.raw() rather than express.json().
 */
export function verifyMetaSignature(rawBody: Buffer | string, headerValue: string | undefined, appSecret: string): boolean {
  if (!headerValue || !appSecret) return false;

  const provided = headerValue.startsWith('sha256=') ? headerValue.slice(7) : headerValue;
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;

  const expected = createHmac('sha256', appSecret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided.toLowerCase(), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Constant-time comparison for the GET verification token. */
export function verifyToken(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
