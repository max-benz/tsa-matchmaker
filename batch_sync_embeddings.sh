#!/bin/bash

# Batch process all embeddings
# This script runs the sync endpoint multiple times to process all profiles

URL="https://tsa-matchmaker.vercel.app/api/embeddings/sync"
BATCH_SIZE=200
TOTAL_BATCHES=14  # 2661 / 200 = 13.3, so 14 batches to be safe

echo "Starting batch embedding sync..."
echo "Processing $TOTAL_BATCHES batches of $BATCH_SIZE profiles each"
echo ""

for i in $(seq 1 $TOTAL_BATCHES); do
  echo "Batch $i of $TOTAL_BATCHES..."

  response=$(curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d "{\"limit\": $BATCH_SIZE}")

  echo "Response: $response"
  echo ""

  # Wait 2 seconds between batches to avoid rate limits
  if [ $i -lt $TOTAL_BATCHES ]; then
    echo "Waiting 2 seconds before next batch..."
    sleep 2
  fi
done

echo ""
echo "Batch processing complete!"
echo "Run this SQL in Supabase to verify:"
echo "SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) as completed FROM singles_form_data;"
