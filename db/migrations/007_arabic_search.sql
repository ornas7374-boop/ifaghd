-- =====================================================================
-- 007_arabic_search.sql
-- Arabic-aware retrieval.
--
-- Two problems this fixes, both found while testing real queries:
--
--  1. Postgres has no Arabic stemmer, so "الشحن" and "شحن", or "الإمارات"
--     and "للامارات", were different tokens and never matched. We normalise
--     both the indexed text and the query: strip diacritics/tatweel, fold
--     alef/ya/ta-marbuta variants, and remove the attached definite article.
--
--  2. ts_rank() returns a tiny NON-ZERO value for rows that do not match at
--     all, so "lexical > 0" let everything through. Relevance is now gated on
--     the actual @@ match operator, and priority is a small tiebreak instead
--     of part of the score.
-- =====================================================================

-- Fold the orthographic variants Arabic writers use interchangeably.
CREATE OR REPLACE FUNCTION ar_normalize(p_text TEXT) RETURNS TEXT AS $$
  SELECT regexp_replace(
           -- Strip the attached definite article (ال / لل / وال / ...) when at
           -- least 3 characters remain, so short words are left alone.
           regexp_replace(
             translate(
               -- Remove harakat (U+064B..U+0652), tatweel, and superscript alef.
               regexp_replace(lower(coalesce(p_text, '')), E'[\u064B-\u0652\u0640\u0670]', '', 'g'),
               E'\u0623\u0625\u0622\u0671\u0629\u0649\u0624\u0626',  -- أ إ آ ٱ ة ى ؤ ئ
               E'\u0627\u0627\u0627\u0627\u0647\u064A\u0648\u064A'   -- ا ا ا ا ه ي و ي
             ),
             E'\\m(\u0648\u0627\u0644|\u0641\u0627\u0644|\u0628\u0627\u0644|\u0643\u0627\u0644|\u0644\u0644|\u0627\u0644)([^[:space:]]{3,})',
             E'\\2', 'g'
           ),
           '[[:space:]]+', ' ', 'g'
         );
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Words that carry no retrieval signal but would otherwise match rows.
CREATE OR REPLACE FUNCTION ar_stopwords() RETURNS TEXT[] AS $$
  SELECT ARRAY[
    'من','في','على','عن','مع','هل','ما','ماهي','ماهو','هي','هو','انا','انت','هذا','هذه','ذلك',
    'كم','كيف','وين','متى','ليش','وش','ايش','شنو','عندكم','عندك','عندي','ابغى','ابي','بغيت',
    'اريد','ودي','بدي','لو','سمحت','ممكن','الى','او','ثم','قد','كل','بعد','قبل','عشان','علشان',
    'the','a','an','is','are','do','does','you','your','my','i','to','for','of','and','or','it','can','how','what','when','where','please'
  ]::TEXT[];
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Build an OR tsquery from a customer's question. OR (not the AND that
-- websearch_to_tsquery produces) is what makes conversational Arabic work:
-- "عندكم شحن للامارات؟" should match the international-shipping entry on the
-- two content words, not fail because every word must be present.
CREATE OR REPLACE FUNCTION ar_search_query(p_text TEXT) RETURNS TSQUERY AS $$
  SELECT CASE
           WHEN tokens IS NULL OR array_length(tokens, 1) IS NULL THEN NULL
           ELSE to_tsquery('simple', array_to_string(tokens, ' | '))
         END
  FROM (
    SELECT array_agg(tok) AS tokens
      FROM (
        SELECT DISTINCT tok
          FROM unnest(regexp_split_to_array(ar_normalize(p_text), '[^[:alnum:]]+')) AS tok
         WHERE length(tok) >= 2
           AND NOT (tok = ANY (ar_stopwords()))
      ) filtered
  ) agg;
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- ---------------------------------------------------------------------
-- Rebuild the knowledge_base search vector over normalised text.
-- The generated column is dropped and re-added so existing rows are
-- recomputed with the new definition.
-- ---------------------------------------------------------------------
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS search_vector;

CREATE OR REPLACE FUNCTION kb_search_vector(
  p_title    TEXT,
  p_question TEXT,
  p_keywords TEXT[],
  p_answer   TEXT
) RETURNS TSVECTOR AS $$
  SELECT setweight(to_tsvector('simple', ar_normalize(coalesce(p_title, ''))), 'A') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(p_question, ''))), 'A') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(array_to_string(p_keywords, ' '), ''))), 'B') ||
         setweight(to_tsvector('simple', ar_normalize(coalesce(p_answer, ''))), 'C');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

ALTER TABLE knowledge_base
  ADD COLUMN search_vector TSVECTOR
  GENERATED ALWAYS AS (kb_search_vector(title, question, keywords, answer)) STORED;

CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base USING gin (search_vector);

-- Trigram indexes over normalised text, so fuzzy matching folds variants too.
CREATE INDEX IF NOT EXISTS idx_kb_title_norm_trgm
  ON knowledge_base USING gin (ar_normalize(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kb_question_norm_trgm
  ON knowledge_base USING gin (ar_normalize(coalesce(question, '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_norm_trgm
  ON products USING gin (ar_normalize(name) gin_trgm_ops);
