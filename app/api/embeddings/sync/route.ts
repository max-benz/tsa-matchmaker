import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { embed } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

interface SyncRequest {
  limit?: number;
}

/**
 * Sync embeddings for profiles marked as dirty
 * Uses Service Role key for admin access
 * This endpoint can be called by Vercel Cron or manually via "Sync Now" button
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json().catch(() => ({}));
    const limit = body.limit || 50;

    const supabase = supabaseAdmin();

    // Fetch profiles marked as dirty
    const { data: profiles, error: fetchError } = await supabase
      .from('singles_form_data')
      .select('id, searchable_text')
      .eq('embedding_dirty', true)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching dirty profiles:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch profiles: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: 'No dirty profiles found. All embeddings are up to date.',
      });
    }

    console.log(`Processing ${profiles.length} dirty profiles for embedding sync`);

    let updatedCount = 0;
    const errors: Array<{ id: number; error: string }> = [];

    // Process each dirty profile
    for (const profile of profiles) {
      try {
        if (!profile.searchable_text || profile.searchable_text.trim().length === 0) {
          console.log(`Skipping profile ${profile.id}: empty searchable_text`);
          // Still mark it as not dirty since there's nothing to embed
          await supabase
            .from('singles_form_data')
            .update({
              embedding_dirty: false,
              embedding_updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
          continue;
        }

        // Generate embedding
        const embedding = await embed(profile.searchable_text);

        // Update profile with new embedding
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
          console.log(`Synced embedding for profile ${profile.id}`);
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
      checked: profiles.length,
      message: `Successfully synced ${updatedCount} out of ${profiles.length} dirty profiles`,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in embeddings sync endpoint:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while syncing embeddings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
