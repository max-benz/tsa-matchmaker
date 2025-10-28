import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { embed } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

interface EmbeddingsRequest {
  ids?: number[];
}

/**
 * Backfill embeddings for all profiles or specific profile IDs
 * Uses Service Role key for admin access
 */
export async function POST(request: NextRequest) {
  try {
    const body: EmbeddingsRequest = await request.json().catch(() => ({}));
    const { ids } = body;

    const supabase = supabaseAdmin();

    // Build query
    let query = supabase
      .from('singles_form_data')
      .select('id, searchable_text');

    // Filter by specific IDs if provided
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { data: profiles, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch profiles: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: 'No profiles found to update',
      });
    }

    console.log(`Processing ${profiles.length} profiles for embedding generation`);

    let updatedCount = 0;
    const errors: Array<{ id: number; error: string }> = [];

    // Process each profile
    for (const profile of profiles) {
      try {
        if (!profile.searchable_text || profile.searchable_text.trim().length === 0) {
          console.log(`Skipping profile ${profile.id}: empty searchable_text`);
          continue;
        }

        // Generate embedding
        const embedding = await embed(profile.searchable_text);

        // Update profile with embedding
        const { error: updateError } = await supabase
          .from('singles_form_data')
          .update({
            embedding: JSON.stringify(embedding),
            embedding_dirty: false,
            embedding_updated_at: new Date().toISOString(),
            embedding_version: 1,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`Error updating profile ${profile.id}:`, updateError);
          errors.push({ id: profile.id, error: updateError.message });
        } else {
          updatedCount++;
          console.log(`Updated embedding for profile ${profile.id}`);
        }

        // Add a small delay to avoid rate limiting
        if (updatedCount % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing profile ${profile.id}:`, error);
        errors.push({
          id: profile.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const response: any = {
      updated: updatedCount,
      total: profiles.length,
      message: `Successfully updated ${updatedCount} out of ${profiles.length} profiles`,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in embeddings endpoint:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while processing embeddings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
