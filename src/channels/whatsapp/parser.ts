import type { NormalizedInboundMessage } from '../core/types.js';
import type { WhatsAppInboundMessage, WhatsAppWebhookBody } from './types.js';

/**
 * Flatten Meta's nested webhook envelope into normalized messages.
 *
 * Meta batches several messages per delivery and mixes in status callbacks
 * (delivered/read) that carry no user text — those are skipped here so the
 * pipeline never runs an agent turn for a read receipt.
 */
export function parseWhatsAppWebhook(body: unknown): NormalizedInboundMessage[] {
  const payload = body as WhatsAppWebhookBody | null;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.entry)) return [];

  const out: NormalizedInboundMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value || !Array.isArray(value.messages)) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const nameByWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nameByWaId.set(c.wa_id, c.profile.name);
      }

      for (const message of value.messages) {
        const normalized = normalizeMessage(message, phoneNumberId, nameByWaId);
        if (normalized) out.push(normalized);
      }
    }
  }

  return out;
}

function normalizeMessage(
  message: WhatsAppInboundMessage,
  phoneNumberId: string,
  names: Map<string, string>,
): NormalizedInboundMessage | null {
  if (!message.id || !message.from) return null;

  const { text, contentType } = extractContent(message);
  const timestamp = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date();

  return {
    channel: 'whatsapp',
    channelAccountExternalId: phoneNumberId,
    externalMessageId: message.id,
    customerPhone: normalizePhone(message.from),
    customerName: names.get(message.from) ?? null,
    text,
    contentType,
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
    raw: message,
  };
}

/**
 * Non-text messages still get a text representation so the agent can respond
 * sensibly ("I can't open voice notes — could you type it?") rather than
 * silently dropping the customer.
 */
function extractContent(message: WhatsAppInboundMessage): { text: string; contentType: NormalizedInboundMessage['contentType'] } {
  switch (message.type) {
    case 'text':
      return { text: (message.text?.body ?? '').trim(), contentType: 'text' };
    case 'button':
      return { text: (message.button?.text ?? message.button?.payload ?? '').trim(), contentType: 'interactive' };
    case 'interactive': {
      const title = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? '';
      return { text: title.trim(), contentType: 'interactive' };
    }
    case 'image':
      return { text: message.image?.caption?.trim() || '[أرسل العميل صورة]', contentType: 'image' };
    case 'video':
      return { text: message.video?.caption?.trim() || '[أرسل العميل فيديو]', contentType: 'video' };
    case 'audio':
      return { text: '[أرسل العميل رسالة صوتية]', contentType: 'audio' };
    case 'document':
      return { text: message.document?.caption?.trim() || `[أرسل العميل ملف: ${message.document?.filename ?? 'مستند'}]`, contentType: 'document' };
    case 'location':
      return { text: `[أرسل العميل موقعاً: ${message.location?.name ?? message.location?.address ?? 'إحداثيات'}]`, contentType: 'location' };
    default:
      return { text: '[نوع رسالة غير مدعوم]', contentType: 'unsupported' };
  }
}

/** Store E.164 digits without '+', matching what WhatsApp sends. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}
