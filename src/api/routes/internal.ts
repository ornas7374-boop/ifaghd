import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireInternalApiKey } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { processInboundMessage } from '../../agent/pipeline.js';
import { runAgentTurn } from '../../agent/agent.js';
import { classifyIntent } from '../../agent/intent.js';
import { loadMemory } from '../../agent/memory.js';
import { escalateToHuman } from '../../handoff/service.js';
import { getChannelAdapter } from '../../channels/registry.js';
import { whatsappAdapter } from '../../channels/whatsapp/adapter.js';
import { resolveChannelAccount, getTenantBySlug, getTenantById } from '../../db/repositories/tenants.js';
import { findOrCreateCustomer, getCustomerById } from '../../db/repositories/customers.js';
import {
  appendMessage, findOrCreateOpenConversation, getConversationById,
  getRecentMessages, returnToAgent, updateConversation,
} from '../../db/repositories/conversations.js';
import { listPendingHandoffs, resolveHandoff } from '../../db/repositories/handoffs.js';
import { searchKnowledgeBase, upsertKnowledgeEntry, deactivateKnowledgeEntry, listKnowledgeByCategory } from '../../db/repositories/knowledge.js';
import { getTrace } from '../../db/repositories/logs.js';
import type { HandoffReason, KbCategory } from '../../db/types.js';
import type { NormalizedInboundMessage } from '../../channels/core/types.js';

/**
 * Internal API — the seam that lets n8n orchestrate the agent step by step
 * instead of the service running the whole flow itself. Every step of the
 * pipeline is callable individually, plus /process for the one-call path.
 *
 * All routes require INTERNAL_API_KEY.
 */
export const internalRouter = Router();
internalRouter.use(requireInternalApiKey);

const body = <T extends z.ZodTypeAny>(schema: T, req: Request): z.infer<T> => {
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ValidationError('Invalid request body', {
      issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    });
  }
  return parsed.data;
};

// ---------------------------------------------------------------------------
// 1. Normalize a raw provider webhook body into channel-neutral messages.
// ---------------------------------------------------------------------------
const NormalizeSchema = z.object({
  channel: z.string().default('whatsapp'),
  payload: z.unknown(),
});

internalRouter.post('/messages/normalize', asyncHandler(async (req: Request, res: Response) => {
  const input = body(NormalizeSchema, req);
  const adapter = getChannelAdapter(input.channel);
  if (!adapter) throw new NotFoundError(`No adapter for channel "${input.channel}"`);

  const messages = adapter.parseWebhook(input.payload);
  res.json({
    trace_id: req.traceId,
    count: messages.length,
    messages: messages.map(serializeInbound),
  });
}));

// ---------------------------------------------------------------------------
// 2. Identify customer + conversation (n8n "Identify Customer" node).
// ---------------------------------------------------------------------------
const IdentifySchema = z.object({
  channel: z.string().default('whatsapp'),
  channel_account_external_id: z.string().min(1),
  phone: z.string().min(5),
  name: z.string().nullish(),
});

internalRouter.post('/customers/identify', asyncHandler(async (req: Request, res: Response) => {
  const input = body(IdentifySchema, req);
  const resolved = await resolveChannelAccount(input.channel, input.channel_account_external_id);
  if (!resolved) throw new NotFoundError('No tenant is mapped to that channel account');

  const { customer, created } = await findOrCreateCustomer({
    tenantId: resolved.tenant.id,
    phone: input.phone.replace(/\D/g, ''),
    name: input.name ?? null,
    locale: resolved.tenant.default_locale,
  });

  const { conversation } = await findOrCreateOpenConversation({
    tenantId: resolved.tenant.id,
    customerId: customer.id,
    channel: input.channel,
    channelAccountId: resolved.account.id,
  });

  res.json({
    trace_id: req.traceId,
    tenant: { id: resolved.tenant.id, slug: resolved.tenant.slug, name: resolved.tenant.name, status: resolved.tenant.status },
    customer: {
      id: customer.id, phone: customer.phone, name: customer.name,
      is_new: created, is_blocked: customer.is_blocked, locale: customer.locale,
    },
    conversation: {
      id: conversation.id, status: conversation.status, handled_by: conversation.handled_by,
      message_count: conversation.message_count, last_intent: conversation.last_intent,
    },
  });
}));

// ---------------------------------------------------------------------------
// 3. Conversation context / memory (n8n "Load Conversation" node).
// ---------------------------------------------------------------------------
internalRouter.get('/conversations/:conversationId/context', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireQuery(req, 'tenant_id');
  const conversation = await getConversationById(tenantId, req.params.conversationId!);
  if (!conversation) throw new NotFoundError('Conversation not found');

  const customer = await getCustomerById(tenantId, conversation.customer_id);
  if (!customer) throw new NotFoundError('Customer not found');

  const memory = await loadMemory({ conversation, customer });
  const recent = await getRecentMessages(conversation.id, 20);

  res.json({
    trace_id: req.traceId,
    conversation: {
      id: conversation.id, status: conversation.status, handled_by: conversation.handled_by,
      summary: conversation.summary, message_count: conversation.message_count,
      last_intent: conversation.last_intent, sentiment: conversation.sentiment,
    },
    customer: { id: customer.id, name: customer.name, phone: customer.phone, locale: customer.locale },
    customer_card: memory.customerCard,
    recent_messages: recent.map((m) => ({
      role: m.role, direction: m.direction, content: m.content,
      intent: m.intent, sent_at: m.sent_at,
    })),
  });
}));

// ---------------------------------------------------------------------------
// 4. Intent classification (n8n "Classify Intent" node).
// ---------------------------------------------------------------------------
const ClassifySchema = z.object({
  text: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
});

internalRouter.post('/intent/classify', asyncHandler(async (req: Request, res: Response) => {
  const input = body(ClassifySchema, req);
  const recent = input.conversation_id ? await getRecentMessages(input.conversation_id, 4) : [];
  const result = await classifyIntent({ text: input.text, recentMessages: recent });
  res.json({ trace_id: req.traceId, ...result });
}));

// ---------------------------------------------------------------------------
// 5. Agent turn without delivery (n8n "AI Agent" node).
//    n8n sends the reply itself, so this returns text rather than sending it.
// ---------------------------------------------------------------------------
const RespondSchema = z.object({
  tenant_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  message: z.string().min(1).max(4000),
  /** Store the inbound message first. Set false if n8n already stored it. */
  store_inbound: z.boolean().default(true),
  channel_message_id: z.string().nullish(),
});

internalRouter.post('/agent/respond', asyncHandler(async (req: Request, res: Response) => {
  const input = body(RespondSchema, req);

  const conversation = await getConversationById(input.tenant_id, input.conversation_id);
  if (!conversation) throw new NotFoundError('Conversation not found');
  const customer = await getCustomerById(input.tenant_id, conversation.customer_id);
  if (!customer) throw new NotFoundError('Customer not found');
  const resolved = await getTenantById(input.tenant_id);
  if (!resolved) throw new NotFoundError('Tenant not found');

  if (conversation.handled_by === 'human') {
    res.json({ trace_id: req.traceId, skipped: true, reason: 'human_handling' });
    return;
  }

  if (input.store_inbound) {
    await appendMessage({
      tenantId: input.tenant_id,
      conversationId: conversation.id,
      customerId: customer.id,
      direction: 'inbound',
      role: 'customer',
      content: input.message,
      channelMessageId: input.channel_message_id ?? null,
      metadata: { trace_id: req.traceId, source: 'n8n' },
    });
  }

  const fresh = (await getConversationById(input.tenant_id, conversation.id)) ?? conversation;
  const turn = await runAgentTurn({
    tenant: resolved, customer, conversation: fresh,
    messageText: input.message, traceId: req.traceId,
  });

  res.json({
    trace_id: req.traceId,
    skipped: false,
    reply: turn.reply,
    intent: turn.intent.intent,
    sentiment: turn.intent.sentiment,
    handed_off: turn.handedOff,
    handoff_reason: turn.handoffReason,
    tools_used: turn.toolInvocations.map((t) => ({ name: t.name, ok: t.result.ok, duration_ms: t.durationMs })),
    guardrail: turn.guardrail,
    usage: turn.usage,
    model: turn.model,
    latency_ms: turn.latencyMs,
  });
}));

// ---------------------------------------------------------------------------
// 6. Send an outbound message (n8n "Send WhatsApp Message" node).
// ---------------------------------------------------------------------------
const SendSchema = z.object({
  channel: z.string().default('whatsapp'),
  to: z.string().min(5),
  text: z.string().min(1).max(8000),
  channel_account_external_id: z.string().optional(),
});

internalRouter.post('/messages/send', asyncHandler(async (req: Request, res: Response) => {
  const input = body(SendSchema, req);
  const adapter = getChannelAdapter(input.channel);
  if (!adapter) throw new NotFoundError(`No adapter for channel "${input.channel}"`);

  const result = await adapter.send({
    to: input.to,
    text: input.text,
    ...(input.channel_account_external_id ? { channelAccountExternalId: input.channel_account_external_id } : {}),
  });
  res.status(result.status === 'sent' ? 200 : 502).json({
    trace_id: req.traceId,
    status: result.status,
    external_message_id: result.externalMessageId,
    error: result.error ?? null,
  });
}));

// ---------------------------------------------------------------------------
// 7. Persist a message (n8n "Save Conversation" node).
// ---------------------------------------------------------------------------
const StoreSchema = z.object({
  tenant_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  direction: z.enum(['inbound', 'outbound']),
  role: z.enum(['customer', 'agent', 'human', 'system']),
  content: z.string().min(1),
  channel_message_id: z.string().nullish(),
  intent: z.string().nullish(),
  metadata: z.record(z.unknown()).optional(),
});

internalRouter.post('/messages/store', asyncHandler(async (req: Request, res: Response) => {
  const input = body(StoreSchema, req);
  const stored = await appendMessage({
    tenantId: input.tenant_id,
    conversationId: input.conversation_id,
    customerId: input.customer_id,
    direction: input.direction,
    role: input.role,
    content: input.content,
    channelMessageId: input.channel_message_id ?? null,
    intent: input.intent ?? null,
    metadata: { ...(input.metadata ?? {}), trace_id: req.traceId },
  });
  res.json({ trace_id: req.traceId, stored: Boolean(stored), duplicate: !stored, message_id: stored?.id ?? null });
}));

// ---------------------------------------------------------------------------
// 8. Full pipeline in one call — the simple n8n path and the smoke-test path.
// ---------------------------------------------------------------------------
const ProcessSchema = z.object({
  channel: z.string().default('whatsapp'),
  channel_account_external_id: z.string().min(1),
  external_message_id: z.string().min(1),
  phone: z.string().min(5),
  name: z.string().nullish(),
  text: z.string().max(4000),
  content_type: z.enum(['text', 'image', 'audio', 'document', 'video', 'location', 'interactive', 'unsupported']).default('text'),
  timestamp: z.string().datetime().optional(),
  /** true when n8n will deliver the reply itself. */
  skip_send: z.boolean().default(false),
});

internalRouter.post('/process', asyncHandler(async (req: Request, res: Response) => {
  const input = body(ProcessSchema, req);
  const inbound: NormalizedInboundMessage = {
    channel: input.channel,
    channelAccountExternalId: input.channel_account_external_id,
    externalMessageId: input.external_message_id,
    customerPhone: input.phone.replace(/\D/g, ''),
    customerName: input.name ?? null,
    text: input.text,
    contentType: input.content_type,
    timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
    raw: { source: 'internal_api' },
  };

  const result = await processInboundMessage(inbound, { skipSend: input.skip_send, traceId: req.traceId });

  // The rest of this API is snake_case; keep /process consistent so n8n
  // expressions do not have to special-case one endpoint.
  res.status(result.outcome === 'error' ? 500 : 200).json({
    trace_id: result.traceId,
    outcome: result.outcome,
    tenant_id: result.tenantId ?? null,
    customer_id: result.customerId ?? null,
    conversation_id: result.conversationId ?? null,
    intent: result.intent ?? null,
    reply: result.reply ?? null,
    handed_off: result.handedOff ?? false,
    delivery_status: result.deliveryStatus ?? null,
    latency_ms: result.latencyMs,
    error: result.error ?? null,
  });
}));

// ---------------------------------------------------------------------------
// 9. Human handoff (n8n "Human Handoff" branch) + staff console.
// ---------------------------------------------------------------------------
const HandoffSchema = z.object({
  tenant_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  reason_code: z.enum([
    'customer_request', 'angry_customer', 'sensitive_issue', 'low_confidence',
    'tool_failure', 'missing_information', 'repeated_failure', 'policy_violation', 'manual',
  ]),
  reason_detail: z.string().max(500).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  last_customer_message: z.string().max(4000).nullish(),
});

internalRouter.post('/handoffs', asyncHandler(async (req: Request, res: Response) => {
  const input = body(HandoffSchema, req);
  const result = await escalateToHuman({
    tenantId: input.tenant_id,
    conversationId: input.conversation_id,
    customerId: input.customer_id,
    reasonCode: input.reason_code as HandoffReason,
    reasonDetail: input.reason_detail,
    priority: input.priority,
    lastCustomerMessage: input.last_customer_message ?? null,
    traceId: req.traceId,
  });
  res.json({
    trace_id: req.traceId,
    handoff_id: result.handoff.id,
    priority: result.handoff.priority,
    already_pending: result.alreadyPending,
    notification: result.notification,
    customer_message: result.customerMessage,
  });
}));

internalRouter.get('/handoffs/pending', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireQuery(req, 'tenant_id');
  const rows = await listPendingHandoffs(tenantId, Number(req.query.limit ?? 50));
  res.json({ trace_id: req.traceId, count: rows.length, handoffs: rows });
}));

const ResolveSchema = z.object({
  tenant_id: z.string().uuid(),
  note: z.string().max(1000).optional(),
  resolved_by: z.string().max(120).optional(),
  /** Give the conversation back to the bot after the human is done. */
  return_to_agent: z.boolean().default(false),
});

internalRouter.post('/handoffs/:handoffId/resolve', asyncHandler(async (req: Request, res: Response) => {
  const input = body(ResolveSchema, req);
  const handoff = await resolveHandoff(input.tenant_id, req.params.handoffId!, input.note, input.resolved_by);
  if (!handoff) throw new NotFoundError('Handoff not found');

  if (input.return_to_agent) await returnToAgent(input.tenant_id, handoff.conversation_id);
  else await updateConversation(input.tenant_id, handoff.conversation_id, { status: 'resolved' });

  res.json({ trace_id: req.traceId, handoff_id: handoff.id, status: handoff.status, returned_to_agent: input.return_to_agent });
}));

// ---------------------------------------------------------------------------
// 10. Knowledge base management — staff edit content without a deploy.
// ---------------------------------------------------------------------------
const KB_CATEGORIES = [
  'products', 'pricing', 'payment', 'shipping', 'returns',
  'exchange', 'faq', 'policy', 'contact', 'general',
] as const;

internalRouter.get('/knowledge', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireQuery(req, 'tenant_id');
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? (req.query.category as KbCategory) : undefined;

  const rows = q
    ? await searchKnowledgeBase({ tenantId, q, category: category ?? null, limit: Number(req.query.limit ?? 10) })
    : await listKnowledgeByCategory(tenantId, category ?? 'faq', Number(req.query.limit ?? 50));

  res.json({ trace_id: req.traceId, count: rows.length, entries: rows });
}));

const KbUpsertSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid().optional(),
  category: z.enum(KB_CATEGORIES),
  title: z.string().min(2).max(200),
  question: z.string().max(500).nullish(),
  answer: z.string().min(2).max(4000),
  keywords: z.array(z.string().max(60)).max(30).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  created_by: z.string().max(120).optional(),
});

internalRouter.post('/knowledge', asyncHandler(async (req: Request, res: Response) => {
  const input = body(KbUpsertSchema, req);
  const entry = await upsertKnowledgeEntry({
    tenantId: input.tenant_id,
    id: input.id,
    category: input.category,
    title: input.title,
    question: input.question ?? null,
    answer: input.answer,
    keywords: input.keywords ?? [],
    priority: input.priority,
    createdBy: input.created_by,
  });
  res.status(input.id ? 200 : 201).json({ trace_id: req.traceId, entry });
}));

internalRouter.delete('/knowledge/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = requireQuery(req, 'tenant_id');
  const ok = await deactivateKnowledgeEntry(tenantId, req.params.id!);
  if (!ok) throw new NotFoundError('Knowledge base entry not found');
  res.json({ trace_id: req.traceId, deactivated: true });
}));

// ---------------------------------------------------------------------------
// 11. Observability — replay exactly what the agent did for one message.
// ---------------------------------------------------------------------------
internalRouter.get('/traces/:traceId', asyncHandler(async (req: Request, res: Response) => {
  const rows = await getTrace(req.params.traceId!);
  if (rows.length === 0) throw new NotFoundError('No log entries for that trace id');
  res.json({ trace_id: req.params.traceId, steps: rows });
}));

internalRouter.get('/tenants/:slug', asyncHandler(async (req: Request, res: Response) => {
  const tenant = await getTenantBySlug(req.params.slug!);
  if (!tenant) throw new NotFoundError('Tenant not found');
  res.json({ trace_id: req.traceId, tenant });
}));

// ---------------------------------------------------------------------------
// Utility: verify a raw WhatsApp signature from n8n before trusting a payload.
// ---------------------------------------------------------------------------
const VerifySchema = z.object({
  raw_body: z.string(),
  signature: z.string(),
});

internalRouter.post('/whatsapp/verify-signature', asyncHandler(async (req: Request, res: Response) => {
  const input = body(VerifySchema, req);
  const valid = whatsappAdapter.verifySignature(input.raw_body, { 'x-hub-signature-256': input.signature });
  res.status(valid ? 200 : 401).json({ trace_id: req.traceId, valid });
}));

// ---------------------------------------------------------------------------

function requireQuery(req: Request, name: string): string {
  const value = req.query[name];
  if (typeof value !== 'string' || !value) throw new ValidationError(`Missing required query parameter "${name}"`);
  return value;
}

function serializeInbound(m: NormalizedInboundMessage) {
  return {
    channel: m.channel,
    channel_account_external_id: m.channelAccountExternalId,
    external_message_id: m.externalMessageId,
    phone: m.customerPhone,
    name: m.customerName,
    text: m.text,
    content_type: m.contentType,
    timestamp: m.timestamp.toISOString(),
  };
}
