-- ============================================
-- Singles Search - Complete Database Migration (FIXED)
-- ============================================
-- This migration augments existing tables:
-- - singles_form_data
-- - singles_form_images

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Add columns to singles_form_data
-- ============================================

-- Add computed column: searchable_text (concatenated searchable fields)
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS searchable_text TEXT GENERATED ALWAYS AS (
  COALESCE(first_name, '') || ' ' ||
  COALESCE(last_name, '') || ' ' ||
  COALESCE(city, '') || ' ' ||
  COALESCE(state, '') || ' ' ||
  COALESCE(country, '') || ' ' ||
  COALESCE(metropolitan_area, '') || ' ' ||
  COALESCE(occupation, '') || ' ' ||
  COALESCE(lifestyle_interests, '') || ' ' ||
  COALESCE(physical_activities, '') || ' ' ||
  COALESCE(personal_summary, '') || ' ' ||
  COALESCE(notes, '')
) STORED;

-- Add tsvector column for full-text search (updated by trigger)
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;

-- Add age_years column (updated by trigger)
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS age_years INTEGER;

-- Add embedding column (vector with 1536 dimensions for text-embedding-3-small)
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Add primary image URL column
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- Add embedding freshness tracking columns
ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS embedding_dirty BOOLEAN DEFAULT TRUE;

ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

ALTER TABLE singles_form_data
ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 0;

-- ============================================
-- Create triggers to update computed columns
-- ============================================

-- Trigger function: Update content_tsv
CREATE OR REPLACE FUNCTION update_content_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('english',
    COALESCE(NEW.first_name, '') || ' ' ||
    COALESCE(NEW.last_name, '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.state, '') || ' ' ||
    COALESCE(NEW.country, '') || ' ' ||
    COALESCE(NEW.metropolitan_area, '') || ' ' ||
    COALESCE(NEW.occupation, '') || ' ' ||
    COALESCE(NEW.lifestyle_interests, '') || ' ' ||
    COALESCE(NEW.physical_activities, '') || ' ' ||
    COALESCE(NEW.personal_summary, '') || ' ' ||
    COALESCE(NEW.notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_update_content_tsv ON singles_form_data;
CREATE TRIGGER trigger_update_content_tsv
  BEFORE INSERT OR UPDATE ON singles_form_data
  FOR EACH ROW
  EXECUTE FUNCTION update_content_tsv();

-- Trigger function: Update age_years
CREATE OR REPLACE FUNCTION update_age_years()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age_years := DATE_PART('year', AGE(CURRENT_DATE, NEW.date_of_birth))::INTEGER;
  ELSE
    NEW.age_years := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_age_years ON singles_form_data;
CREATE TRIGGER trigger_update_age_years
  BEFORE INSERT OR UPDATE ON singles_form_data
  FOR EACH ROW
  EXECUTE FUNCTION update_age_years();

-- ============================================
-- Backfill existing rows with content_tsv and age_years
-- ============================================

UPDATE singles_form_data
SET
  content_tsv = to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(state, '') || ' ' ||
    COALESCE(country, '') || ' ' ||
    COALESCE(metropolitan_area, '') || ' ' ||
    COALESCE(occupation, '') || ' ' ||
    COALESCE(lifestyle_interests, '') || ' ' ||
    COALESCE(physical_activities, '') || ' ' ||
    COALESCE(personal_summary, '') || ' ' ||
    COALESCE(notes, '')
  ),
  age_years = CASE
    WHEN date_of_birth IS NOT NULL THEN
      DATE_PART('year', AGE(CURRENT_DATE, date_of_birth))::INTEGER
    ELSE NULL
  END
WHERE content_tsv IS NULL OR age_years IS NULL;

-- ============================================
-- Create indexes for performance
-- ============================================

-- GIN index on content_tsv for fast full-text search
CREATE INDEX IF NOT EXISTS idx_singles_content_tsv
ON singles_form_data USING GIN(content_tsv);

-- IVFFlat index on embedding for fast vector similarity search
-- Using 100 lists (good for ~10k rows)
CREATE INDEX IF NOT EXISTS idx_singles_embedding
ON singles_form_data USING ivfflat(embedding vector_cosine_ops)
WITH (lists = 100);

-- Index on embedding_dirty for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_singles_embedding_dirty
ON singles_form_data(embedding_dirty)
WHERE embedding_dirty = TRUE;

-- Indexes for filter columns
CREATE INDEX IF NOT EXISTS idx_singles_gender
ON singles_form_data(gender);

CREATE INDEX IF NOT EXISTS idx_singles_state
ON singles_form_data(state);

CREATE INDEX IF NOT EXISTS idx_singles_age_years
ON singles_form_data(age_years);

-- ============================================
-- Trigger: Mark single as dirty when content changes
-- ============================================

CREATE OR REPLACE FUNCTION mark_single_dirty()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any searchable field has changed
  IF (NEW.first_name IS DISTINCT FROM OLD.first_name OR
      NEW.last_name IS DISTINCT FROM OLD.last_name OR
      NEW.city IS DISTINCT FROM OLD.city OR
      NEW.state IS DISTINCT FROM OLD.state OR
      NEW.country IS DISTINCT FROM OLD.country OR
      NEW.metropolitan_area IS DISTINCT FROM OLD.metropolitan_area OR
      NEW.occupation IS DISTINCT FROM OLD.occupation OR
      NEW.lifestyle_interests IS DISTINCT FROM OLD.lifestyle_interests OR
      NEW.physical_activities IS DISTINCT FROM OLD.physical_activities OR
      NEW.personal_summary IS DISTINCT FROM OLD.personal_summary OR
      NEW.notes IS DISTINCT FROM OLD.notes) THEN

    NEW.embedding_dirty := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_single_dirty ON singles_form_data;
CREATE TRIGGER trigger_mark_single_dirty
  BEFORE UPDATE ON singles_form_data
  FOR EACH ROW
  EXECUTE FUNCTION mark_single_dirty();

-- ============================================
-- Trigger: Sync primary image from singles_form_images
-- ============================================

CREATE OR REPLACE FUNCTION sync_primary_image()
RETURNS TRIGGER AS $$
DECLARE
  v_form_data_id INTEGER;
  v_image_url TEXT;
BEGIN
  -- Determine the form_data_id based on the operation
  IF TG_OP = 'DELETE' THEN
    v_form_data_id := OLD.form_data_id;
  ELSE
    v_form_data_id := NEW.form_data_id;
  END IF;

  -- Get the primary image URL
  SELECT image_url INTO v_image_url
  FROM singles_form_images
  WHERE form_data_id = v_form_data_id
  ORDER BY is_primary DESC, image_order ASC, id ASC
  LIMIT 1;

  -- Update the singles_form_data table
  UPDATE singles_form_data
  SET primary_image_url = v_image_url
  WHERE id = v_form_data_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_primary_image_insert ON singles_form_images;
CREATE TRIGGER trigger_sync_primary_image_insert
  AFTER INSERT ON singles_form_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_image();

DROP TRIGGER IF EXISTS trigger_sync_primary_image_update ON singles_form_images;
CREATE TRIGGER trigger_sync_primary_image_update
  AFTER UPDATE ON singles_form_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_image();

DROP TRIGGER IF EXISTS trigger_sync_primary_image_delete ON singles_form_images;
CREATE TRIGGER trigger_sync_primary_image_delete
  AFTER DELETE ON singles_form_images
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_image();

-- ============================================
-- RPC: Pure vector KNN search with filters
-- ============================================

CREATE OR REPLACE FUNCTION match_singles(
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.0,
  p_match_count INT DEFAULT 24,
  p_gender TEXT DEFAULT NULL,
  p_min_age INT DEFAULT NULL,
  p_max_age INT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
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
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.first_name,
    s.last_name,
    s.city,
    s.state,
    s.country,
    s.age_years,
    s.gender,
    s.personal_summary,
    s.primary_image_url,
    1 - (s.embedding <=> p_query_embedding) AS similarity
  FROM singles_form_data s
  WHERE s.embedding IS NOT NULL
    AND (p_gender IS NULL OR s.gender = p_gender)
    AND (p_min_age IS NULL OR s.age_years >= p_min_age)
    AND (p_max_age IS NULL OR s.age_years <= p_max_age)
    AND (p_state IS NULL OR s.state = p_state)
    AND (1 - (s.embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY s.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- ============================================
-- RPC: Hybrid search combining FTS + Vector
-- ============================================

CREATE OR REPLACE FUNCTION hybrid_search_singles(
  p_query_text TEXT,
  p_query_embedding VECTOR(1536),
  p_alpha FLOAT DEFAULT 0.6,
  p_match_count INT DEFAULT 24,
  p_gender TEXT DEFAULT NULL,
  p_min_age INT DEFAULT NULL,
  p_max_age INT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
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
  final_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.city,
      s.state,
      s.country,
      s.age_years,
      s.gender,
      s.personal_summary,
      s.primary_image_url,
      ts_rank(s.content_tsv, plainto_tsquery('english', p_query_text)) AS fts_score,
      NULL::FLOAT AS vec_score
    FROM singles_form_data s
    WHERE s.content_tsv @@ plainto_tsquery('english', p_query_text)
      AND (p_gender IS NULL OR s.gender = p_gender)
      AND (p_min_age IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years <= p_max_age)
      AND (p_state IS NULL OR s.state = p_state)
  ),
  vector_results AS (
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.city,
      s.state,
      s.country,
      s.age_years,
      s.gender,
      s.personal_summary,
      s.primary_image_url,
      NULL::FLOAT AS fts_score,
      1 - (s.embedding <=> p_query_embedding) AS vec_score
    FROM singles_form_data s
    WHERE s.embedding IS NOT NULL
      AND (p_gender IS NULL OR s.gender = p_gender)
      AND (p_min_age IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years <= p_max_age)
      AND (p_state IS NULL OR s.state = p_state)
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
      id,
      MAX(first_name) AS first_name,
      MAX(last_name) AS last_name,
      MAX(city) AS city,
      MAX(state) AS state,
      MAX(country) AS country,
      MAX(age_years) AS age_years,
      MAX(gender) AS gender,
      MAX(personal_summary) AS personal_summary,
      MAX(primary_image_url) AS primary_image_url,
      COALESCE(MAX(fts_score), 0) AS fts_score,
      COALESCE(MAX(vec_score), 0) AS vec_score
    FROM combined
    GROUP BY id
  )
  SELECT
    a.id,
    a.first_name,
    a.last_name,
    a.city,
    a.state,
    a.country,
    a.age_years,
    a.gender,
    a.personal_summary,
    a.primary_image_url,
    (p_alpha * a.fts_score) + ((1 - p_alpha) * a.vec_score) AS final_score
  FROM aggregated a
  ORDER BY final_score DESC
  LIMIT p_match_count;
END;
$$;

-- ============================================
-- Create safe view excluding sensitive fields
-- ============================================

CREATE OR REPLACE VIEW singles_search_view AS
SELECT
  id,
  first_name,
  last_name,
  city,
  state,
  country,
  metropolitan_area,
  date_of_birth,
  age_years,
  gender,
  occupation,
  lifestyle_interests,
  physical_activities,
  personal_summary,
  notes,
  primary_image_url,
  created_at,
  updated_at
FROM singles_form_data;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on singles_form_data
ALTER TABLE singles_form_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read singles via view" ON singles_form_data;
DROP POLICY IF EXISTS "Allow authenticated users to execute RPC functions" ON singles_form_data;
DROP POLICY IF EXISTS "Allow public access to read singles" ON singles_form_data;

-- Policy: Public (anonymous) users can read through the view and RPC functions
-- This enables the web app to be publicly accessible without authentication
CREATE POLICY "Allow public access to read singles"
  ON singles_form_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grant access to the view for both anonymous and authenticated users
GRANT SELECT ON singles_search_view TO anon, authenticated;

-- Grant execute permission on RPC functions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION match_singles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hybrid_search_singles TO anon, authenticated;

-- ============================================
-- Initial primary image sync
-- ============================================

-- Populate primary_image_url for existing records
UPDATE singles_form_data s
SET primary_image_url = (
  SELECT image_url
  FROM singles_form_images i
  WHERE i.form_data_id = s.id
  ORDER BY is_primary DESC, image_order ASC, id ASC
  LIMIT 1
);

-- ============================================
-- Migration complete
-- ============================================
-- Next steps:
-- 1. Backfill embeddings using /api/embeddings endpoint
-- 2. Test hybrid search functionality
-- ============================================
