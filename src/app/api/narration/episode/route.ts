// Fresh file without any next-auth imports
import { NextRequest, NextResponse } from 'next/server';
import { generateNarrationWithBackgroundMusic } from '@/utils/nodeAudioNarrationService';

export async function POST(req: NextRequest) {
  try {
    // Authentication check is removed for now
    
    // Parse request body
    const body = await req.json();
    const { text, bookId, chapterId, episodeNumber, options } = body;

    if (!text || !bookId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Set up narration options with episode-specific settings
    const narrationOptions = {
      voice: options?.voice || 'alloy',
      backgroundMusicVolume: options?.backgroundMusicVolume || 0.2,
      crossfadeDuration: 0, // No crossfade between paragraphs
      fadeInDuration: 0, // No fade in
      fadeOutDuration: 0, // No fade out
      narrationDelay: 0, // No delay
      paragraphSilence: 0, // No silence between paragraphs
      episodeBreaks: [], // No breaks within a single episode
      ...options
    };

    console.log(`Processing episode narration request for book ${bookId}, episode ${episodeNumber || 'unknown'}`);
    console.log(`Text length: ${text.length} characters, options:`, narrationOptions);

    // Generate narration with our enhanced service
    const result = await generateNarrationWithBackgroundMusic(
      text,
      bookId,
      narrationOptions
    );

    console.log(`Narration generated successfully with ${result.paragraphUrls.length} paragraph URLs`);
    
    // Return the result with all paragraph URLs and episode data
    return NextResponse.json({
      paragraphUrls: result.paragraphUrls,
      episodes: result.episodes
    });
  } catch (error: any) {
    console.error('Error generating episode narration:', error);
    return NextResponse.json(
      { error: `Failed to generate narration: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
