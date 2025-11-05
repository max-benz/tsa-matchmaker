-- Verify embeddings are actually generated
-- Run this in Supabase SQL Editor

-- Check overall counts
SELECT
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as has_embedding,
  COUNT(*) FILTER (WHERE embedding_dirty = TRUE) as still_dirty
FROM singles_form_data;

-- Sample a few embeddings to verify they look real
SELECT
  id,
  first_name,
  LEFT(searchable_text, 50) as text_sample,
  LEFT(embedding::text, 100) as embedding_preview,
  embedding_updated_at,
  embedding_dirty
FROM singles_form_data
WHERE embedding IS NOT NULL
LIMIT 5;

-- Check if all embeddings are identical (which would be suspicious)
SELECT
  COUNT(DISTINCT embedding) as unique_embeddings,
  COUNT(*) as total_embeddings
FROM singles_form_data
WHERE embedding IS NOT NULL;

-- Show when embeddings were created
SELECT
  DATE(embedding_updated_at) as date,
  COUNT(*) as embeddings_created
FROM singles_form_data
WHERE embedding IS NOT NULL
GROUP BY DATE(embedding_updated_at)
ORDER BY date DESC;
