import { decodeEvents } from "@/lib/calendar";
import { buildIcs } from "@/lib/ics";

// يرجّع ملف .ics بنوع text/calendar — الآيفون يفتحه مباشرة في التقويم مع زر «إضافة الكل».
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("d");
  if (!token) return new Response("missing events", { status: 400 });
  try {
    const ics = buildIcs(decodeEvents(token));
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="azm.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("invalid events", { status: 400 });
  }
}
