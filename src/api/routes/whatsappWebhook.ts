import { Router, raw, type Request, type Response } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../observability/logger.js';
import { verifyToken } from '../../channels/whatsapp/signature.js';
import { whatsappAdapter } from '../../channels/whatsapp/adapter.js';
import { processInboundMessage } from '../../agent/pipeline.js';
import { recordWebhookEvent, updateWebhookEvent, writeAgentLog } from '../../db/repositories/logs.js';
import { httpJson } from '../../utils/http.js';
import { toErrorInfo } from '../../utils/errors.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const whatsappWebhookRouter = Router();

/**
 * GET — Meta's one-time subscription handshake. Echo hub.challenge when the
 * verify token matches.
 */
whatsappWebhookRouter.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const cfg = env();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && typeof token === 'string' && verifyToken(token, cfg.WHATSAPP_VERIFY_TOKEN)) {
    logger().info('whatsapp webhook verified');
    res.status(200).type('text/plain').send(String(challenge ?? ''));
    return;
  }
  logger().warn({ mode }, 'whatsapp webhook verification rejected');
  res.sendStatus(403);
});

/**
 * POST — inbound messages.
 *
 * express.raw() is required: the HMAC is computed over the exact bytes Meta
 * sent, and re-serialising parsed JSON would change them.
 *
 * We ACK with 200 immediately and process in the background. Meta retries any
 * delivery it does not see acknowledged within seconds, and an agent turn can
 * take longer than that — the webhook_events table is what makes those
 * retries safe.
 */
whatsappWebhookRouter.post(
  '/webhook/whatsapp',
  raw({ type: '*/*', limit: '1mb' }),
  asyncHandler(async (req: Request, res: Response) => {
    const cfg = env();
    const log = logger();
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''));

    if (!whatsappAdapter.verifySignature(rawBody, req.headers)) {
      log.warn({ traceId: req.traceId }, 'whatsapp webhook signature verification failed');
      res.sendStatus(401);
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8') || '{}');
    } catch {
      // Malformed body: 200 stops Meta retrying something that will never parse.
      log.warn({ traceId: req.traceId }, 'whatsapp webhook body was not valid JSON');
      res.sendStatus(200);
      return;
    }

    const messages = whatsappAdapter.parseWebhook(payload);

    // ACK before doing any work.
    res.status(200).json({ received: true, messages: messages.length });

    if (messages.length === 0) return;

    setImmediate(() => {
      void (async () => {
        for (const message of messages) {
          try {
            const event = await recordWebhookEvent({
              channel: 'whatsapp',
              externalEventId: message.externalMessageId,
              payload: message.raw,
            });
            if (event.duplicate) {
              log.info({ externalMessageId: message.externalMessageId }, 'duplicate webhook delivery skipped');
              continue;
            }

            await updateWebhookEvent(event.id, 'processing');

            if (cfg.WEBHOOK_DELEGATE_TO_N8N && cfg.N8N_INBOUND_WEBHOOK_URL) {
              // n8n owns the flow; we only normalize, dedupe and forward.
              await httpJson(cfg.N8N_INBOUND_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'x-trace-id': req.traceId },
                body: { message, trace_id: req.traceId },
                timeoutMs: 10_000,
                label: 'n8n inbound forward',
              });
              await updateWebhookEvent(event.id, 'processed');
              continue;
            }

            const result = await processInboundMessage(message, { traceId: req.traceId });
            await updateWebhookEvent(
              event.id,
              result.outcome === 'error' ? 'failed' : 'processed',
              result.error,
            );
          } catch (err) {
            const info = toErrorInfo(err);
            log.error({ err: info, externalMessageId: message.externalMessageId }, 'inbound processing failed');
            await writeAgentLog({
              traceId: req.traceId, step: 'webhook.process', level: 'error', status: 'error',
              errorMessage: info.message, detail: { externalMessageId: message.externalMessageId },
            });
          }
        }
      })();
    });
  }),
);
