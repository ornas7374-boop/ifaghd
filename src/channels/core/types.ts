/**
 * Channel abstraction. WhatsApp is the first implementation; Telegram/webchat
 * plug in by implementing this interface — the pipeline above never mentions
 * WhatsApp by name.
 */

export interface NormalizedInboundMessage {
  channel: string;
  /** Provider account identity, used to resolve the tenant. */
  channelAccountExternalId: string;
  /** Provider message id — the idempotency key. */
  externalMessageId: string;
  customerPhone: string;
  customerName: string | null;
  text: string;
  contentType: 'text' | 'image' | 'audio' | 'document' | 'video' | 'location' | 'interactive' | 'unsupported';
  timestamp: Date;
  raw: unknown;
}

export interface OutboundMessage {
  to: string;
  text: string;
  /** Provider account to send from; falls back to the configured default. */
  channelAccountExternalId?: string;
  replyToExternalId?: string;
}

export interface SendResult {
  externalMessageId: string | null;
  status: 'sent' | 'failed';
  error?: string;
}

export interface ChannelAdapter {
  readonly channel: string;
  /** Turn a provider webhook body into zero or more normalized messages. */
  parseWebhook(body: unknown): NormalizedInboundMessage[];
  /** Verify the request really came from the provider. */
  verifySignature(rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): boolean;
  send(message: OutboundMessage): Promise<SendResult>;
  markRead?(externalMessageId: string, channelAccountExternalId?: string): Promise<void>;
}
