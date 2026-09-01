import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { verifySession, verifyFileAccess } from "@/lib/token";
import { getGiftConfig, guessContentType } from "@/lib/gift";

const COOKIE_NAME = "gift_session";

export async function GET(req: NextRequest) {
  const session = verifySession(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح لك بالوصول." }, { status: 403 });
  }

  const exp = Number(req.nextUrl.searchParams.get("exp"));
  const sig = req.nextUrl.searchParams.get("sig") || "";
  if (!verifyFileAccess(session.email, exp, sig)) {
    return NextResponse.json(
      { error: "انتهت صلاحية هذا الرابط. ارجع لصفحة الهدية لتجديده." },
      { status: 403 }
    );
  }

  const gift = getGiftConfig();
  if (gift.mode !== "file") {
    return NextResponse.json({ error: "الهدية غير متاحة كملف." }, { status: 404 });
  }

  if (!fs.existsSync(gift.filePath)) {
    console.error("gift-file: missing file at", gift.filePath);
    return NextResponse.json(
      { error: "ملف الهدية غير موجود على الخادم بعد." },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(gift.filePath);
  const download = req.nextUrl.searchParams.get("dl") === "1";
  const encodedName = encodeURIComponent(gift.fileName);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": guessContentType(gift.fileName),
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
