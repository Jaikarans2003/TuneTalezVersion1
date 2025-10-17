import { NextRequest, NextResponse } from 'next/server';
import { generateNarrationWithBackgroundMusic } from '@/utils/nodeAudioNarrationService';

/**
 * API endpoint for generating narration with background music
 * 
 * POST /api/narration
 * Body: {
 *   text: string;      // The text to narrate
 *   bookId: string;    // The book ID for storage path
 *   options?: {        // Optional narration options
 *     voice?: string;  // Voice to use for TTS (default: 'alloy')
 *     backgroundMusicVolume?: number; // Volume level for background music (0-1)
 *     crossfadeDuration?: number;     // Duration of crossfade in seconds
 *     fadeInDuration?: number;        // Duration of fade in at start in seconds
 *     fadeOutDuration?: number;       // Duration of fade out at end in seconds
 *   }
 * }
 * 
 * Returns: { url: string } // The Firebase Storage download URL
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    if (!body.bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }
    
    // Generate narration with background music
    const downloadURL = await generateNarrationWithBackgroundMusic(
      body.text,
      body.bookId,
      body.options || {}
    );
    
    // Return the download URL
    return NextResponse.json({ url: downloadURL });
  } catch (error: any) {
    console.error('Error in narration API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate narration' },
      { status: 500 }
    );
  }
}
