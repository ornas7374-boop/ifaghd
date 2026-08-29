import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './pool.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Resolves from both src/ (tsx) and dist/ (compiled).
export const MIGRATIONS_DIR = path.resolve(HERE, '../../db/migrations');

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Forward-only migration runner. Each file runs once inside its own
 * transaction; the checksum guards against a migration being edited after
 * it has already been applied somewhere.
 */
export async function runMigrations(dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  const pool = db();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      checksum    TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const { rows } = await pool.query<{ name: string; checksum: string }>('SELECT name, checksum FROM schema_migrations');
  const already = new Map(rows.map((r) => [r.name, r.checksum]));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const sql = await readFile(path.join(dir, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prev = already.get(file);

    if (prev) {
      if (prev !== checksum) {
        throw new Error(
          `Migration ${file} was modified after being applied (checksum mismatch). ` +
            'Add a new migration instead of editing an applied one.',
        );
      }
      skipped.push(file);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
      await client.query('COMMIT');
      applied.push(file);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`, { cause: err });
    } finally {
      client.release();
    }
  }

  return { applied, skipped };
}
