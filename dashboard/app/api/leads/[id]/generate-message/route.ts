import { NextRequest, NextResponse } from "next/server";
import { generateMessage } from "@/lib/n8n";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ error: "invalid lead id" }, { status: 400 });
  }
  try {
    const result = await generateMessage(leadId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
