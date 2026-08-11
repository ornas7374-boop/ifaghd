import { NextRequest, NextResponse } from "next/server";
import { submitLead } from "@/lib/n8n";

const FIELDS = [
  "company_name",
  "contact_name",
  "phone",
  "email",
  "website",
  "instagram",
  "business_type",
  "source",
  "notes",
] as const;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.company_name || typeof body.company_name !== "string" || !body.company_name.trim()) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }
  const lead: Record<string, string> = {};
  for (const f of FIELDS) {
    lead[f] = typeof body[f] === "string" ? body[f] : "";
  }
  if (!lead.source) lead.source = "manual";

  try {
    const result = await submitLead(lead);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
