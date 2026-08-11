const BASE = (process.env.N8N_WEBHOOK_URL || "").replace(/\/$/, "");

async function callWebhook<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  if (!BASE) {
    throw new Error("N8N_WEBHOOK_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  const res = await fetch(`${BASE}/webhook/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n webhook ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export function submitLead(lead: Record<string, unknown>) {
  return callWebhook("sales/leads-intake", lead);
}

export function generateMessage(leadId: number) {
  return callWebhook<{ message_id: number; body: string }>("sales/messages/generate", { lead_id: leadId });
}

export function approveAndSend(messageId: number) {
  return callWebhook("sales/messages/approve", { message_id: messageId });
}

export function bookDemo(leadId: number, scheduledAt?: string, demoLink?: string, notes?: string) {
  return callWebhook("sales/demo/book", {
    lead_id: leadId,
    scheduled_at: scheduledAt || "",
    demo_link: demoLink || "",
    notes: notes || "",
  });
}
