import { createApp } from './api/app.js';
import { env } from './config/env.js';
import { logger } from './observability/logger.js';
import { closePool, healthCheck } from './db/pool.js';
import { toErrorInfo } from './utils/errors.js';

const log = logger();

async function main(): Promise<void> {
  const cfg = env();

  // Fail fast and loudly rather than accepting traffic we cannot serve.
  const db = await healthCheck();
  if (!db.ok) {
    log.fatal({ error: db.error }, 'cannot reach the database — refusing to start');
    process.exit(1);
  }
  log.info({ latencyMs: db.latencyMs }, 'database connection ok');

  const app = createApp();
  const server = app.listen(cfg.PORT, () => {
    log.info(
      {
        port: cfg.PORT,
        env: cfg.NODE_ENV,
        llm: `${cfg.LLM_PROVIDER}/${cfg.LLM_MODEL}`,
        mode: cfg.WEBHOOK_DELEGATE_TO_N8N ? 'n8n_orchestrated' : 'self_contained',
      },
      'ifaghd customer service agent listening',
    );
  });

  // Graceful shutdown: stop accepting connections, drain, then close the pool.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, 'shutting down');

    const force = setTimeout(() => {
      log.warn('forced exit after shutdown timeout');
      process.exit(1);
    }, 15_000);
    force.unref();

    server.close(async () => {
      try { await closePool(); } catch (err) { log.warn({ err: toErrorInfo(err) }, 'error closing pool'); }
      clearTimeout(force);
      log.info('shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // A crash in a detached background task must not kill in-flight conversations.
  process.on('unhandledRejection', (reason) => log.error({ err: toErrorInfo(reason) }, 'unhandled promise rejection'));
  process.on('uncaughtException', (err) => {
    log.fatal({ err: toErrorInfo(err) }, 'uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((err) => {
  log.fatal({ err: toErrorInfo(err) }, 'startup failed');
  process.exit(1);
});
