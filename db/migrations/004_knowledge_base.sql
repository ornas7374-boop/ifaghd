-- =====================================================================
-- 004_knowledge_base.sql
-- Editable knowledge base. Content lives in rows, never in agent code —
-- staff add/edit entries and the agent picks them up on the next message.
--
-- Retrieval is lexical (tsvector + trigram) so it needs no embedding
-- provider. Postgres ships no Arabic stemmer, so we index with the
-- 'simple' configuration and lean on trigram similarity for recall.
-- =====================================================================

-- array_to_string() is only STABLE (it must handle any array element type),
-- so Postgres rejects it inside a generated column. For text[] the conversion
-- genuinely is immutable, so we wrap the whole vector build in one IMMUTABLE
-- function and use that instead.
CREATE OR REPLACE FUNCTION kb_search_vector(
  p_title    TEXT,
  p_question TEXT,
  p_keywords TEXT[],
  p_answer   TEXT
) RETURNS TSVECTOR AS $$
  SELECT setweight(to_tsvector('simple', coalesce(p_title, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(p_question, '')), 'A') ||
         setweight(to_tsvector('simple', coalesce(array_to_string(p_keywords, ' '), '')), 'B') ||
         setweight(to_tsvector('simple', coalesce(p_answer, '')), 'C');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category      TEXT NOT NULL
                  CHECK (category IN ('products', 'pricing', 'payment', 'shipping',
                                      'returns', 'exchange', 'faq', 'policy',
                                      'contact', 'general')),
  title         TEXT NOT NULL,
  question      TEXT,
  answer        TEXT NOT NULL,
  -- Extra phrasings customers actually use; boosts recall a lot in Arabic.
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  locale        TEXT NOT NULL DEFAULT 'ar-SA',
  priority      INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    kb_search_vector(title, question, keywords, answer)
  ) STORED
);
CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_tenant_active ON knowledge_base(tenant_id, is_active, category);
CREATE INDEX IF NOT EXISTS idx_kb_title_trgm ON knowledge_base USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_question_trgm ON knowledge_base USING gin (question gin_trgm_ops);

-- Full edit history, so a bad KB edit can be traced and rolled back.
CREATE TABLE IF NOT EXISTS knowledge_base_revisions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id         UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  snapshot      JSONB NOT NULL,
  changed_by    TEXT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kb_revisions_kb ON knowledge_base_revisions(kb_id, version DESC);
