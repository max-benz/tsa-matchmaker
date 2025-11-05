-- Mark all profiles as dirty to trigger embedding generation
-- Run this in Supabase SQL Editor

UPDATE singles_form_data
SET
  embedding_dirty = TRUE,
  embedding_updated_at = NULL
WHERE embedding IS NULL OR embedding_dirty = FALSE;

-- Verify the count
SELECT
  COUNT(*) FILTER (WHERE embedding_dirty = TRUE) as dirty_count,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as has_embedding_count,
  COUNT(*) as total_count
FROM singles_form_data;
