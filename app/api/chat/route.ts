import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { openai, embed } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchRequest {
  message: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  state?: string;
  alpha?: number;
  topK?: number;
  conversationHistory?: ChatMessage[];
  isRefinement?: boolean;
  existingResults?: SearchResult[];
}

interface SearchResult {
  id: number;
  first_name: string;
  last_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  age_years: number | null;
  gender: string | null;
  personal_summary: string | null;
  primary_image_url: string | null;
  status: string | null;
  final_score: number;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Chat API Request Started ===');
    const body: SearchRequest = await request.json();
    console.log('Request body parsed successfully');
    console.log('Message:', body.message);
    console.log('Is refinement:', body.isRefinement);
    console.log('Existing results count:', body.existingResults?.length || 0);

    // Validate message
    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const {
      message,
      gender = undefined,
      minAge = undefined,
      maxAge = undefined,
      state = undefined,
      alpha = 0.6,
      topK = 10000, // Return entire database - scales automatically as database grows
      conversationHistory = [],
      isRefinement = false,
      existingResults = [],
    } = body;

    let searchResults: SearchResult[] = [];

    if (isRefinement && existingResults.length > 0) {
      // This is a refinement query - use existing results instead of searching database
      console.log(`Refining ${existingResults.length} existing results with query:`, message);
      searchResults = existingResults;
    } else {
      // This is a new search - query the database
      console.log('Generating embedding for new search query:', message);
      const queryEmbedding = await embed(message);

      // Call hybrid search RPC
      const supabase = supabaseServer();
      console.log('Executing hybrid search with filters:', {
        gender,
        minAge,
        maxAge,
        state,
        alpha,
        topK,
      });

      const { data: results, error: searchError } = await supabase.rpc('hybrid_search_singles', {
        p_query_text: message,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_alpha: alpha,
        p_match_count: topK,
        p_gender: gender || null,
        p_min_age: minAge || null,
        p_max_age: maxAge || null,
        p_state: state || null,
      });

      if (searchError) {
        console.error('Supabase search error:', searchError);
        return NextResponse.json(
          { error: `Search failed: ${searchError.message}` },
          { status: 500 }
        );
      }

      searchResults = results || [];
      console.log(`Found ${searchResults.length} results from database search`);
    }

    // Format results for LLM
    console.log('Formatting results for LLM...');
    const formattedResults = searchResults.map((r) => {
      const locationParts = [r.city, r.state, r.country].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';

      return {
        id: r.id,
        name: `${r.first_name} ${r.last_name?.charAt(0) || ''}.`,
        location,
        age: r.age_years || 'Age not specified',
        gender: r.gender || 'Not specified',
        summary: r.personal_summary || 'No summary available',
        image: r.primary_image_url || null,
        score: r.final_score.toFixed(4),
      };
    });
    console.log(`Formatted ${formattedResults.length} results`);

    // Limit results sent to OpenAI to avoid token overflow
    // OpenAI has 128k token limit, sending thousands of profiles exceeds this
    const MAX_RESULTS_FOR_AI = 100;
    const resultsForAI = formattedResults.slice(0, MAX_RESULTS_FOR_AI);
    console.log(`Sending ${resultsForAI.length} results to OpenAI (limited from ${formattedResults.length})`);

    // Generate LLM summary with conversation history
    console.log('Generating LLM summary with OpenAI...');
    const systemPrompt = isRefinement
      ? `You are a helpful matchmaking assistant. The user has refined their previous search query.

Your task: Analyze the ${searchResults.length} total results and help filter them based on the user's refinement request.

Note: For efficiency, you're seeing the top ${resultsForAI.length} results, but ${searchResults.length} total profiles were found.

For refinement queries:
1. Identify which profiles match the user's new criteria
2. Explain how you filtered the results
3. Highlight the best matches from the set
4. Suggest 1-2 ways to further refine or expand

When mentioning specific profiles, cite them as [#id] where id is the profile ID.
Keep your response conversational and focused on the refinement.`
      : `You are a helpful matchmaking assistant. Analyze search results and provide a concise summary.

${formattedResults.length > MAX_RESULTS_FOR_AI ? `Note: ${searchResults.length} total profiles were found. For efficiency, you're analyzing the top ${resultsForAI.length} matches.` : ''}

Include:
1. A brief overview of the results found (mention total count)
2. Key highlights about the top matches
3. 2-3 specific refinement suggestions to help narrow the search

When mentioning specific profiles, cite them as [#id] where id is the profile ID.
Keep your response conversational and helpful.`;

    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      // Include previous conversation history
      ...conversationHistory,
      // Add current query
      {
        role: 'user',
        content: `Query: "${message}"

Filters applied:
${gender ? `- Gender: ${gender}` : ''}
${minAge ? `- Min Age: ${minAge}` : ''}
${maxAge ? `- Max Age: ${maxAge}` : ''}
${state ? `- State: ${state}` : ''}

Total results found: ${searchResults.length}
Analyzing top ${resultsForAI.length} matches:
${JSON.stringify(resultsForAI, null, 2)}

Please provide a summary and refinement suggestions.`,
      },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    console.log('OpenAI response received successfully');

    const answer = chatCompletion.choices[0]?.message?.content || 'Unable to generate summary.';
    console.log('Extracted answer from OpenAI response');

    // Return results
    return NextResponse.json({
      answer,
      results: searchResults,
    });
  } catch (error) {
    console.error('=== Error in chat endpoint ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);

    return NextResponse.json(
      {
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
