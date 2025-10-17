import { NextRequest, NextResponse } from 'next/server';
import { extractParagraphMetadata, generateTTSAudio, fetchBackgroundMusic, uploadAudioToFirebase } from '@/utils/nodeAudioNarrationService';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, existsSync } from 'fs';

/**
 * API endpoint for generating narration for a single paragraph with background music
 * 
 * POST /api/narration/paragraph
 * Body: {
 *   text: string;      // The paragraph text to narrate
 *   bookId: string;    // The book ID for storage path
 *   paragraphIndex: number; // The index of the paragraph (0-based)
 *   options?: {        // Optional narration options
 *     voice?: string;  // Voice to use for TTS (default: 'alloy')
 *     backgroundMusicVolume?: number; // Volume level for background music (0-1)
 *     fadeInDuration?: number;        // Duration of fade in at start in seconds
 *     fadeOutDuration?: number;       // Duration of fade out at end in seconds
 *   }
 * }
 * 
 * Returns: { 
 *   url: string,       // The Firebase Storage download URL
 *   metadata: {        // The metadata for the paragraph
 *     mood: string,
 *     genre: string,
 *     intensity: number
 *   }
 * }
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

    const paragraphIndex = body.paragraphIndex || 0;
    
    // Create a temporary directory for processing
    const tempDir = join(tmpdir(), `paragraph_narration_${Date.now()}`);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    // Extract metadata for the paragraph
    const paragraphMetadata = await extractParagraphMetadata([body.text]);
    
    // Ensure we have valid metadata
    if (!paragraphMetadata || !paragraphMetadata.length) {
      throw new Error('Failed to extract paragraph metadata');
    }
    
    const metadata = paragraphMetadata[0];
    
    // Ensure all required fields exist
    if (!metadata.mood) metadata.mood = 'neutral';
    if (!metadata.genre) metadata.genre = 'general';
    if (!metadata.intensity) metadata.intensity = 5;
    
    console.log(`Processing paragraph with mood: ${metadata.mood}, genre: ${metadata.genre}, intensity: ${metadata.intensity}`);
    
    // Generate TTS audio for this paragraph
    const narrationPath = join(tempDir, `narration.mp3`);
    const ttsOptions = body.options || {};
    await generateTTSAudio(body.text, narrationPath, ttsOptions);
    
    // Fetch background music based on mood and intensity
    console.log(`Starting background music fetch for paragraph with mood: ${metadata.mood}`);
    const backgroundMusicPath = join(tempDir, `background.mp3`);
    try {
      await fetchBackgroundMusic(metadata.mood, backgroundMusicPath, metadata.intensity);
      console.log(`Successfully fetched background music for mood: ${metadata.mood}`);
    } catch (musicError: any) {
      console.error(`Error fetching background music for mood ${metadata.mood}:`, musicError.message);
      throw new Error(`Failed to fetch background music: ${musicError.message}`);
    }
    
    // Mix narration with background music
    const mixedPath = join(tempDir, `mixed.mp3`);
    const mixOptions = body.options || {};
    await mixAudioWithBackground(narrationPath, backgroundMusicPath, mixedPath, mixOptions);
    
    // Upload final audio to Firebase Storage
    const timestamp = Date.now();
    const storagePath = `audio-narrations/books/${body.bookId}/paragraphs/${paragraphIndex}_${timestamp}.mp3`;
    const downloadURL = await uploadAudioToFirebase(mixedPath, storagePath);
    
    // Return the download URL and metadata
    return NextResponse.json({ 
      url: downloadURL,
      metadata: {
        mood: metadata.mood,
        genre: metadata.genre,
        intensity: metadata.intensity
      }
    });
  } catch (error: any) {
    console.error('Error in paragraph narration API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate paragraph narration' },
      { status: 500 }
    );
  }
}
function mixAudioWithBackground(narrationPath: string, backgroundMusicPath: string, mixedPath: string, mixOptions: any) {
  throw new Error('Function not implemented.');
}

