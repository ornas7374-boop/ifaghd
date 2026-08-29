import { env } from '../config/env.js';
import { logger } from '../observability/logger.js';
import { newTraceId } from '../utils/ids.js';
import { toErrorInfo } from '../utils/errors.js';
import { resolveChannelAccount } from '../db/repositories/tenants.js';
import { findOrCreateCustomer } from '../db/repositories/customers.js';
import { appendMessage, findOrCreateOpenConversation, getConversationById, updateConversation } from '../db/repositories/conversations.js';
import { writeAgentLog } from '../db/repositories/logs.js';
import { consumeRateLimit } from '../db/repositories/rateLimit.js';
import { getChannelAdapter } from '../channels/registry.js';
import { runAgentTurn } from './agent.js';
import { maybeUpdateSummary } from './memory.js';
import type { NormalizedInboundMessage } from '../channels/core/types.js';
import type { Conversation, Customer, Tenant } from '../db/types.js';

export type PipelineOutcome =
  | 'replied'
  | 'escalated'
  | 'duplicate'
  | 'rate_limited'
  | 'blocked_customer'
  | 'human_handling'
  | 'unknown_channel_account'
  | 'tenant_inactive'
  | 'empty_message'
  | 'send_failed'
  | 'error';

export interface PipelineResult {
  outcome: PipelineOutcome;
  traceId: string;
  tenantId?: string;
  customerId?: string;
  conversationId?: string;
  intent?: string;
  reply?: string;
  handedOff?: boolean;
  deliveryStatus?: 'sent' | 'failed' | 'skipped';
  latencyMs: number;
  error?: string;
}

export interface PipelineOptions {
  /** Skip the outbound send (n8n mode: n8n owns delivery). */
  skipSend?: boolean;
  traceId?: string;
}

/**
 * The full inbound path: identify → guard → agent → send → persist → log.
 *
 * Every early return is a legitimate outcome (duplicate webhook, human already
 * handling, rate limited); only a genuine bug returns 'error'. Callers get a
 * result object rather than an exception so a single bad message can never
 * take down a batch.
 */
export async function processInboundMessage(
  inbound: NormalizedInboundMessage,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const cfg = env();
  const log = logger();
  const traceId = options.traceId ?? newTraceId();
  const startedAt = Date.now();

  const done = (outcome: PipelineOutcome, extra: Partial<PipelineResult> = {}): PipelineResult => ({
    outcome, traceId, latencyMs: Date.now() - startedAt, ...extra,
  });

  let tenant: Tenant | undefined;
  let customer: Customer | undefined;
  let conversation: Conversation | undefined;

  try {
    // ---- 1. Resolve tenant from the channel account ---------------------
    const resolved = await resolveChannelAccount(inbound.channel, inbound.channelAccountExternalId);
    if (!resolved) {
      log.warn({ channel: inbound.channel, externalId: inbound.channelAccountExternalId }, 'no tenant for channel account');
      await writeAgentLog({
        traceId, step: 'pipeline.resolve_tenant', level: 'warn', status: 'error',
        errorMessage: 'unknown channel account',
        detail: { channel: inbound.channel, externalId: inbound.channelAccountExternalId },
      });
      return done('unknown_channel_account');
    }
    tenant = resolved.tenant;

    if (tenant.status === 'suspended') {
      await writeAgentLog({ tenantId: tenant.id, traceId, step: 'pipeline.tenant_check', status: 'skipped', detail: { status: tenant.status } });
      return done('tenant_inactive', { tenantId: tenant.id });
    }

    // ---- 2. Identify the customer ---------------------------------------
    const { customer: c } = await findOrCreateCustomer({
      tenantId: tenant.id,
      phone: inbound.customerPhone,
      name: inbound.customerName,
      locale: tenant.default_locale,
    });
    customer = c;

    if (customer.is_blocked) {
      await writeAgentLog({
        tenantId: tenant.id, customerId: customer.id, traceId,
        step: 'pipeline.blocked_customer', status: 'skipped',
      });
      return done('blocked_customer', { tenantId: tenant.id, customerId: customer.id });
    }

    // ---- 3. Rate limit (abuse + runaway-cost protection) -----------------
    const perMinute = await consumeRateLimit(`msg:${customer.id}:m`, cfg.RATE_LIMIT_PER_MINUTE, 60);
    const perHour = await consumeRateLimit(`msg:${customer.id}:h`, cfg.RATE_LIMIT_PER_HOUR, 3600);
    if (!perMinute.allowed || !perHour.allowed) {
      await writeAgentLog({
        tenantId: tenant.id, customerId: customer.id, traceId,
        step: 'pipeline.rate_limited', level: 'warn', status: 'blocked',
        detail: { perMinute: perMinute.count, perHour: perHour.count },
      });
      return done('rate_limited', { tenantId: tenant.id, customerId: customer.id });
    }

    // ---- 4. Conversation --------------------------------------------------
    const { conversation: conv } = await findOrCreateOpenConversation({
      tenantId: tenant.id,
      customerId: customer.id,
      channel: inbound.channel,
      channelAccountId: resolved.account.id,
    });
    conversation = conv;

    // ---- 5. Persist the inbound message (idempotency gate) ---------------
    const stored = await appendMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      customerId: customer.id,
      direction: 'inbound',
      role: 'customer',
      content: inbound.text,
      contentType: inbound.contentType,
      channelMessageId: inbound.externalMessageId,
      metadata: { trace_id: traceId, received_at: new Date().toISOString() },
    });

    if (!stored) {
      // The unique index rejected it: Meta redelivered a message we answered.
      log.info({ externalMessageId: inbound.externalMessageId }, 'duplicate message ignored');
      return done('duplicate', { tenantId: tenant.id, customerId: customer.id, conversationId: conversation.id });
    }

    // Re-read: the insert trigger bumped message_count, which memory uses.
    conversation = (await getConversationById(tenant.id, conversation.id)) ?? conversation;

    // ---- 6. A human is already on this conversation ----------------------
    if (conversation.handled_by === 'human') {
      await writeAgentLog({
        tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
        step: 'pipeline.human_handling', status: 'skipped',
      });
      return done('human_handling', { tenantId: tenant.id, customerId: customer.id, conversationId: conversation.id });
    }

    // ---- 7. Nothing to answer -------------------------------------------
    if (!inbound.text.trim()) {
      return done('empty_message', { tenantId: tenant.id, customerId: customer.id, conversationId: conversation.id });
    }

    // Blue ticks while we think. Best-effort, never blocking.
    const adapter = getChannelAdapter(inbound.channel);
    void adapter?.markRead?.(inbound.externalMessageId, inbound.channelAccountExternalId).catch(() => {});

    // ---- 8. Agent turn ----------------------------------------------------
    const turn = await runAgentTurn({
      tenant, customer, conversation,
      messageText: inbound.text,
      traceId,
    });

    // ---- 9. Send ----------------------------------------------------------
    let deliveryStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let outboundExternalId: string | null = null;

    if (!options.skipSend) {
      if (!adapter) {
        deliveryStatus = 'failed';
        log.error({ channel: inbound.channel }, 'no adapter registered for channel');
      } else {
        const send = await adapter.send({
          to: customer.phone,
          text: turn.reply,
          channelAccountExternalId: inbound.channelAccountExternalId,
        });
        deliveryStatus = send.status === 'sent' ? 'sent' : 'failed';
        outboundExternalId = send.externalMessageId;
        if (send.status === 'failed') {
          // The reply is still stored below, so a human can see what the
          // customer should have received.
          await writeAgentLog({
            tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
            step: 'channel.send', level: 'error', status: 'error', errorMessage: send.error ?? 'send failed',
          });
        }
      }
    }

    // ---- 10. Persist the reply -------------------------------------------
    const outboundMessage = await appendMessage({
      tenantId: tenant.id,
      conversationId: conversation.id,
      customerId: customer.id,
      direction: 'outbound',
      role: 'agent',
      content: turn.reply,
      contentType: 'text',
      channelMessageId: outboundExternalId,
      intent: turn.intent.intent,
      toolCalls: turn.toolInvocations.map((t) => ({ name: t.name, ok: t.result.ok, durationMs: t.durationMs })),
      tokensIn: turn.usage.inputTokens,
      tokensOut: turn.usage.outputTokens,
      latencyMs: turn.latencyMs,
      model: turn.model,
      metadata: { trace_id: traceId, delivery_status: deliveryStatus, guardrail: turn.guardrail },
    });

    await updateConversation(tenant.id, conversation.id, {
      lastIntent: turn.intent.intent,
      sentiment: turn.intent.sentiment,
    });

    await writeAgentLog({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id,
      messageId: outboundMessage?.id ?? null, traceId,
      step: 'pipeline.complete',
      durationMs: Date.now() - startedAt,
      model: turn.model,
      tokensIn: turn.usage.inputTokens,
      tokensOut: turn.usage.outputTokens,
      costUsd: turn.usage.costUsd,
      detail: {
        intent: turn.intent.intent,
        intentSource: turn.intent.source,
        sentiment: turn.intent.sentiment,
        tools: turn.toolInvocations.map((t) => t.name),
        handedOff: turn.handedOff,
        deliveryStatus,
        guardrail: turn.guardrail,
      },
    });

    // ---- 11. Fold memory (after the reply — never on the critical path) ---
    const refreshed = await getConversationById(tenant.id, conversation.id);
    if (refreshed) {
      void maybeUpdateSummary({ conversation: refreshed, traceId }).catch((err) =>
        log.warn({ err: toErrorInfo(err) }, 'background summary failed'),
      );
    }

    return done(
      deliveryStatus === 'failed' ? 'send_failed' : turn.handedOff ? 'escalated' : 'replied',
      {
        tenantId: tenant.id,
        customerId: customer.id,
        conversationId: conversation.id,
        intent: turn.intent.intent,
        reply: turn.reply,
        handedOff: turn.handedOff,
        deliveryStatus,
      },
    );
  } catch (err) {
    const info = toErrorInfo(err);
    log.error({ err: info, traceId }, 'pipeline failed');
    await writeAgentLog({
      tenantId: tenant?.id ?? null,
      conversationId: conversation?.id ?? null,
      customerId: customer?.id ?? null,
      traceId, step: 'pipeline.error', level: 'error', status: 'error',
      errorMessage: info.message, detail: { code: info.code },
    });
    return done('error', {
      tenantId: tenant?.id,
      customerId: customer?.id,
      conversationId: conversation?.id,
      error: info.message,
    });
  }
}
