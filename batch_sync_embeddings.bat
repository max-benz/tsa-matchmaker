@echo off
REM Batch process all embeddings for Windows
REM This script runs the sync endpoint multiple times to process all profiles

set URL=https://tsa-matchmaker.vercel.app/api/embeddings/sync
set BATCH_SIZE=200
set TOTAL_BATCHES=14

echo Starting batch embedding sync...
echo Processing %TOTAL_BATCHES% batches of %BATCH_SIZE% profiles each
echo.

for /L %%i in (1,1,%TOTAL_BATCHES%) do (
  echo Batch %%i of %TOTAL_BATCHES%...

  curl -X POST "%URL%" -H "Content-Type: application/json" -d "{\"limit\": %BATCH_SIZE%}"

  echo.
  echo.

  REM Wait 2 seconds between batches (except for last batch)
  if %%i LSS %TOTAL_BATCHES% (
    echo Waiting 2 seconds before next batch...
    timeout /t 2 /nobreak >nul
  )
)

echo.
echo Batch processing complete!
echo Run this SQL in Supabase to verify:
echo SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) as completed FROM singles_form_data;
pause
