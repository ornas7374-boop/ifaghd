import crypto from "node:crypto";

const SECRET = process.env.APP_SECRET;

if (!SECRET || SECRET.length < 16) {
  throw new Error(
    "APP_SECRET is missing or too short. Set a random 32+ character value " +
      "in your environment (see .env.example) — it signs the access cookie " +
      "and the gift file's signed URL."
  );
}

function hmac(input: string): string {
  return crypto.createHmac("sha256", SECRET as string).update(input).digest("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Signed, tamper-proof cookie value that proves this browser submitted `email`. */
export function signSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, iat: Date.now() })).toString(
    "base64url"
  );
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined | null): { email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!timingSafeEqual(hmac(payload), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.email !== "string") return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

/** Short-lived signed URL params for the protected gift file — stands in for a cloud "signed URL". */
export function signFileAccess(email: string, ttlMs = 10 * 60 * 1000) {
  const exp = Date.now() + ttlMs;
  const sig = hmac(`${email}:${exp}`);
  return { exp, sig };
}

export function verifyFileAccess(email: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return timingSafeEqual(hmac(`${email}:${exp}`), sig);
}

/** Timing-safe string comparison, exposed for checking the admin password. */
export function safeCompare(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}

/** Signed cookie value proving this browser passed the admin password check. */
export function signAdminSession(): string {
  return hmac("admin-authenticated");
}

export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  return timingSafeEqual(token, hmac("admin-authenticated"));
}
