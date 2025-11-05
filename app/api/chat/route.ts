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
    const body: SearchRequest = await request.json();

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
      topK = 1000, // Return up to 1000 matches for comprehensive conversational refinement
      conversationHistory = [],
    } = body;

    // Generate embedding for the search query
    console.log('Generating embedding for query:', message);
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

    const searchResults: SearchResult[] = results || [];
    console.log(`Found ${searchResults.length} results`);

    // Format results for LLM
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

    // Generate LLM summary with conversation history
    console.log('Generating LLM summary');
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a helpful matchmaking assistant. Analyze search results and provide a concise summary.
Include:
1. A brief overview of the results found
2. Key highlights about the matches
3. 2-3 specific refinement suggestions to help narrow or expand the search

When mentioning specific profiles, cite them as [#id] where id is the profile ID.
Keep your response conversational and helpful. If this is a follow-up question in an ongoing conversation, reference the previous context.`,
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

Results (${formattedResults.length} profiles):
${JSON.stringify(formattedResults, null, 2)}

Please provide a summary and refinement suggestions.`,
      },
    ];

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = chatCompletion.choices[0]?.message?.content || 'Unable to generate summary.';

    // Return results
    return NextResponse.json({
      answer,
      results: searchResults,
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
