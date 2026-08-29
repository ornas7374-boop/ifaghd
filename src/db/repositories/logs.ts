import { query } from '../pool.js';

export interface AgentLogInput {
  tenantId?: string | null;
  conversationId?: string | null;
  customerId?: string | null;
  messageId?: string | null;
  traceId: string;
  step: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  status?: 'ok' | 'error' | 'skipped' | 'blocked' | 'retry';
  detail?: Record<string, unknown>;
  errorMessage?: string | null;
  durationMs?: number | null;
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: number | null;
}

/**
 * Writes an audit row. Never throws: losing a log line must not cost a
 * customer their answer. Failures surface on stderr instead.
 */
export async function writeAgentLog(input: AgentLogInput): Promise<void> {
  try {
    await query(
      `INSERT INTO agent_logs (
         tenant_id, conversation_id, customer_id, message_id, trace_id, step, level,
         status, detail, error_message, duration_ms, model, tokens_in, tokens_out, cost_usd)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'info'),COALESCE($8,'ok'),$9::jsonb,$10,$11,$12,$13,$14,$15)`,
      [
        input.tenantId ?? null, input.conversationId ?? null, input.customerId ?? null,
        input.messageId ?? null, input.traceId, input.step, input.level ?? null, input.status ?? null,
        JSON.stringify(input.detail ?? {}), input.errorMessage ?? null, input.durationMs ?? null,
        input.model ?? null, input.tokensIn ?? null, input.tokensOut ?? null, input.costUsd ?? null,
      ],
    );
  } catch (err) {
    process.stderr.write(`[agent_logs] write failed: ${(err as Error).message}\n`);
  }
}

export async function getTrace(traceId: string): Promise<Array<Record<string, unknown>>> {
  const { rows } = await query('SELECT * FROM agent_logs WHERE trace_id = $1 ORDER BY created_at', [traceId]);
  return rows;
}

// ---------------------------------------------------------------------------
// Webhook event log — the idempotency gate for provider retries.
// ---------------------------------------------------------------------------

export async function recordWebhookEvent(input: {
  tenantId?: string | null;
  channel: string;
  externalEventId: string;
  payload: unknown;
}): Promise<{ id: string; duplicate: boolean }> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO webhook_events (tenant_id, channel, external_event_id, payload)
     VALUES ($1,$2,$3,$4::jsonb)
     ON CONFLICT (channel, external_event_id) DO NOTHING
     RETURNING id`,
    [input.tenantId ?? null, input.channel, input.externalEventId, JSON.stringify(input.payload ?? {})],
  );
  if (rows[0]) return { id: rows[0].id, duplicate: false };

  const existing = await query<{ id: string }>(
    'SELECT id FROM webhook_events WHERE channel = $1 AND external_event_id = $2',
    [input.channel, input.externalEventId],
  );
  return { id: existing.rows[0]!.id, duplicate: true };
}

export async function updateWebhookEvent(
  id: string,
  status: 'processing' | 'processed' | 'failed' | 'skipped',
  error?: string,
): Promise<void> {
  await query(
    `UPDATE webhook_events
        SET status = $2, error = $3,
            processed_at = CASE WHEN $2 IN ('processed','failed','skipped') THEN now() ELSE processed_at END
      WHERE id = $1`,
    [id, status, error ?? null],
  );
}
