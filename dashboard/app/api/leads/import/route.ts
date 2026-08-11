import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
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
  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return NextResponse.json({ error: "csv text is required" }, { status: 400 });
  }

  const rows = parseCsv(body.csv);
  let imported = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.company_name || !row.company_name.trim()) {
      errors.push(`Skipped row (missing company_name): ${JSON.stringify(row)}`);
      continue;
    }
    const lead: Record<string, string> = {};
    for (const f of FIELDS) lead[f] = row[f] || "";
    if (!lead.source) lead.source = "csv_import";

    try {
      await submitLead(lead);
      imported++;
    } catch (e) {
      errors.push(`${row.company_name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ imported, total: rows.length, errors });
}
