import { env } from '../config/env.js';
import { httpJson } from '../utils/http.js';
import { logger } from '../observability/logger.js';
import { maskPhone } from '../security/outputFilter.js';
import { withRetry } from '../utils/retry.js';
import { toErrorInfo } from '../utils/errors.js';
import type { HumanHandoff, Tenant } from '../db/types.js';

export interface HandoffNotification {
  handoff: HumanHandoff;
  tenant: Tenant;
  customerName: string | null;
  customerPhone: string;
  conversationId: string;
}

export interface NotifyOutcome {
  status: 'sent' | 'failed' | 'skipped';
  channel: string;
  error?: string;
}

/**
 * Notify whoever is on duty. Pluggable per deployment; the pipeline treats a
 * failure here as non-fatal — the escalation row is already persisted and
 * shows up in v_pending_handoffs regardless.
 */
export async function notifyHandoff(input: HandoffNotification): Promise<NotifyOutcome> {
  const cfg = env();
  const log = logger();
  const channel = cfg.HANDOFF_NOTIFY_CHANNEL;

  if (channel === 'none') {
    return { status: 'skipped', channel, error: 'HANDOFF_NOTIFY_CHANNEL=none (staff poll the dashboard)' };
  }

  try {
    await withRetry(
      async () => {
        switch (channel) {
          case 'webhook':
            await httpJson(cfg.HANDOFF_WEBHOOK_URL!, {
              method: 'POST',
              body: buildJsonPayload(input),
              timeoutMs: 10_000,
              label: 'handoff webhook',
            });
            return;
          case 'slack':
            await httpJson(cfg.HANDOFF_SLACK_WEBHOOK_URL!, {
              method: 'POST',
              body: { text: buildText(input) },
              timeoutMs: 10_000,
              label: 'handoff slack webhook',
            });
            return;
          case 'whatsapp': {
            // Imported lazily so the notifier stays usable when WhatsApp is unconfigured.
            const { sendWhatsAppText } = await import('../channels/whatsapp/client.js');
            await sendWhatsAppText({ to: cfg.HANDOFF_WHATSAPP_TO!, body: buildText(input) });
            return;
          }
          default:
            return;
        }
      },
      {
        attempts: 3,
        baseDelayMs: 500,
        isRetryable: (e) => toErrorInfo(e).retryable,
        onRetry: ({ attempt, error }) => log.warn({ attempt, err: toErrorInfo(error) }, 'handoff notification retry'),
      },
    );
    return { status: 'sent', channel };
  } catch (err) {
    const info = toErrorInfo(err);
    log.error({ err: info, handoffId: input.handoff.id }, 'handoff notification failed');
    return { status: 'failed', channel, error: info.message };
  }
}

/** Full detail — this goes to the tenant's own system, so no masking. */
function buildJsonPayload(input: HandoffNotification): Record<string, unknown> {
  const { handoff } = input;
  return {
    event: 'human_handoff.created',
    handoff_id: handoff.id,
    tenant: { id: input.tenant.id, slug: input.tenant.slug, name: input.tenant.name },
    conversation_id: input.conversationId,
    priority: handoff.priority,
    reason_code: handoff.reason_code,
    reason_detail: handoff.reason_detail,
    customer: {
      id: handoff.customer_id,
      name: input.customerName,
      phone: input.customerPhone,
    },
    conversation_summary: handoff.conversation_summary,
    last_customer_message: handoff.last_customer_message,
    created_at: handoff.created_at,
  };
}

/** Chat-channel text — phone masked, since Slack history is widely readable. */
function buildText(input: HandoffNotification): string {
  const { handoff } = input;
  const flag = handoff.priority === 'urgent' ? '🔴' : handoff.priority === 'high' ? '🟠' : '🟡';
  return [
    `${flag} تصعيد جديد — ${input.tenant.name}`,
    `العميل: ${input.customerName ?? 'غير معروف'} (${maskPhone(input.customerPhone)})`,
    `السبب: ${REASON_LABELS[handoff.reason_code] ?? handoff.reason_code}`,
    handoff.reason_detail ? `التفاصيل: ${handoff.reason_detail}` : null,
    handoff.last_customer_message ? `آخر رسالة: ${truncate(handoff.last_customer_message, 200)}` : null,
    handoff.conversation_summary ? `الملخص: ${truncate(handoff.conversation_summary, 300)}` : null,
    `المحادثة: ${input.conversationId}`,
    `الوقت: ${new Date(handoff.created_at).toISOString()}`,
  ].filter(Boolean).join('\n');
}

const REASON_LABELS: Record<string, string> = {
  customer_request: 'العميل طلب موظف',
  angry_customer: 'العميل منزعج',
  sensitive_issue: 'موضوع حساس',
  low_confidence: 'الوكيل غير متأكد',
  tool_failure: 'فشل في جلب البيانات',
  missing_information: 'معلومات غير متوفرة',
  repeated_failure: 'تكرار عدم الحل',
  policy_violation: 'مخالفة سياسة',
  manual: 'تصعيد يدوي',
};

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
