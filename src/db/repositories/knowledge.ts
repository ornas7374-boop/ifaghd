import { query } from '../pool.js';
import type { KbCategory, KnowledgeBaseEntry } from '../types.js';

export interface KbHit extends KnowledgeBaseEntry {
  score: number;
}

/**
 * Hybrid lexical retrieval: websearch_to_tsquery for term overlap plus
 * trigram similarity for typo/morphology tolerance. Postgres has no Arabic
 * stemmer, so trigram is what carries recall for "وين طلبي" style queries.
 */
export async function searchKnowledgeBase(params: {
  tenantId: string;
  q: string;
  category?: KbCategory | null;
  limit?: number;
  minScore?: number;
}): Promise<KbHit[]> {
  const q = params.q.trim();
  if (!q) return [];
  const limit = Math.min(params.limit ?? 4, 10);
  // Calibrated against the seeded corpus: below this, hits are coincidental
  // token overlap rather than a real answer. Returning those would hand the
  // model irrelevant policy text to answer from.
  const minScore = params.minScore ?? 0.35;

  const { rows } = await query<KbHit>(
    `WITH q AS (
       SELECT ar_search_query($2) AS tsq, ar_normalize($2) AS norm
     ),
     scored AS (
       SELECT kb.*,
              -- Gate on the real match operator: ts_rank() returns a tiny
              -- non-zero value even when nothing matched.
              CASE WHEN q.tsq IS NOT NULL AND kb.search_vector @@ q.tsq
                   THEN ts_rank(kb.search_vector, q.tsq)
                   ELSE 0 END AS lexical,
              GREATEST(
                similarity(ar_normalize(kb.title), q.norm),
                COALESCE(similarity(ar_normalize(kb.question), q.norm), 0),
                COALESCE((SELECT max(similarity(ar_normalize(k), q.norm)) FROM unnest(kb.keywords) AS k), 0)
              ) AS fuzzy
         FROM knowledge_base kb, q
        WHERE kb.tenant_id = $1
          AND kb.is_active = TRUE
          AND ($3::text IS NULL OR kb.category = $3)
     )
     SELECT *, (lexical * 12.0 + fuzzy) AS score
       FROM scored
      WHERE lexical > 0 OR fuzzy >= 0.30
      -- priority is a tiebreak between comparable hits, never a score floor.
      ORDER BY (lexical * 12.0 + fuzzy) + priority * 0.001 DESC
      LIMIT $4`,
    [params.tenantId, q, params.category ?? null, limit],
  );
  return rows.filter((r) => Number(r.score) >= minScore);
}

export async function listKnowledgeByCategory(tenantId: string, category: KbCategory, limit = 20): Promise<KnowledgeBaseEntry[]> {
  const { rows } = await query<KnowledgeBaseEntry>(
    `SELECT * FROM knowledge_base
      WHERE tenant_id = $1 AND category = $2 AND is_active = TRUE
      ORDER BY priority DESC, title LIMIT $3`,
    [tenantId, category, limit],
  );
  return rows;
}

export async function upsertKnowledgeEntry(input: {
  tenantId: string;
  category: KbCategory;
  title: string;
  question?: string | null;
  answer: string;
  keywords?: string[];
  priority?: number;
  locale?: string;
  createdBy?: string;
  id?: string;
}): Promise<KnowledgeBaseEntry> {
  if (input.id) {
    const { rows } = await query<KnowledgeBaseEntry>(
      `UPDATE knowledge_base
          SET category = $3, title = $4, question = $5, answer = $6,
              keywords = $7, priority = COALESCE($8, priority),
              locale = COALESCE($9, locale), created_by = COALESCE($10, created_by)
        WHERE id = $1 AND tenant_id = $2
        RETURNING *`,
      [
        input.id, input.tenantId, input.category, input.title, input.question ?? null,
        input.answer, input.keywords ?? [], input.priority ?? null, input.locale ?? null, input.createdBy ?? null,
      ],
    );
    if (!rows[0]) throw new Error(`knowledge_base entry ${input.id} not found for tenant`);
    return rows[0];
  }

  const { rows } = await query<KnowledgeBaseEntry>(
    `INSERT INTO knowledge_base (tenant_id, category, title, question, answer, keywords, priority, locale, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),COALESCE($8,'ar-SA'),$9)
     RETURNING *`,
    [
      input.tenantId, input.category, input.title, input.question ?? null, input.answer,
      input.keywords ?? [], input.priority ?? null, input.locale ?? null, input.createdBy ?? null,
    ],
  );
  return rows[0]!;
}

export async function deactivateKnowledgeEntry(tenantId: string, id: string): Promise<boolean> {
  const { rowCount } = await query(
    'UPDATE knowledge_base SET is_active = FALSE WHERE id = $1 AND tenant_id = $2',
    [id, tenantId],
  );
  return (rowCount ?? 0) > 0;
}
