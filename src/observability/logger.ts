import pino from 'pino';
import { env } from '../config/env.js';

/** Keys whose values must never reach logs or third-party log sinks. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers["x-hub-signature-256"]',
  'req.headers["x-api-key"]',
  '*.access_token',
  '*.api_key',
  '*.apiKey',
  '*.password',
  'accessToken',
  'apiKey',
];

function createLogger() {
  const cfg = env();
  const pretty = cfg.NODE_ENV === 'development';
  return pino({
    level: cfg.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    base: { service: 'ifaghd-cs-agent', env: cfg.NODE_ENV },
    ...(pretty
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
      : {}),
  });
}

let instance: pino.Logger | null = null;

export function logger(): pino.Logger {
  if (!instance) instance = createLogger();
  return instance;
}

export type Logger = pino.Logger;
