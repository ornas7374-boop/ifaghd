import { env } from '../../config/env.js';
import { logger } from '../../observability/logger.js';
import { parseWhatsAppWebhook } from './parser.js';
import { verifyMetaSignature } from './signature.js';
import { markWhatsAppRead, sendWhatsAppText } from './client.js';
import { toErrorInfo } from '../../utils/errors.js';
import type { ChannelAdapter, NormalizedInboundMessage, OutboundMessage, SendResult } from '../core/types.js';

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';

  parseWebhook(body: unknown): NormalizedInboundMessage[] {
    return parseWhatsAppWebhook(body);
  }

  verifySignature(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): boolean {
    const cfg = env();
    if (!cfg.WHATSAPP_REQUIRE_SIGNATURE) {
      // Explicitly opted out (local dev / ngrok). The config schema forbids
      // this combination in production.
      logger().warn('whatsapp signature verification is disabled');
      return true;
    }
    const header = headers['x-hub-signature-256'];
    const value = Array.isArray(header) ? header[0] : header;
    return verifyMetaSignature(rawBody, value, cfg.WHATSAPP_APP_SECRET ?? '');
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    try {
      return await sendWhatsAppText({
        to: message.to,
        body: message.text,
        ...(message.channelAccountExternalId ? { phoneNumberId: message.channelAccountExternalId } : {}),
      });
    } catch (err) {
      const info = toErrorInfo(err);
      logger().error({ err: info }, 'whatsapp send failed');
      return { externalMessageId: null, status: 'failed', error: info.message };
    }
  }

  async markRead(externalMessageId: string, channelAccountExternalId?: string): Promise<void> {
    await markWhatsAppRead(externalMessageId, channelAccountExternalId);
  }
}

export const whatsappAdapter = new WhatsAppAdapter();
