import { query, transaction } from '../pool.js';
import type { Conversation, ContentType, Message, MessageDirection, MessageRole } from '../types.js';

/**
 * One live conversation per (customer, channel). Reuses the open one, or
 * starts a new one. The partial unique index makes this safe under races.
 */
export async function findOrCreateOpenConversation(input: {
  tenantId: string;
  customerId: string;
  channel: string;
  channelAccountId?: string | null;
}): Promise<{ conversation: Conversation; created: boolean }> {
  const existing = await query<Conversation>(
    `SELECT * FROM conversations
      WHERE customer_id = $1 AND channel = $2 AND status IN ('open', 'handed_off')
      ORDER BY last_message_at DESC LIMIT 1`,
    [input.customerId, input.channel],
  );
  if (existing.rows[0]) return { conversation: existing.rows[0], created: false };

  const { rows } = await query<Conversation>(
    `INSERT INTO conversations (tenant_id, customer_id, channel, channel_account_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (customer_id, channel) WHERE status IN ('open', 'handed_off')
     DO UPDATE SET updated_at = now()
     RETURNING *`,
    [input.tenantId, input.customerId, input.channel, input.channelAccountId ?? null],
  );
  return { conversation: rows[0]!, created: true };
}

export async function getConversationById(tenantId: string, id: string): Promise<Conversation | null> {
  const { rows } = await query<Conversation>(
    'SELECT * FROM conversations WHERE id = $1 AND tenant_id = $2',
    [id, tenantId],
  );
  return rows[0] ?? null;
}

export interface AppendMessageInput {
  tenantId: string;
  conversationId: string;
  customerId: string;
  direction: MessageDirection;
  role: MessageRole;
  content: string;
  contentType?: ContentType;
  channelMessageId?: string | null;
  intent?: string | null;
  toolCalls?: unknown[];
  tokensIn?: number | null;
  tokensOut?: number | null;
  latencyMs?: number | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append a message. Returns null when `channelMessageId` was already stored —
 * that is the duplicate-webhook case, and the caller should stop there.
 */
export async function appendMessage(input: AppendMessageInput): Promise<Message | null> {
  const { rows } = await query<Message>(
    `INSERT INTO messages (
        tenant_id, conversation_id, customer_id, direction, role, content, content_type,
        channel_message_id, intent, tool_calls, tokens_in, tokens_out, latency_ms, model, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'text'),$8,$9,$10::jsonb,$11,$12,$13,$14,$15::jsonb)
     ON CONFLICT (tenant_id, channel_message_id) WHERE channel_message_id IS NOT NULL
     DO NOTHING
     RETURNING *`,
    [
      input.tenantId, input.conversationId, input.customerId, input.direction, input.role,
      input.content, input.contentType ?? null, input.channelMessageId ?? null, input.intent ?? null,
      JSON.stringify(input.toolCalls ?? []), input.tokensIn ?? null, input.tokensOut ?? null,
      input.latencyMs ?? null, input.model ?? null, JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rows[0] ?? null;
}

/** Most recent N messages, oldest-first (the order an LLM expects). */
export async function getRecentMessages(conversationId: string, limit = 10): Promise<Message[]> {
  const { rows } = await query<Message>(
    `SELECT * FROM (
       SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at DESC, created_at DESC LIMIT $2
     ) recent ORDER BY sent_at ASC, created_at ASC`,
    [conversationId, limit],
  );
  return rows;
}

/** Messages not yet folded into the rolling summary. */
export async function getMessagesSinceSummary(conversationId: string, summarizedCount: number, limit = 60): Promise<Message[]> {
  const { rows } = await query<Message>(
    `SELECT * FROM messages
      WHERE conversation_id = $1
      ORDER BY sent_at ASC, created_at ASC
      OFFSET $2 LIMIT $3`,
    [conversationId, summarizedCount, limit],
  );
  return rows;
}

export async function updateConversation(
  tenantId: string,
  id: string,
  patch: {
    status?: string;
    handledBy?: 'agent' | 'human';
    assignedAgentId?: string | null;
    lastIntent?: string | null;
    summary?: string | null;
    summaryMessageCount?: number | null;
    sentiment?: string | null;
  },
): Promise<Conversation | null> {
  const { rows } = await query<Conversation>(
    `UPDATE conversations
        SET status                = COALESCE($3, status),
            handled_by            = COALESCE($4, handled_by),
            assigned_agent_id     = COALESCE($5, assigned_agent_id),
            last_intent           = COALESCE($6, last_intent),
            summary               = COALESCE($7, summary),
            summary_message_count = COALESCE($8, summary_message_count),
            sentiment             = COALESCE($9, sentiment),
            closed_at             = CASE WHEN $3 IN ('resolved','closed') THEN now() ELSE closed_at END
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [
      id, tenantId, patch.status ?? null, patch.handledBy ?? null, patch.assignedAgentId ?? null,
      patch.lastIntent ?? null, patch.summary ?? null, patch.summaryMessageCount ?? null, patch.sentiment ?? null,
    ],
  );
  return rows[0] ?? null;
}

/** Hand the conversation to a human: the agent stops replying on it. */
export async function markHandedOff(tenantId: string, conversationId: string): Promise<void> {
  await query(
    `UPDATE conversations SET status = 'handed_off', handled_by = 'human'
      WHERE id = $1 AND tenant_id = $2`,
    [conversationId, tenantId],
  );
}

/** Give the conversation back to the bot (used by the agent console). */
export async function returnToAgent(tenantId: string, conversationId: string): Promise<void> {
  await query(
    `UPDATE conversations SET status = 'open', handled_by = 'agent', assigned_agent_id = NULL
      WHERE id = $1 AND tenant_id = $2`,
    [conversationId, tenantId],
  );
}

export async function closeStaleConversations(olderThanHours = 24): Promise<number> {
  const { rowCount } = await query(
    `UPDATE conversations SET status = 'closed', closed_at = now()
      WHERE status = 'open' AND last_message_at < now() - ($1 || ' hours')::interval`,
    [String(olderThanHours)],
  );
  return rowCount ?? 0;
}

export { transaction };
