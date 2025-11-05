#!/bin/bash

# Test the API directly to see if OpenAI is being called
# This will generate an embedding for a test profile

echo "Testing direct API call to sync endpoint..."
echo ""

response=$(curl -s -X POST "https://tsa-matchmaker.vercel.app/api/embeddings/sync" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}')

echo "Response from sync endpoint:"
echo "$response"
echo ""

# Also test the diagnostics endpoint
echo "Checking diagnostics endpoint..."
echo ""

diag=$(curl -s "https://tsa-matchmaker.vercel.app/api/diagnostics")

echo "Diagnostics response:"
echo "$diag"
echo ""

# Test OpenAI API directly with the key
echo "Now testing OpenAI API directly..."
echo "Please enter your OpenAI API key:"
read -s OPENAI_KEY
echo ""

openai_response=$(curl -s https://api.openai.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -d '{
    "input": "Test embedding",
    "model": "text-embedding-3-small"
  }')

echo "OpenAI direct API response:"
echo "$openai_response" | head -c 500
echo ""
echo "..."
