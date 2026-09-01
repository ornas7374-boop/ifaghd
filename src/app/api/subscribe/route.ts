import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { upsertSubscriber } from "@/lib/db";
import { signSession } from "@/lib/token";

const COOKIE_NAME = "gift_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — enough to revisit /gift without resubmitting.

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "تأكد من كتابة الإيميل بشكل صحيح." },
      { status: 400 }
    );
  }

  const rawEmail = (body as { email?: unknown })?.email;
  if (typeof rawEmail !== "string" || !isValidEmail(rawEmail)) {
    return NextResponse.json(
      { ok: false, error: "تأكد من كتابة الإيميل بشكل صحيح." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(rawEmail);

  let sessionToken: string;
  try {
    // Unique constraint on email means a repeat submission never creates a
    // duplicate row — it just re-authenticates the same subscriber.
    upsertSubscriber(email);
    sessionToken = signSession(email);
  } catch (err) {
    // Covers both a DB failure and a misconfigured server (e.g. APP_SECRET
    // not set yet) — either way the visitor gets a clean JSON error instead
    // of a bare 500, and the real cause lands in the server logs.
    console.error("subscribe: failed to register", err);
    return NextResponse.json(
      { ok: false, error: "صار خطأ بسيط، جرّب مرة ثانية." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
