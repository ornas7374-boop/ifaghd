import express, { type Express } from 'express';
import { env } from '../config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { whatsappWebhookRouter } from './routes/whatsappWebhook.js';
import { internalRouter } from './routes/internal.js';

export function createApp(): Express {
  const cfg = env();
  const app = express();

  app.disable('x-powered-by');
  if (cfg.TRUST_PROXY) app.set('trust proxy', true);

  // Minimal hardening — this API serves JSON to machines, not browsers.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(requestContext);
  app.use(healthRouter);

  // Mounted BEFORE the JSON parser: the webhook needs the raw bytes intact to
  // verify Meta's HMAC signature.
  app.use(whatsappWebhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use('/internal/v1', internalRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
