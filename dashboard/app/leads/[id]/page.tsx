import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import type { Lead, Message, Activity, Followup, Appointment } from "@/lib/types";
import LeadActions from "./LeadActions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const leadId = Number(params.id);
  if (!Number.isFinite(leadId)) notFound();

  const lead = await queryOne<Lead>(`SELECT * FROM leads WHERE id = $1`, [leadId]);
  if (!lead) notFound();

  const [messages, activities, followups, appointments, scoreActivity, lastClassified] = await Promise.all([
    query<Message>(`SELECT * FROM messages WHERE lead_id = $1 ORDER BY created_at ASC`, [leadId]),
    query<Activity>(`SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 30`, [leadId]),
    query<Followup>(`SELECT * FROM followups WHERE lead_id = $1 ORDER BY scheduled_at ASC`, [leadId]),
    query<Appointment>(`SELECT * FROM appointments WHERE lead_id = $1 ORDER BY created_at DESC`, [leadId]),
    queryOne<Activity>(
      `SELECT * FROM activities WHERE lead_id = $1 AND type = 'SCORE_UPDATED' ORDER BY created_at DESC LIMIT 1`,
      [leadId]
    ),
    queryOne<Message>(
      `SELECT * FROM messages WHERE lead_id = $1 AND classification IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      [leadId]
    ),
  ]);

  const pendingMessage = messages.find((m) => m.status === "PENDING_APPROVAL") || null;
  const breakdown = (scoreActivity?.metadata?.breakdown as Record<string, number> | undefined) || null;

  return (
    <div>
      {lead.needs_human && (
        <div className="human-required">🔴 Human action required — {lead.company_name} needs your attention</div>
      )}

      <h1>{lead.company_name}</h1>
      <p className="muted">
        {lead.business_type || "Unknown business type"} · Source: {lead.source}
      </p>

      <div className="card">
        <LeadActions
          leadId={lead.id}
          pendingMessageId={pendingMessage?.id ?? null}
          automationPaused={lead.automation_paused}
        />
      </div>

      <div className="card">
        <h2>Company Information</h2>
        <table>
          <tbody>
            <Row label="Contact" value={lead.contact_name} />
            <Row label="Phone" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row
              label="Website"
              value={
                lead.website ? (
                  <a href={lead.website} target="_blank" rel="noreferrer">
                    {lead.website}
                  </a>
                ) : null
              }
            />
            <Row label="Instagram" value={lead.instagram} />
            <Row label="Status" value={<span className="pill">{lead.status}</span>} />
            <Row label="Notes" value={lead.notes} />
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>
          Lead Score: {lead.score} <span className={`badge badge-${lead.temperature}`}>{lead.temperature}</span>
        </h2>
        {breakdown && (
          <ul className="small muted">
            {Object.entries(breakdown).map(([k, v]) => (
              <li key={k}>
                {k}: +{v}
              </li>
            ))}
          </ul>
        )}
        <h3>Recommended Next Action</h3>
        <p>{lastClassified?.recommended_action || "Generate an outreach message to get started."}</p>
        {lastClassified?.classification && (
          <p className="small muted">Last reply classified as: {lastClassified.classification}</p>
        )}
      </div>

      <div className="card">
        <h2>Conversation</h2>
        {messages.length === 0 && <p className="muted">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.direction}`}>
            <div>{m.body}</div>
            <div className="msg-meta">
              {m.direction === "OUTBOUND" ? "You" : "Them"} · {m.status}
              {m.classification ? ` · ${m.classification}` : ""} · {new Date(m.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Follow-ups</h2>
        {followups.length === 0 && <p className="muted">None scheduled.</p>}
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((f) => (
              <tr key={f.id}>
                <td>#{f.sequence_step}</td>
                <td>{new Date(f.scheduled_at).toLocaleString()}</td>
                <td>
                  <span className="pill">{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {appointments.length > 0 && (
        <div className="card">
          <h2>Appointments</h2>
          {appointments.map((a) => (
            <p key={a.id}>
              {a.type} — {a.status} {a.scheduled_at ? `· ${new Date(a.scheduled_at).toLocaleString()}` : ""}
              {a.demo_link ? (
                <>
                  {" "}
                  ·{" "}
                  <a href={a.demo_link} target="_blank" rel="noreferrer">
                    demo link
                  </a>
                </>
              ) : null}
            </p>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Activity</h2>
        {activities.map((a) => (
          <div key={a.id} className="small" style={{ marginBottom: 8 }}>
            <span className="muted">{new Date(a.created_at).toLocaleString()}</span> — <b>{a.type}</b>:{" "}
            {a.description}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <tr>
      <th style={{ width: 140 }}>{label}</th>
      <td>{value || <span className="muted">—</span>}</td>
    </tr>
  );
}
