import { env } from '../../config/env.js';
import { httpJson } from '../../utils/http.js';
import { logger } from '../../observability/logger.js';
import { withRetry } from '../../utils/retry.js';
import { toErrorInfo, AppError } from '../../utils/errors.js';
import { normalizePhone } from './parser.js';
import type { SendResult } from '../core/types.js';

interface SendResponse {
  messages?: Array<{ id?: string }>;
  error?: { message?: string; code?: number };
}

/**
 * WhatsApp Cloud API send. Splits over-long replies (the API caps a text body
 * at 4096 chars) and retries transient failures with backoff.
 */
export async function sendWhatsAppText(params: {
  to: string;
  body: string;
  phoneNumberId?: string;
  accessToken?: string;
  previewUrl?: boolean;
}): Promise<SendResult> {
  const cfg = env();
  const log = logger();

  const phoneNumberId = params.phoneNumberId ?? cfg.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = params.accessToken ?? cfg.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new AppError('WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN missing)', {
      code: 'whatsapp_not_configured',
      status: 503,
    });
  }

  const to = normalizePhone(params.to);
  const chunks = splitForWhatsApp(params.body);
  const url = `${cfg.WHATSAPP_API_BASE_URL}/${cfg.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

  let lastId: string | null = null;
  for (const chunk of chunks) {
    const res = await withRetry(
      () =>
        httpJson<SendResponse>(url, {
          method: 'POST',
          headers: { authorization: `Bearer ${accessToken}` },
          body: {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: params.previewUrl ?? false, body: chunk },
          },
          timeoutMs: cfg.WHATSAPP_TIMEOUT_MS,
          label: 'whatsapp send message',
        }),
      {
        attempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 4_000,
        isRetryable: (e) => toErrorInfo(e).retryable,
        onRetry: ({ attempt, error }) => log.warn({ attempt, err: toErrorInfo(error) }, 'whatsapp send retry'),
      },
    );
    lastId = res.messages?.[0]?.id ?? lastId;
  }

  return { externalMessageId: lastId, status: 'sent' };
}

/** Blue ticks. Best-effort — never let a failed receipt break a turn. */
export async function markWhatsAppRead(externalMessageId: string, phoneNumberId?: string): Promise<void> {
  const cfg = env();
  const id = phoneNumberId ?? cfg.WHATSAPP_PHONE_NUMBER_ID;
  const token = cfg.WHATSAPP_ACCESS_TOKEN;
  if (!id || !token) return;

  try {
    await httpJson(`${cfg.WHATSAPP_API_BASE_URL}/${cfg.WHATSAPP_API_VERSION}/${id}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: { messaging_product: 'whatsapp', status: 'read', message_id: externalMessageId },
      timeoutMs: 8_000,
      label: 'whatsapp mark read',
    });
  } catch (err) {
    logger().debug({ err: toErrorInfo(err) }, 'mark-read failed (non-fatal)');
  }
}

const WHATSAPP_TEXT_LIMIT = 4096;

/** Split on paragraph, then sentence, then hard cut — never mid-word if avoidable. */
export function splitForWhatsApp(text: string, limit = WHATSAPP_TEXT_LIMIT): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return [trimmed || '...'];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > limit) {
    const window = remaining.slice(0, limit);
    let cut = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'));
    if (cut < limit * 0.5) cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('؟ '), window.lastIndexOf('! '));
    if (cut < limit * 0.5) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
