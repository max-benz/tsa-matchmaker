import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get full profile details for a single person
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = parseInt(params.id);

    if (isNaN(profileId)) {
      return NextResponse.json(
        { error: 'Invalid profile ID' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    const { data: profile, error } = await supabase
      .from('singles_form_data')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json(
        { error: `Failed to fetch profile: ${error.message}` },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get all images for this profile
    const { data: images } = await supabase
      .from('singles_form_images')
      .select('*')
      .eq('singles_form_data_id', profileId)
      .order('is_primary', { ascending: false })
      .order('image_order', { ascending: true });

    return NextResponse.json({
      profile,
      images: images || [],
    });
  } catch (error) {
    console.error('Error in profile endpoint:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while fetching the profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
