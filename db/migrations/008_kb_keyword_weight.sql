-- =====================================================================
-- 008_kb_keyword_weight.sql
-- Promote `keywords` from weight B to weight A.
--
-- Keywords are the phrasings staff have deliberately recorded because that is
-- how customers actually ask ("متى يوصل", "وش طرق الدفع"). Ranking them below
-- an incidental word match in another entry's question was demoting the right
-- answer — observed on "متى يوصل طلبي", which ranked the order-cancellation
-- entry above the delivery-time entry.
-- =====================================================================

ALTER TABLE knowledge_base DROP COLUMN IF EXISTS search_vector;

CREATE OR REPLACE FUNCTION kb_search_vector(
  p_title    TEXT,
  p_question TEXT,
  p_keywords TEXT[],
  p_answer   TEXT
) RETURNS TSVECTOR AS $$
  SELECT setweight(to_tsvector('simple', ar_normalize(coalesce(p_title, ''))), 'A') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(p_question, ''))), 'A') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(array_to_string(p_keywords, ' '), ''))), 'A') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(p_answer, ''))), 'C');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

ALTER TABLE knowledge_base
  ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (kb_search_vector(title, question, keywords, answer)) STORED;

CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base USING gin (search_vector);
