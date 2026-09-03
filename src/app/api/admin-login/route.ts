import { NextRequest, NextResponse } from "next/server";
import { safeCompare, signAdminSession } from "@/lib/token";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "لوحة الإدارة غير مفعّلة على هذا السيرفر." },
      { status: 503 }
    );
  }

  const password = (body as { password?: unknown })?.password;
  if (typeof password !== "string" || !safeCompare(password, expected)) {
    return NextResponse.json({ ok: false, error: "كلمة المرور غير صحيحة." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
