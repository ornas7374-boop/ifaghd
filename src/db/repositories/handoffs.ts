import { query } from '../pool.js';
import type { HandoffReason, HumanHandoff, Priority, SupportTicket, TicketCategory } from '../types.js';

export async function createHandoff(input: {
  tenantId: string;
  conversationId: string;
  customerId: string;
  reasonCode: HandoffReason;
  reasonDetail?: string;
  priority?: Priority;
  conversationSummary?: string | null;
  lastCustomerMessage?: string | null;
  customerSnapshot?: Record<string, unknown>;
}): Promise<HumanHandoff> {
  const { rows } = await query<HumanHandoff>(
    `INSERT INTO human_handoffs (
       tenant_id, conversation_id, customer_id, reason_code, reason_detail,
       priority, conversation_summary, last_customer_message, customer_snapshot)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'normal'),$7,$8,$9::jsonb)
     RETURNING *`,
    [
      input.tenantId, input.conversationId, input.customerId, input.reasonCode,
      input.reasonDetail ?? null, input.priority ?? null, input.conversationSummary ?? null,
      input.lastCustomerMessage ?? null, JSON.stringify(input.customerSnapshot ?? {}),
    ],
  );
  return rows[0]!;
}

/**
 * A conversation already waiting on a human should not spawn a second ticket
 * every time the customer sends another message.
 */
export async function findActiveHandoff(conversationId: string): Promise<HumanHandoff | null> {
  const { rows } = await query<HumanHandoff>(
    `SELECT * FROM human_handoffs
      WHERE conversation_id = $1 AND status IN ('pending', 'notified', 'claimed')
      ORDER BY created_at DESC LIMIT 1`,
    [conversationId],
  );
  return rows[0] ?? null;
}

export async function markHandoffNotified(id: string, status: 'sent' | 'failed' | 'skipped', error?: string): Promise<void> {
  await query(
    `UPDATE human_handoffs
        SET notification_status = $2,
            notification_error  = $3,
            notified_at         = CASE WHEN $2 = 'sent' THEN now() ELSE notified_at END,
            status              = CASE WHEN $2 = 'sent' THEN 'notified' ELSE status END
      WHERE id = $1`,
    [id, status, error ?? null],
  );
}

export async function listPendingHandoffs(tenantId: string, limit = 50): Promise<HumanHandoff[]> {
  const { rows } = await query<HumanHandoff>(
    `SELECT * FROM human_handoffs
      WHERE tenant_id = $1 AND status IN ('pending', 'notified', 'claimed')
      ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
               created_at
      LIMIT $2`,
    [tenantId, limit],
  );
  return rows;
}

export async function resolveHandoff(tenantId: string, id: string, note?: string, resolvedBy?: string): Promise<HumanHandoff | null> {
  const { rows } = await query<HumanHandoff>(
    `UPDATE human_handoffs
        SET status = 'resolved', resolved_at = now(),
            resolution_note = $3, assigned_to = COALESCE($4, assigned_to)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [id, tenantId, note ?? null, resolvedBy ?? null],
  );
  return rows[0] ?? null;
}

export async function createTicket(input: {
  tenantId: string;
  customerId: string;
  conversationId?: string | null;
  orderId?: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority?: Priority;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}): Promise<SupportTicket> {
  const { rows } = await query<SupportTicket>(
    `INSERT INTO support_tickets (
       tenant_id, customer_id, conversation_id, order_id, ticket_number,
       category, subject, description, priority, created_by, metadata)
     VALUES ($1,$2,$3,$4,next_ticket_number($1),$5,$6,$7,COALESCE($8,'normal'),COALESCE($9,'agent'),$10::jsonb)
     RETURNING *`,
    [
      input.tenantId, input.customerId, input.conversationId ?? null, input.orderId ?? null,
      input.category, input.subject, input.description, input.priority ?? null,
      input.createdBy ?? null, JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rows[0]!;
}

export async function getTicketByNumber(tenantId: string, ticketNumber: string): Promise<SupportTicket | null> {
  const { rows } = await query<SupportTicket>(
    'SELECT * FROM support_tickets WHERE tenant_id = $1 AND ticket_number = $2',
    [tenantId, ticketNumber],
  );
  return rows[0] ?? null;
}

/** Guards against a customer opening five identical tickets in one chat. */
export async function findRecentTicketForConversation(
  conversationId: string,
  category: TicketCategory,
  withinMinutes = 60,
): Promise<SupportTicket | null> {
  const { rows } = await query<SupportTicket>(
    `SELECT * FROM support_tickets
      WHERE conversation_id = $1 AND category = $2
        AND created_at > now() - ($3 || ' minutes')::interval
        AND status NOT IN ('resolved', 'closed')
      ORDER BY created_at DESC LIMIT 1`,
    [conversationId, category, String(withinMinutes)],
  );
  return rows[0] ?? null;
}
