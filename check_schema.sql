-- Check if embedding_updated_at column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'singles_form_data'
  AND column_name LIKE '%embedding%'
ORDER BY column_name;

-- Also check what one actual embedding looks like
SELECT
  id,
  first_name,
  embedding::text as embedding_full,
  LENGTH(embedding::text) as embedding_length,
  created_at,
  updated_at
FROM singles_form_data
WHERE embedding IS NOT NULL
LIMIT 1;
