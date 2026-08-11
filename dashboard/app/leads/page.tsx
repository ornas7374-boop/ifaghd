import Link from "next/link";
import { query } from "@/lib/db";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

interface LeadRow extends Lead {
  recommended_action: string | null;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { needs_human?: string; status?: string };
}) {
  const filters: string[] = [];
  const params: unknown[] = [];
  if (searchParams.needs_human === "1") {
    filters.push(`l.needs_human = TRUE`);
  }
  if (searchParams.status) {
    params.push(searchParams.status);
    filters.push(`l.status = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const leads = await query<LeadRow>(
    `
    SELECT l.*, m.recommended_action
    FROM leads l
    LEFT JOIN LATERAL (
      SELECT recommended_action FROM messages
      WHERE lead_id = l.id AND recommended_action IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    ) m ON true
    ${where}
    ORDER BY l.needs_human DESC, l.score DESC, l.created_at DESC
    LIMIT 200
    `,
    params
  );

  return (
    <div>
      <h1>Leads ({leads.length})</h1>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Score</th>
              <th>Temp</th>
              <th>Status</th>
              <th>Last Contact</th>
              <th>Next Follow-up</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link href={`/leads/${lead.id}`}>{lead.company_name}</Link>
                  {lead.needs_human && <div className="small" style={{ color: "var(--bad)" }}>🔴 needs you</div>}
                </td>
                <td>{lead.contact_name || <span className="muted">—</span>}</td>
                <td>{lead.score}</td>
                <td>
                  <span className={`badge badge-${lead.temperature}`}>{lead.temperature}</span>
                </td>
                <td>
                  <span className="pill">{lead.status}</span>
                </td>
                <td className="small muted">{fmt(lead.last_contacted_at)}</td>
                <td className="small muted">{fmt(lead.next_followup_at)}</td>
                <td className="small">{lead.recommended_action || <span className="muted">—</span>}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 30 }}>
                  No leads yet. Add one manually, import a CSV, or wait for the webhook.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}
