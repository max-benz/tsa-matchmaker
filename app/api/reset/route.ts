import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Reset endpoint for clearing conversation state
 * Since the application is stateless, this simply returns a success message
 */
export async function POST() {
  return NextResponse.json({
    message: 'Conversation cleared. New search started.',
  });
}
