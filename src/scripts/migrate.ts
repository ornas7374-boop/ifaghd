import { runMigrations } from '../db/migrate.js';
import { closePool } from '../db/pool.js';
import { logger } from '../observability/logger.js';

const log = logger();

try {
  const result = await runMigrations();
  log.info({ applied: result.applied, skipped: result.skipped.length }, 'migrations complete');
  if (result.applied.length === 0) log.info('database already up to date');
} catch (err) {
  log.error({ err }, 'migration failed');
  process.exitCode = 1;
} finally {
  await closePool();
}
