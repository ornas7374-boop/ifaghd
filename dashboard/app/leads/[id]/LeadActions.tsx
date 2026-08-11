"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LeadActions({
  leadId,
  pendingMessageId,
  automationPaused,
}: {
  leadId: number;
  pendingMessageId: number | null;
  automationPaused: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<Response>) {
    setBusy(action);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `${action} failed`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const post = (path: string, body?: Record<string, unknown>) =>
    fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });

  return (
    <div>
      <div>
        <button
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => run("generate", () => post(`/api/leads/${leadId}/generate-message`))}
        >
          {busy === "generate" ? "Generating…" : "Generate Message"}
        </button>

        <button
          className="btn btn-good"
          disabled={busy !== null || pendingMessageId === null}
          onClick={() =>
            run("approve", () => post(`/api/leads/${leadId}/approve-send`, { message_id: pendingMessageId }))
          }
          title={pendingMessageId === null ? "No message pending approval" : "Send this message"}
        >
          {busy === "approve" ? "Sending…" : "Approve & Send"}
        </button>

        <button
          className="btn"
          disabled={busy !== null}
          onClick={() => run("followup", () => post(`/api/leads/${leadId}/generate-message`))}
        >
          {busy === "followup" ? "Drafting…" : "Generate Follow-up"}
        </button>

        <button
          className="btn"
          disabled={busy !== null}
          onClick={() => run("interested", () => post(`/api/leads/${leadId}/status`, { status: "INTERESTED" }))}
        >
          Mark Interested
        </button>

        <button
          className="btn btn-primary"
          disabled={busy !== null}
          onClick={() => {
            const link = window.prompt("Demo link (optional):", "") || "";
            const when = window.prompt("Scheduled date/time (ISO, optional):", "") || "";
            run("demo", () => post(`/api/leads/${leadId}/book-demo`, { demo_link: link, scheduled_at: when }));
          }}
        >
          {busy === "demo" ? "Booking…" : "Book Demo"}
        </button>

        <button
          className="btn btn-good"
          disabled={busy !== null}
          onClick={() => run("won", () => post(`/api/leads/${leadId}/status`, { status: "WON" }))}
        >
          Mark Won
        </button>

        <button
          className="btn btn-bad"
          disabled={busy !== null}
          onClick={() => run("lost", () => post(`/api/leads/${leadId}/status`, { status: "LOST" }))}
        >
          Mark Lost
        </button>

        <button
          className="btn"
          disabled={busy !== null}
          onClick={() =>
            run("pause", () => post(`/api/leads/${leadId}/status`, { automation_paused: !automationPaused }))
          }
        >
          {automationPaused ? "Resume Automation" : "Pause Automation"}
        </button>
      </div>
      {error && <p style={{ color: "var(--bad)" }}>{error}</p>}
    </div>
  );
}
