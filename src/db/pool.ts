import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../observability/logger.js';

const { Pool, types } = pg;

// NUMERIC arrives as a string by default (to protect precision). Money in this
// system fits comfortably in a double, and the agent formats it as text, so we
// parse it to number for ergonomics.
types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// INT8 -> number (ticket counters only; well under 2^53).
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

let pool: pg.Pool | null = null;

export function db(): pg.Pool {
  if (pool) return pool;
  const cfg = env();
  pool = new Pool({
    connectionString: cfg.DATABASE_URL,
    max: cfg.DB_POOL_MAX,
    ssl: cfg.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    statement_timeout: cfg.DB_STATEMENT_TIMEOUT_MS,
    query_timeout: cfg.DB_STATEMENT_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    application_name: 'ifaghd-cs-agent',
  });
  // An idle-client error must not take the process down.
  pool.on('error', (err) => logger().error({ err }, 'idle postgres client error'));
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return db().query<T>(text, params as never[]);
}

/** Run `fn` inside a transaction; rolls back on any throw. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* connection already broken */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, error: (err as Error).message };
  }
}

export async function closePool(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}
