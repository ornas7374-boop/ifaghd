import { NextRequest, NextResponse } from "next/server";
import { approveAndSend } from "@/lib/n8n";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const messageId = Number(body.message_id);
  if (!Number.isFinite(leadId) || !Number.isFinite(messageId)) {
    return NextResponse.json({ error: "invalid lead id or message id" }, { status: 400 });
  }
  try {
    const result = await approveAndSend(messageId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
