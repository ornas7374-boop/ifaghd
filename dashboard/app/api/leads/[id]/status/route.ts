import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { PIPELINE_STATUSES } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ error: "invalid lead id" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));

  try {
    if (typeof body.status === "string") {
      if (!PIPELINE_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      await query(`UPDATE leads SET status = $1, updated_at = now() WHERE id = $2`, [body.status, leadId]);
      await query(`INSERT INTO activities (lead_id, type, description) VALUES ($1, 'STATUS_CHANGED', $2)`, [
        leadId,
        `Manually marked as ${body.status}`,
      ]);
    }

    if (typeof body.automation_paused === "boolean") {
      await query(`UPDATE leads SET automation_paused = $1, updated_at = now() WHERE id = $2`, [
        body.automation_paused,
        leadId,
      ]);
      await query(`INSERT INTO activities (lead_id, type, description) VALUES ($1, 'AUTOMATION_TOGGLED', $2)`, [
        leadId,
        body.automation_paused ? "Automation paused by you" : "Automation resumed by you",
      ]);
      if (body.automation_paused === false) {
        await query(`UPDATE leads SET needs_human = FALSE WHERE id = $1`, [leadId]);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
