-- Update hybrid_search_singles function with NULL-safe filtering
-- Profiles with missing data (NULL height, age, state) will NOT be excluded
-- Filters only apply to profiles that HAVE the data
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION hybrid_search_singles(
  p_query_text TEXT,
  p_query_embedding VECTOR(1536),
  p_alpha FLOAT DEFAULT 0.6,
  p_match_count INT DEFAULT 10000,
  p_gender TEXT DEFAULT NULL,
  p_min_age INT DEFAULT NULL,
  p_max_age INT DEFAULT NULL,
  p_states TEXT[] DEFAULT NULL,
  p_min_height INT DEFAULT NULL,
  p_max_height INT DEFAULT NULL
)
RETURNS TABLE (
  id INTEGER,
  first_name TEXT,
  last_name TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  age_years INTEGER,
  gender TEXT,
  personal_summary TEXT,
  primary_image_url TEXT,
  status TEXT,
  final_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT
      s.id AS result_id,
      s.first_name,
      s.last_name,
      s.city,
      s.state,
      s.country,
      s.age_years,
      s.gender,
      s.personal_summary,
      s.primary_image_url,
      s.status,
      ts_rank(s.content_tsv, plainto_tsquery('english', p_query_text)) AS fts_score,
      NULL::FLOAT AS vec_score
    FROM singles_form_data s
    WHERE s.content_tsv @@ plainto_tsquery('english', p_query_text)
      AND (p_gender IS NULL OR s.gender = p_gender)
      -- NULL-safe age filtering: include profiles with NULL age
      AND (p_min_age IS NULL OR s.age_years IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years IS NULL OR s.age_years <= p_max_age)
      -- NULL-safe state filtering: include profiles with NULL state
      AND (p_states IS NULL OR s.state IS NULL OR s.state = ANY(p_states))
      -- NULL-safe height filtering: include profiles with NULL height
      AND (p_min_height IS NULL OR s.height IS NULL OR s.height >= p_min_height)
      AND (p_max_height IS NULL OR s.height IS NULL OR s.height <= p_max_height)
  ),
  vector_results AS (
    SELECT
      s.id AS result_id,
      s.first_name,
      s.last_name,
      s.city,
      s.state,
      s.country,
      s.age_years,
      s.gender,
      s.personal_summary,
      s.primary_image_url,
      s.status,
      NULL::FLOAT AS fts_score,
      1 - (s.embedding <=> p_query_embedding) AS vec_score
    FROM singles_form_data s
    WHERE s.embedding IS NOT NULL
      AND (p_gender IS NULL OR s.gender = p_gender)
      -- NULL-safe age filtering: include profiles with NULL age
      AND (p_min_age IS NULL OR s.age_years IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years IS NULL OR s.age_years <= p_max_age)
      -- NULL-safe state filtering: include profiles with NULL state
      AND (p_states IS NULL OR s.state IS NULL OR s.state = ANY(p_states))
      -- NULL-safe height filtering: include profiles with NULL height
      AND (p_min_height IS NULL OR s.height IS NULL OR s.height >= p_min_height)
      AND (p_max_height IS NULL OR s.height IS NULL OR s.height <= p_max_height)
    ORDER BY s.embedding <=> p_query_embedding
    LIMIT p_match_count * 2
  ),
  combined AS (
    SELECT * FROM fts_results
    UNION ALL
    SELECT * FROM vector_results
  ),
  aggregated AS (
    SELECT
      c.result_id,
      MAX(c.first_name) AS first_name,
      MAX(c.last_name) AS last_name,
      MAX(c.city) AS city,
      MAX(c.state) AS state,
      MAX(c.country) AS country,
      MAX(c.age_years) AS age_years,
      MAX(c.gender) AS gender,
      MAX(c.personal_summary) AS personal_summary,
      MAX(c.primary_image_url) AS primary_image_url,
      MAX(c.status) AS status,
      COALESCE(MAX(c.fts_score), 0) AS fts_score,
      COALESCE(MAX(c.vec_score), 0) AS vec_score
    FROM combined c
    GROUP BY c.result_id
  )
  SELECT
    a.result_id AS id,
    a.first_name,
    a.last_name,
    a.city,
    a.state,
    a.country,
    a.age_years,
    a.gender,
    a.personal_summary,
    a.primary_image_url,
    a.status,
    (p_alpha * a.fts_score) + ((1 - p_alpha) * a.vec_score) AS final_score
  FROM aggregated a
  ORDER BY (p_alpha * a.fts_score) + ((1 - p_alpha) * a.vec_score) DESC
  LIMIT p_match_count;
END;
$$;
