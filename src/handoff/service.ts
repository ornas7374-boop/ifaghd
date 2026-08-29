import { createHandoff, findActiveHandoff, markHandoffNotified } from '../db/repositories/handoffs.js';
import { getConversationById, markHandedOff } from '../db/repositories/conversations.js';
import { getCustomerById } from '../db/repositories/customers.js';
import { writeAgentLog } from '../db/repositories/logs.js';
import { getTenantById } from '../db/repositories/tenants.js';
import { logger } from '../observability/logger.js';
import { toErrorInfo } from '../utils/errors.js';
import { notifyHandoff } from './notifier.js';
import type { HandoffReason, HumanHandoff, Priority } from '../db/types.js';

export interface EscalateInput {
  tenantId: string;
  conversationId: string;
  customerId: string;
  reasonCode: HandoffReason;
  reasonDetail?: string;
  priority?: Priority;
  lastCustomerMessage?: string | null;
  conversationSummary?: string | null;
  traceId: string;
}

export interface EscalateResult {
  handoff: HumanHandoff;
  alreadyPending: boolean;
  notification: { status: string; channel: string; error?: string };
  /** Arabic line to send the customer. Never claims the issue is solved. */
  customerMessage: string;
}

/**
 * The single escalation path. Everything that decides "a human should take
 * this" ends up here, so the record, the conversation state change, the
 * notification and the audit log always happen together.
 */
export async function escalateToHuman(input: EscalateInput): Promise<EscalateResult> {
  const log = logger();

  const existing = await findActiveHandoff(input.conversationId);
  if (existing) {
    await markHandedOff(input.tenantId, input.conversationId);
    await writeAgentLog({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      customerId: input.customerId,
      traceId: input.traceId,
      step: 'handoff.deduplicated',
      detail: { handoffId: existing.id, reasonCode: input.reasonCode },
    });
    return {
      handoff: existing,
      alreadyPending: true,
      notification: { status: 'skipped', channel: 'none', error: 'already pending' },
      customerMessage: 'طلبك محوّل لأحد الزملاء وبيتواصل معك قريب، عذراً على التأخير.',
    };
  }

  const [conversation, customer, tenant] = await Promise.all([
    getConversationById(input.tenantId, input.conversationId),
    getCustomerById(input.tenantId, input.customerId),
    getTenantById(input.tenantId),
  ]);

  const handoff = await createHandoff({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    customerId: input.customerId,
    reasonCode: input.reasonCode,
    reasonDetail: input.reasonDetail,
    priority: input.priority ?? defaultPriority(input.reasonCode),
    conversationSummary: input.conversationSummary ?? conversation?.summary ?? null,
    lastCustomerMessage: input.lastCustomerMessage ?? null,
    customerSnapshot: {
      id: customer?.id,
      name: customer?.name,
      phone: customer?.phone,
      locale: customer?.locale,
      first_seen_at: customer?.first_seen_at,
      tags: customer?.tags ?? [],
      conversation_message_count: conversation?.message_count ?? 0,
      last_intent: conversation?.last_intent ?? null,
    },
  });

  // Stop the bot replying on this conversation from here on.
  await markHandedOff(input.tenantId, input.conversationId);

  let notification = { status: 'skipped', channel: 'none' } as { status: string; channel: string; error?: string };
  if (tenant && customer) {
    const outcome = await notifyHandoff({
      handoff,
      tenant,
      customerName: customer.name,
      customerPhone: customer.phone,
      conversationId: input.conversationId,
    });
    notification = outcome;
    await markHandoffNotified(handoff.id, outcome.status, outcome.error);
  }

  await writeAgentLog({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    customerId: input.customerId,
    traceId: input.traceId,
    step: 'handoff.created',
    level: notification.status === 'failed' ? 'warn' : 'info',
    detail: {
      handoffId: handoff.id,
      reasonCode: input.reasonCode,
      priority: handoff.priority,
      notification,
    },
  });

  log.info({ handoffId: handoff.id, reason: input.reasonCode, notification: notification.status }, 'conversation escalated to human');

  return {
    handoff,
    alreadyPending: false,
    notification,
    customerMessage: customerMessageFor(input.reasonCode),
  };
}

function defaultPriority(reason: HandoffReason): Priority {
  switch (reason) {
    case 'angry_customer':
    case 'sensitive_issue':
    case 'policy_violation':
      return 'urgent';
    case 'customer_request':
    case 'repeated_failure':
      return 'high';
    default:
      return 'normal';
  }
}

/**
 * Wording matters: none of these claim the problem is fixed, and none invent a
 * response time we cannot honour.
 */
function customerMessageFor(reason: HandoffReason): string {
  switch (reason) {
    case 'customer_request':
      return 'أبشر، حوّلت محادثتك لأحد الزملاء وبيتواصل معك بأقرب وقت 👍';
    case 'angry_customer':
      return 'أعتذر لك عن الإزعاج، حوّلت الموضوع لأحد الزملاء يتابعه معك شخصياً.';
    case 'tool_failure':
      return 'واجهتني مشكلة تقنية وأنا أجيب لك المعلومة. حوّلت طلبك لأحد الزملاء عشان يفيدك بشكل مؤكد.';
    case 'missing_information':
    case 'low_confidence':
      return 'ما حاب أعطيك معلومة غير مؤكدة، فحوّلت سؤالك لأحد الزملاء وبيرد عليك قريب.';
    case 'sensitive_issue':
      return 'موضوعك يحتاج متابعة خاصة، حوّلته لأحد الزملاء المختصين وبيتواصل معك.';
    default:
      return 'حوّلت محادثتك لأحد الزملاء وبيتواصل معك قريب.';
  }
}

export { toErrorInfo };
