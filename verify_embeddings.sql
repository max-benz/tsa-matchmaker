-- Verify embeddings are actually generated
-- Run this in Supabase SQL Editor

-- Check overall counts
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as has_embedding,
  COUNT(*) FILTER (WHERE embedding_dirty = TRUE) as still_dirty,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL AND array_length(embedding::float[], 1) = 1536) as valid_dimension_count
FROM singles_form_data;

-- Sample a few embeddings to verify they look real
SELECT
  id,
  first_name,
  LEFT(searchable_text, 50) as text_sample,
  array_length(embedding::float[], 1) as embedding_dimension,
  LEFT(embedding::text, 100) as embedding_preview,
  embedding_updated_at
FROM singles_form_data
WHERE embedding IS NOT NULL
LIMIT 5;

-- Check if all embeddings are identical (which would be suspicious)
SELECT
  COUNT(DISTINCT embedding) as unique_embeddings,
  COUNT(*) as total_embeddings
FROM singles_form_data
WHERE embedding IS NOT NULL;
