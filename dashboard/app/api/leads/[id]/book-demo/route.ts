import { NextRequest, NextResponse } from "next/server";
import { bookDemo } from "@/lib/n8n";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ error: "invalid lead id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const result = await bookDemo(leadId, body.scheduled_at, body.demo_link, body.notes);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
