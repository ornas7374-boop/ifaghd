import { query } from '../pool.js';

export interface RateLimitVerdict {
  allowed: boolean;
  count: number;
  limit: number;
  windowSeconds: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter in Postgres. Chosen over Redis deliberately: one fewer
 * moving part to operate, and the write volume here is tiny (one row per
 * customer per window).
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitVerdict> {
  const { rows } = await query<{ count: number; window_start: Date }>(
    `INSERT INTO rate_limit_counters (bucket_key, window_start, count)
     VALUES ($1, date_bin(($2 || ' seconds')::interval, now(), TIMESTAMPTZ 'epoch'), 1)
     ON CONFLICT (bucket_key) DO UPDATE
       SET count = CASE
             WHEN rate_limit_counters.window_start < date_bin(($2 || ' seconds')::interval, now(), TIMESTAMPTZ 'epoch')
               THEN 1
             ELSE rate_limit_counters.count + 1
           END,
           window_start = GREATEST(
             rate_limit_counters.window_start,
             date_bin(($2 || ' seconds')::interval, now(), TIMESTAMPTZ 'epoch')
           )
     RETURNING count, window_start`,
    [key, String(windowSeconds)],
  );

  const row = rows[0]!;
  const elapsed = (Date.now() - new Date(row.window_start).getTime()) / 1000;
  return {
    allowed: row.count <= limit,
    count: row.count,
    limit,
    windowSeconds,
    retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
  };
}

export async function purgeOldRateLimitRows(olderThanHours = 6): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM rate_limit_counters WHERE window_start < now() - ($1 || ' hours')::interval`,
    [String(olderThanHours)],
  );
  return rowCount ?? 0;
}
