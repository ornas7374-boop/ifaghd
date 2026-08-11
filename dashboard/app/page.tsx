import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Counts {
  total: number;
  hot: number;
  warm: number;
  contacted: number;
  replied: number;
  interested: number;
  demo: number;
  proposal: number;
  negotiation: number;
  won: number;
  lost: number;
  qualified: number;
  leadonly: number;
  needs_human: number;
}

async function getCounts(): Promise<Counts> {
  const row = await query<Record<string, string>>(`
    SELECT
      (SELECT count(*) FROM leads) AS total,
      (SELECT count(*) FROM leads WHERE temperature = 'HOT') AS hot,
      (SELECT count(*) FROM leads WHERE temperature = 'WARM') AS warm,
      (SELECT count(*) FROM leads WHERE status = 'LEAD') AS leadonly,
      (SELECT count(*) FROM leads WHERE status = 'QUALIFIED') AS qualified,
      (SELECT count(*) FROM leads WHERE status = 'CONTACTED') AS contacted,
      (SELECT count(*) FROM leads WHERE status = 'REPLIED') AS replied,
      (SELECT count(*) FROM leads WHERE status = 'INTERESTED') AS interested,
      (SELECT count(*) FROM leads WHERE status = 'DEMO') AS demo,
      (SELECT count(*) FROM leads WHERE status = 'PROPOSAL') AS proposal,
      (SELECT count(*) FROM leads WHERE status = 'NEGOTIATION') AS negotiation,
      (SELECT count(*) FROM leads WHERE status = 'WON') AS won,
      (SELECT count(*) FROM leads WHERE status = 'LOST') AS lost,
      (SELECT count(*) FROM leads WHERE needs_human = TRUE) AS needs_human
  `);
  const r = row[0];
  return {
    total: Number(r.total),
    hot: Number(r.hot),
    warm: Number(r.warm),
    leadonly: Number(r.leadonly),
    qualified: Number(r.qualified),
    contacted: Number(r.contacted),
    replied: Number(r.replied),
    interested: Number(r.interested),
    demo: Number(r.demo),
    proposal: Number(r.proposal),
    negotiation: Number(r.negotiation),
    won: Number(r.won),
    lost: Number(r.lost),
    needs_human: Number(r.needs_human),
  };
}

export default async function DashboardPage() {
  const c = await getCounts();
  const funnelSteps: [string, number][] = [
    ["Leads", c.total],
    ["Qualified", c.qualified + c.contacted + c.replied + c.interested + c.demo + c.proposal + c.negotiation + c.won],
    ["Contacted", c.contacted + c.replied + c.interested + c.demo + c.proposal + c.negotiation + c.won],
    ["Replied", c.replied + c.interested + c.demo + c.proposal + c.negotiation + c.won],
    ["Interested", c.interested + c.demo + c.proposal + c.negotiation + c.won],
    ["Demo", c.demo + c.proposal + c.negotiation + c.won],
    ["Won", c.won],
  ];
  const maxVal = Math.max(1, ...funnelSteps.map(([, v]) => v));

  return (
    <div>
      {c.needs_human > 0 && (
        <div className="human-required">
          🔴 Human action required on {c.needs_human} lead{c.needs_human > 1 ? "s" : ""} —{" "}
          <a href="/leads?needs_human=1">review now</a>
        </div>
      )}

      <div className="grid-stats">
        <Stat label="Total Leads" value={c.total} />
        <Stat label="Hot" value={c.hot} />
        <Stat label="Warm" value={c.warm} />
        <Stat label="Contacted" value={c.contacted} />
        <Stat label="Replies" value={c.replied} />
        <Stat label="Interested" value={c.interested} />
        <Stat label="Demos" value={c.demo} />
        <Stat label="Proposals" value={c.proposal + c.negotiation} />
        <Stat label="Won" value={c.won} />
        <Stat label="Lost" value={c.lost} />
      </div>

      <div className="card">
        <h2>Sales Funnel</h2>
        <div className="funnel">
          {funnelSteps.map(([label, value]) => (
            <div className="funnel-row" key={label}>
              <div className="funnel-label">{label}</div>
              <div className="funnel-bar-track">
                <div
                  className="funnel-bar-fill"
                  style={{ width: `${Math.max(4, (value / maxVal) * 100)}%` }}
                >
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="muted small">
        Go to <a href="/leads">Leads</a> to review, approve messages, and move deals forward.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
