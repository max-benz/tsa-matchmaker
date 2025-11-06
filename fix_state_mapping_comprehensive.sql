-- Comprehensive state matching: handles both abbreviations and full names
-- Example: "CA" matches "California", "california", "CA", "ca"
-- Run this in Supabase SQL Editor

-- First, create a helper function to expand state abbreviations to full names
CREATE OR REPLACE FUNCTION expand_state_filter(p_states TEXT[])
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  expanded TEXT[];
  state_val TEXT;
  state_upper TEXT;
BEGIN
  expanded := ARRAY[]::TEXT[];

  FOREACH state_val IN ARRAY p_states
  LOOP
    state_upper := UPPER(state_val);

    -- Add the original value (uppercased)
    expanded := array_append(expanded, state_upper);

    -- Add full state name if abbreviation provided
    CASE state_upper
      WHEN 'AL' THEN expanded := array_append(expanded, 'ALABAMA');
      WHEN 'AK' THEN expanded := array_append(expanded, 'ALASKA');
      WHEN 'AZ' THEN expanded := array_append(expanded, 'ARIZONA');
      WHEN 'AR' THEN expanded := array_append(expanded, 'ARKANSAS');
      WHEN 'CA' THEN expanded := array_append(expanded, 'CALIFORNIA');
      WHEN 'CO' THEN expanded := array_append(expanded, 'COLORADO');
      WHEN 'CT' THEN expanded := array_append(expanded, 'CONNECTICUT');
      WHEN 'DE' THEN expanded := array_append(expanded, 'DELAWARE');
      WHEN 'FL' THEN expanded := array_append(expanded, 'FLORIDA');
      WHEN 'GA' THEN expanded := array_append(expanded, 'GEORGIA');
      WHEN 'HI' THEN expanded := array_append(expanded, 'HAWAII');
      WHEN 'ID' THEN expanded := array_append(expanded, 'IDAHO');
      WHEN 'IL' THEN expanded := array_append(expanded, 'ILLINOIS');
      WHEN 'IN' THEN expanded := array_append(expanded, 'INDIANA');
      WHEN 'IA' THEN expanded := array_append(expanded, 'IOWA');
      WHEN 'KS' THEN expanded := array_append(expanded, 'KANSAS');
      WHEN 'KY' THEN expanded := array_append(expanded, 'KENTUCKY');
      WHEN 'LA' THEN expanded := array_append(expanded, 'LOUISIANA');
      WHEN 'ME' THEN expanded := array_append(expanded, 'MAINE');
      WHEN 'MD' THEN expanded := array_append(expanded, 'MARYLAND');
      WHEN 'MA' THEN expanded := array_append(expanded, 'MASSACHUSETTS');
      WHEN 'MI' THEN expanded := array_append(expanded, 'MICHIGAN');
      WHEN 'MN' THEN expanded := array_append(expanded, 'MINNESOTA');
      WHEN 'MS' THEN expanded := array_append(expanded, 'MISSISSIPPI');
      WHEN 'MO' THEN expanded := array_append(expanded, 'MISSOURI');
      WHEN 'MT' THEN expanded := array_append(expanded, 'MONTANA');
      WHEN 'NE' THEN expanded := array_append(expanded, 'NEBRASKA');
      WHEN 'NV' THEN expanded := array_append(expanded, 'NEVADA');
      WHEN 'NH' THEN expanded := array_append(expanded, 'NEW HAMPSHIRE');
      WHEN 'NJ' THEN expanded := array_append(expanded, 'NEW JERSEY');
      WHEN 'NM' THEN expanded := array_append(expanded, 'NEW MEXICO');
      WHEN 'NY' THEN expanded := array_append(expanded, 'NEW YORK');
      WHEN 'NC' THEN expanded := array_append(expanded, 'NORTH CAROLINA');
      WHEN 'ND' THEN expanded := array_append(expanded, 'NORTH DAKOTA');
      WHEN 'OH' THEN expanded := array_append(expanded, 'OHIO');
      WHEN 'OK' THEN expanded := array_append(expanded, 'OKLAHOMA');
      WHEN 'OR' THEN expanded := array_append(expanded, 'OREGON');
      WHEN 'PA' THEN expanded := array_append(expanded, 'PENNSYLVANIA');
      WHEN 'RI' THEN expanded := array_append(expanded, 'RHODE ISLAND');
      WHEN 'SC' THEN expanded := array_append(expanded, 'SOUTH CAROLINA');
      WHEN 'SD' THEN expanded := array_append(expanded, 'SOUTH DAKOTA');
      WHEN 'TN' THEN expanded := array_append(expanded, 'TENNESSEE');
      WHEN 'TX' THEN expanded := array_append(expanded, 'TEXAS');
      WHEN 'UT' THEN expanded := array_append(expanded, 'UTAH');
      WHEN 'VT' THEN expanded := array_append(expanded, 'VERMONT');
      WHEN 'VA' THEN expanded := array_append(expanded, 'VIRGINIA');
      WHEN 'WA' THEN expanded := array_append(expanded, 'WASHINGTON');
      WHEN 'WV' THEN expanded := array_append(expanded, 'WEST VIRGINIA');
      WHEN 'WI' THEN expanded := array_append(expanded, 'WISCONSIN');
      WHEN 'WY' THEN expanded := array_append(expanded, 'WYOMING');
      -- Also handle reverse: full name to abbreviation
      WHEN 'ALABAMA' THEN expanded := array_append(expanded, 'AL');
      WHEN 'ALASKA' THEN expanded := array_append(expanded, 'AK');
      WHEN 'ARIZONA' THEN expanded := array_append(expanded, 'AZ');
      WHEN 'ARKANSAS' THEN expanded := array_append(expanded, 'AR');
      WHEN 'CALIFORNIA' THEN expanded := array_append(expanded, 'CA');
      WHEN 'COLORADO' THEN expanded := array_append(expanded, 'CO');
      WHEN 'CONNECTICUT' THEN expanded := array_append(expanded, 'CT');
      WHEN 'DELAWARE' THEN expanded := array_append(expanded, 'DE');
      WHEN 'FLORIDA' THEN expanded := array_append(expanded, 'FL');
      WHEN 'GEORGIA' THEN expanded := array_append(expanded, 'GA');
      WHEN 'HAWAII' THEN expanded := array_append(expanded, 'HI');
      WHEN 'IDAHO' THEN expanded := array_append(expanded, 'ID');
      WHEN 'ILLINOIS' THEN expanded := array_append(expanded, 'IL');
      WHEN 'INDIANA' THEN expanded := array_append(expanded, 'IN');
      WHEN 'IOWA' THEN expanded := array_append(expanded, 'IA');
      WHEN 'KANSAS' THEN expanded := array_append(expanded, 'KS');
      WHEN 'KENTUCKY' THEN expanded := array_append(expanded, 'KY');
      WHEN 'LOUISIANA' THEN expanded := array_append(expanded, 'LA');
      WHEN 'MAINE' THEN expanded := array_append(expanded, 'ME');
      WHEN 'MARYLAND' THEN expanded := array_append(expanded, 'MD');
      WHEN 'MASSACHUSETTS' THEN expanded := array_append(expanded, 'MA');
      WHEN 'MICHIGAN' THEN expanded := array_append(expanded, 'MI');
      WHEN 'MINNESOTA' THEN expanded := array_append(expanded, 'MN');
      WHEN 'MISSISSIPPI' THEN expanded := array_append(expanded, 'MS');
      WHEN 'MISSOURI' THEN expanded := array_append(expanded, 'MO');
      WHEN 'MONTANA' THEN expanded := array_append(expanded, 'MT');
      WHEN 'NEBRASKA' THEN expanded := array_append(expanded, 'NE');
      WHEN 'NEVADA' THEN expanded := array_append(expanded, 'NV');
      WHEN 'NEW HAMPSHIRE' THEN expanded := array_append(expanded, 'NH');
      WHEN 'NEW JERSEY' THEN expanded := array_append(expanded, 'NJ');
      WHEN 'NEW MEXICO' THEN expanded := array_append(expanded, 'NM');
      WHEN 'NEW YORK' THEN expanded := array_append(expanded, 'NY');
      WHEN 'NORTH CAROLINA' THEN expanded := array_append(expanded, 'NC');
      WHEN 'NORTH DAKOTA' THEN expanded := array_append(expanded, 'ND');
      WHEN 'OHIO' THEN expanded := array_append(expanded, 'OH');
      WHEN 'OKLAHOMA' THEN expanded := array_append(expanded, 'OK');
      WHEN 'OREGON' THEN expanded := array_append(expanded, 'OR');
      WHEN 'PENNSYLVANIA' THEN expanded := array_append(expanded, 'PA');
      WHEN 'RHODE ISLAND' THEN expanded := array_append(expanded, 'RI');
      WHEN 'SOUTH CAROLINA' THEN expanded := array_append(expanded, 'SC');
      WHEN 'SOUTH DAKOTA' THEN expanded := array_append(expanded, 'SD');
      WHEN 'TENNESSEE' THEN expanded := array_append(expanded, 'TN');
      WHEN 'TEXAS' THEN expanded := array_append(expanded, 'TX');
      WHEN 'UTAH' THEN expanded := array_append(expanded, 'UT');
      WHEN 'VERMONT' THEN expanded := array_append(expanded, 'VT');
      WHEN 'VIRGINIA' THEN expanded := array_append(expanded, 'VA');
      WHEN 'WASHINGTON' THEN expanded := array_append(expanded, 'WA');
      WHEN 'WEST VIRGINIA' THEN expanded := array_append(expanded, 'WV');
      WHEN 'WISCONSIN' THEN expanded := array_append(expanded, 'WI');
      WHEN 'WYOMING' THEN expanded := array_append(expanded, 'WY');
    ELSE
      -- If no mapping found, just keep the uppercased value
      NULL;
    END CASE;
  END LOOP;

  RETURN expanded;
END;
$$;

-- Now update the hybrid_search function to use the state expansion
CREATE OR REPLACE FUNCTION hybrid_search_singles(
  p_query_text TEXT,
  p_query_embedding VECTOR(1536),
  p_alpha FLOAT DEFAULT 0.8,
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
DECLARE
  expanded_states TEXT[];
BEGIN
  -- Expand state filters to include both abbreviations and full names
  IF p_states IS NOT NULL THEN
    expanded_states := expand_state_filter(p_states);
  END IF;

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
      AND (p_min_age IS NULL OR s.age_years IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years IS NULL OR s.age_years <= p_max_age)
      -- Match against expanded state list (includes both abbrev and full name)
      AND (
        p_states IS NULL
        OR (s.state IS NOT NULL AND UPPER(s.state) = ANY(expanded_states))
      )
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
      AND (p_min_age IS NULL OR s.age_years IS NULL OR s.age_years >= p_min_age)
      AND (p_max_age IS NULL OR s.age_years IS NULL OR s.age_years <= p_max_age)
      -- Match against expanded state list (includes both abbrev and full name)
      AND (
        p_states IS NULL
        OR (s.state IS NOT NULL AND UPPER(s.state) = ANY(expanded_states))
      )
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

-- Diagnostic: Test the state expansion function
SELECT expand_state_filter(ARRAY['CA', 'NY', 'Texas']);
-- Should return: {CA, CALIFORNIA, NY, NEW YORK, TEXAS, TX}

-- Diagnostic: Check what state values exist in your database
SELECT DISTINCT state, COUNT(*) as profile_count
FROM singles_form_data
WHERE state IS NOT NULL
ORDER BY profile_count DESC
LIMIT 20;
