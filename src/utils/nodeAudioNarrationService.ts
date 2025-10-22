/**
 * Node.js Audio Narration Service
 * 
 * This service handles the complete audio narration pipeline:
 * 1. Split text into paragraphs
 * 2. Extract metadata for each paragraph
 * 3. Generate TTS audio for each paragraph
 * 4. Select appropriate background music based on mood
 * 5. Mix narration with background music
 * 6. Apply crossfades between segments with different moods
 * 7. Stitch all segments together
 * 8. Upload final audio to Firebase Storage
 */

import { createWriteStream, createReadStream, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import ffmpegImport from 'fluent-ffmpeg';
import fetch from 'node-fetch';
import { pipeline } from 'stream';
import { uploadFileToR2, getFileUrlFromR2 } from '../r2/services';

// Configure ffmpeg with error handling
let ffmpeg = ffmpegImport;
let ffmpegAvailable = true;

// Check if ffmpeg is available
try {
  // Test ffmpeg availability
  ffmpegImport.getAvailableFormats(function(err, formats) {
    if (err) {
      console.error('FFmpeg not available:', err);
      ffmpegAvailable = false;
    } else {
      console.log('FFmpeg is available with formats:', Object.keys(formats || {}).length);
    }
  });
} catch (error) {
  console.error('Error initializing FFmpeg:', error);
  ffmpegAvailable = false;
}

// Promisify the stream pipeline
const streamPipeline = promisify(pipeline);

/**
 * Helper function to ensure a directory exists
 * @param outputPath Path that needs its directory to exist
 */
function ensureDirectoryExists(outputPath: string): void {
  try {
    // Handle both forward and backward slashes
    const lastSlashIndex = Math.max(
      outputPath.lastIndexOf('/'), 
      outputPath.lastIndexOf('\\')
    );
    
    if (lastSlashIndex === -1) {
      console.log(`No directory part in path: ${outputPath}, using current directory`);
      // No directory part, file is in current directory
      return;
    }
    
    const dir = outputPath.substring(0, lastSlashIndex);
    console.log(`Ensuring directory exists: ${dir}`);
    
    if (!existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      mkdirSync(dir, { recursive: true });
      console.log(`Directory created successfully: ${dir}`);
    } else {
      console.log(`Directory already exists: ${dir}`);
    }
    
    // Verify the directory was created
    if (!existsSync(dir)) {
      throw new Error(`Failed to create directory: ${dir}`);
    }
  } catch (dirErr) {
    console.error(`Error creating directory for ${outputPath}:`, dirErr);
    
    // Try a different approach
    try {
      const path = require('path');
      const dir = path.dirname(outputPath);
      console.log(`Trying alternative approach with path.dirname: ${dir}`);
      
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`Directory created successfully with alternative approach: ${dir}`);
      }
    } catch (altErr) {
      console.error(`Alternative directory creation failed:`, altErr);
      throw new Error(`Cannot create directory for ${outputPath}: ${altErr instanceof Error ? altErr.message : String(altErr)}`);
    }
  }
}

/**
 * Interface for paragraph metadata
 */
interface ParagraphMetadata {
  mood: string;
  genre: string;
  intensity: number;
  character?: string;
  emotion?: string;
  setting?: string;
}

/**
 * Interface for narration options
 */
interface NarrationOptions {
  voice?: string;
  backgroundMusicVolume?: number;
  crossfadeDuration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  narrationDelay?: number;  // Delay in seconds before narration starts
  paragraphSilence?: number; // Silence in seconds between paragraphs
  episodeBreaks?: number[]; // Indices where episodes break
}

/**
 * Interface for episode metadata
 */
interface EpisodeMetadata {
  episodeNumber: number;
  title?: string;
  mood?: string;
  genre?: string;
  intensity?: number;
}

/**
 * Interface for episode audio data
 */
interface EpisodeAudio {
  episodeNumber: number;
  paragraphUrls: string[];
  metadata?: EpisodeMetadata;
}

// Default options
const DEFAULT_OPTIONS: NarrationOptions = {
  voice: 'alloy',
  backgroundMusicVolume: 0.2, // 30% of original volume
  crossfadeDuration: 0,       // 2 seconds crossfade between different moods
  fadeInDuration: 0,          // No fade in at start
  fadeOutDuration: 0,         // No fade out at end
  narrationDelay: 0,          // No delay before narration starts
  paragraphSilence: 3,         // 5 seconds silence between paragraphs
};

/**
 * Extracts metadata for each paragraph in the text
 * @param paragraphs Array of paragraph texts
 * @returns Promise resolving to array of paragraph metadata
 */
export async function extractParagraphMetadata(paragraphs: string[]): Promise<ParagraphMetadata[]> {
  // In a real implementation, this would use NLP or AI to extract mood, genre, etc.
  // For this example, we'll return dummy data
  return paragraphs.map((paragraph, index) => {
    // Alternate between happy and sad moods for demonstration
    const mood = index % 2 === 0 ? 'Happy' : 'Calm';
    return {
      mood,
      genre: 'Fiction',
      intensity: 0.7,
    };
  });
}

/**
 * Extracts metadata for an episode based on its paragraphs
 * @param paragraphs Array of paragraph texts in the episode
 * @param paragraphMetadata Array of metadata for each paragraph
 * @param episodeNumber The episode number
 * @returns Episode metadata
 */
export async function extractEpisodeMetadata(
  paragraphs: string[], 
  paragraphMetadata: ParagraphMetadata[],
  episodeNumber: number
): Promise<EpisodeMetadata> {
  // In a real implementation, this would analyze all paragraphs to determine the overall mood/genre
  // For this example, we'll use the most common mood and genre
  
  // Count occurrences of each mood and genre
  const moodCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  let totalIntensity = 0;
  
  paragraphMetadata.forEach(metadata => {
    // Count moods
    if (metadata.mood) {
      moodCounts[metadata.mood] = (moodCounts[metadata.mood] || 0) + 1;
    }
    
    // Count genres
    if (metadata.genre) {
      genreCounts[metadata.genre] = (genreCounts[metadata.genre] || 0) + 1;
    }
    
    // Sum intensities
    totalIntensity += metadata.intensity || 0;
  });
  
  // Find the most common mood
  let dominantMood = 'Neutral';
  let maxMoodCount = 0;
  for (const mood in moodCounts) {
    if (moodCounts[mood] > maxMoodCount) {
      maxMoodCount = moodCounts[mood];
      dominantMood = mood;
    }
  }
  
  // Find the most common genre
  let dominantGenre = 'Fiction';
  let maxGenreCount = 0;
  for (const genre in genreCounts) {
    if (genreCounts[genre] > maxGenreCount) {
      maxGenreCount = genreCounts[genre];
      dominantGenre = genre;
    }
  }
  
  // Calculate average intensity
  const averageIntensity = paragraphMetadata.length > 0 ? 
    totalIntensity / paragraphMetadata.length : 0.5;
  
  // Generate a title based on the first paragraph or a default
  const title = paragraphs.length > 0 ? 
    `Episode ${episodeNumber}: ${paragraphs[0].substring(0, 20)}...` : 
    `Episode ${episodeNumber}`;
  
  return {
    episodeNumber,
    title,
    mood: dominantMood,
    genre: dominantGenre,
    intensity: averageIntensity
  };
}

/**
 * Generates TTS audio for a paragraph
 * @param text Text to convert to speech
 * @param outputPath Path to save the audio file
 * @param options Narration options
 * @returns Promise resolving to the path of the generated audio file
 */
export async function generateTTSAudio(
  text: string,
  outputPath: string,
  options: NarrationOptions = DEFAULT_OPTIONS
): Promise<string> {
  try {
    console.log(`Generating TTS audio for text: "${text.substring(0, 50)}..."`);
    
    // Ensure directory exists using our helper function
    ensureDirectoryExists(outputPath);
    
    // Check if ffmpeg is available
    if (!ffmpegAvailable) {
      console.warn('FFmpeg not available, using fallback audio generation');
      return await generateFallbackAudio(text, outputPath);
    }
    
    // In a real implementation, this would call OpenAI's TTS API
    // For this example, we'll use a simple ffmpeg command to generate a tone
    
    // Generate a tone with varying pitch based on text length to simulate different narrations
    const pitch = 100 + (text.length % 10) * 50; // Vary pitch between 100-550Hz
    const duration = 2 + (text.length / 100); // Vary duration based on text length
    
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input('anullsrc')
          .inputOptions('-f', 'lavfi')
          .audioFilters(`aevalsrc=sin(${pitch}*2*PI*t):s=44100:d=${duration}`)
          .outputOptions('-f', 'mp3')
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log(`FFmpeg command: ${commandLine}`);
          })
          .on('end', () => {
            console.log(`Generated TTS audio: ${outputPath} (${duration}s)`);
            resolve();
          })
          .on('error', (err) => {
            console.error('Error generating TTS audio:', err);
            reject(err);
          })
          .run();
      });
      
      return outputPath;
    } catch (ffmpegError) {
      console.error('FFmpeg error in generateTTSAudio:', ffmpegError);
      console.log('Falling back to alternative audio generation');
      return await generateFallbackAudio(text, outputPath);
    }
  } catch (error) {
    console.error('Error in generateTTSAudio:', error);
    throw error;
  }
}

/**
 * Generates a fallback audio file when ffmpeg is not available
 * @param text Text to convert to speech
 * @param outputPath Path to save the audio file
 * @returns Promise resolving to the path of the generated audio file
 */
async function generateFallbackAudio(text: string, outputPath: string): Promise<string> {
  console.log('Using fallback audio generation method');
  
  try {
    // Create a simple silent MP3 file using Node.js
    const fs = require('fs');
    
    // Create a buffer with MP3 header data for a short silent audio
    // This is a very basic MP3 header for a silent audio file
    const silentMp3Header = Buffer.from([
      0xFF, 0xFB, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    // Write the buffer to the output file
    fs.writeFileSync(outputPath, silentMp3Header);
    
    console.log(`Generated fallback silent audio at: ${outputPath}`);
    return outputPath;
  } catch (fallbackError) {
    console.error('Error in fallback audio generation:', fallbackError);
    throw new Error(`Failed to generate fallback audio: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
  }
}

/**
 * Fetches background music based on mood
 * @param mood Mood of the paragraph
 * @param outputPath Path to save the music file
 * @param intensity Intensity of the mood (0-1)
 * @returns Promise resolving to the path of the music file
 */
export async function fetchBackgroundMusic(
  mood: string,
  outputPath: string,
  intensity: number = 0.5
): Promise<string> {
  try {
    console.log(`Fetching background music for mood: ${mood}, intensity: ${intensity}`);
    
    // Ensure directory exists using our helper function
    ensureDirectoryExists(outputPath);
    
    // Check if ffmpeg is available
    if (!ffmpegAvailable) {
      console.warn('FFmpeg not available, using fallback background music generation');
      return await generateFallbackBackgroundMusic(mood, outputPath, intensity);
    }
    
    // In a real implementation, this would fetch from a music library or API
    // For this example, we'll generate a simple tone with different frequency based on mood
    
    const frequency = mood === 'Happy' ? 220 : 165; // A3 for happy, E3 for sad/calm
    const duration = 30; // 30 seconds of background music
    
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input('anullsrc')
          .inputOptions('-f', 'lavfi')
          .audioFilters(`aevalsrc=sin(${frequency}*2*PI*t):s=44100:d=${duration}`)
          .outputOptions('-f', 'mp3')
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log(`FFmpeg background music command: ${commandLine}`);
          })
          .on('end', () => {
            console.log(`Generated background music: ${outputPath} (${duration}s)`);
            resolve();
          })
          .on('error', (err) => {
            console.error('Error generating background music:', err);
            reject(err);
          })
          .run();
      });
      
      return outputPath;
    } catch (ffmpegError) {
      console.error('FFmpeg error in fetchBackgroundMusic:', ffmpegError);
      console.log('Falling back to alternative background music generation');
      return await generateFallbackBackgroundMusic(mood, outputPath, intensity);
    }
  } catch (error) {
    console.error('Error in fetchBackgroundMusic:', error);
    throw error;
  }
}

/**
 * Generates a fallback background music file when ffmpeg is not available
 * @param mood Mood of the background music
 * @param outputPath Path to save the music file
 * @param intensity Intensity of the mood
 * @returns Promise resolving to the path of the generated music file
 */
async function generateFallbackBackgroundMusic(
  mood: string,
  outputPath: string,
  intensity: number = 0.5
): Promise<string> {
  console.log('Using fallback background music generation method');
  
  try {
    // Create a simple silent MP3 file using Node.js
    const fs = require('fs');
    
    // Create a buffer with MP3 header data for a short silent audio
    // This is a very basic MP3 header for a silent audio file
    const silentMp3Header = Buffer.from([
      0xFF, 0xFB, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    // Write the buffer to the output file
    fs.writeFileSync(outputPath, silentMp3Header);
    
    console.log(`Generated fallback silent background music at: ${outputPath} (mood: ${mood}, intensity: ${intensity})`);
    return outputPath;
  } catch (fallbackError) {
    console.error('Error in fallback background music generation:', fallbackError);
    throw new Error(`Failed to generate fallback background music: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
  }
}

/**
 * Process a single paragraph's audio by:
 * 1. Trimming music to exact narration duration
 * 2. Mixing narration with background music with NO fades
 * 
 * @param narrationPath Path to the narration audio file
 * @param backgroundMusicPath Path to the background music file
 * @param outputPath Path to save the processed audio
 * @param options Mixing options
 * @returns Promise resolving to the path of the processed audio
 */
export async function processAudioParagraph(
  narrationPath: string,
  backgroundMusicPath: string,
  outputPath: string,
  options: NarrationOptions = DEFAULT_OPTIONS
): Promise<string> {
  // Check if ffmpeg is available first
  if (!ffmpegAvailable) {
    console.warn('FFmpeg not available, using fallback audio processing');
    return generateFallbackProcessedAudio(narrationPath, backgroundMusicPath, outputPath);
  }
  
  return new Promise((resolve, reject) => {
    console.log(`Processing paragraph audio with NO fades: ${narrationPath}`);
    
    // Ensure directory exists using our helper function
    ensureDirectoryExists(outputPath);
    
    // Only use background music volume
    const bgVolume = options.backgroundMusicVolume || DEFAULT_OPTIONS.backgroundMusicVolume;
    
    // Helper function to clean up temporary files
    function cleanupFiles(files: string[]) {
      files.forEach(file => {
        try {
          if (existsSync(file)) {
            unlinkSync(file);
          }
        } catch (err) {
          console.warn(`Failed to delete temporary file: ${file}`);
        }
      });
    }
    
    // STEP 1: Get narration duration
    ffmpeg.ffprobe(narrationPath, (err, metadata) => {
      if (err) {
        console.error('Error getting narration duration:', err);
        reject(err);
        return;
      }
      
      const narrationDuration = metadata.format.duration || 0;
      console.log(`Narration duration: ${narrationDuration} seconds`);
      
      // STEP 2: Trim background music to exact narration length
      const trimmedMusicPath = join(tmpdir(), `trimmed_music_${Date.now()}.mp3`);
      
      ffmpeg()
        .input(backgroundMusicPath)
        // Strict trim to exact narration duration
        .outputOptions('-t', `${narrationDuration}`)
        .output(trimmedMusicPath)
        .on('end', () => {
          console.log(`Trimmed background music to exactly ${narrationDuration}s`);
          
          // STEP 3: Adjust background music volume
          const volumeAdjustedMusicPath = join(tmpdir(), `volume_adjusted_music_${Date.now()}.mp3`);
          
          ffmpeg()
            .input(trimmedMusicPath)
            // Adjust volume with no fades
            .audioFilters(`volume=${bgVolume}`)
            .output(volumeAdjustedMusicPath)
            .on('end', () => {
              console.log(`Adjusted background music volume to ${bgVolume}`);
              
              // STEP 4: Mix narration and background music with no filters
              const mixedPath = join(tmpdir(), `mixed_${Date.now()}.mp3`);
              
              // Create a temporary WAV file for precise mixing
              const tempWavPath = join(tmpdir(), `temp_mix_${Date.now()}.wav`);
              
              ffmpeg()
                .input(narrationPath)
                .input(volumeAdjustedMusicPath)
                // Simple mixing with no filters, fades, or effects
                .outputOptions('-filter_complex', `amix=inputs=2:duration=first`)
                // Ensure exact duration
                .outputOptions('-t', `${narrationDuration}`)
                .outputOptions('-ar', '44100')
                // Output to WAV for precise timing
                .outputFormat('wav')
                .output(tempWavPath)
                .on('end', () => {
                  console.log(`Created temporary WAV mix`);
                  
                  // Apply hard cut at exact duration
                  ffmpeg()
                    .input(tempWavPath)
                    // Hard cut at exact duration
                    .outputOptions('-ss', '0')
                    .outputOptions('-t', `${narrationDuration}`)
                    .outputOptions('-af', 'apad=pad_len=0')  // Ensure no padding
                    .outputOptions('-ar', '44100')
                    .outputOptions('-b:a', '128k')
                    .output(mixedPath)
                    .on('end', () => {
                      console.log(`Applied hard cut with NO fades`);
                      
                      // STEP 5: Verify and copy to output
                      ffmpeg.ffprobe(mixedPath, (probeErr, mixedMetadata) => {
                        if (!probeErr && mixedMetadata) {
                          const mixedDuration = mixedMetadata.format.duration || 0;
                          console.log(`Final mixed audio duration: ${mixedDuration}s (expected: ${narrationDuration}s)`);
                        }
                        
                        // Copy to output
                        const outputStream = createWriteStream(outputPath);
                        const inputStream = createReadStream(mixedPath);
                        
                        inputStream.pipe(outputStream);
                        inputStream.on('end', () => {
                          console.log(`Successfully copied mixed audio to output path`);
                          cleanupFiles([trimmedMusicPath, volumeAdjustedMusicPath, mixedPath, tempWavPath]);
                          resolve(outputPath);
                        });
                        
                        inputStream.on('error', (copyErr: Error) => {
                          console.error('Error copying mixed audio:', copyErr);
                          cleanupFiles([trimmedMusicPath, volumeAdjustedMusicPath, mixedPath, tempWavPath]);
                          reject(copyErr);
                        });
                      });
                    })
                    .on('error', (hardCutErr: any) => {
                      console.error('Error applying hard cut:', hardCutErr);
                      cleanupFiles([trimmedMusicPath, volumeAdjustedMusicPath, tempWavPath]);
                      reject(hardCutErr);
                    })
                    .run();
                })
                .on('error', (mixErr: any) => {
                  console.error('Error mixing audio:', mixErr);
                  cleanupFiles([trimmedMusicPath, volumeAdjustedMusicPath]);
                  reject(mixErr);
                })
                .run();
            })
            .on('error', (volumeErr: any) => {
              console.error('Error adjusting background music volume:', volumeErr);
              cleanupFiles([trimmedMusicPath]);
              reject(volumeErr);
            })
            .run();
        })
        .on('error', (trimErr: any) => {
          console.error('Error trimming background music:', trimErr);
          reject(trimErr);
        })
        .run();
    });
  });
}

/**
 * Concatenates audio segments with a pause between each segment
 * @param segments Array of audio segment paths
 * @param outputPath Path to save the concatenated audio
 * @param options Narration options
 * @returns Promise resolving to the path of the concatenated audio
 */
export async function concatenateAudioSegments(
  segments: string[],
  outputPath: string,
  options: NarrationOptions = DEFAULT_OPTIONS
): Promise<string> {
  console.log(`Starting concatenation of ${segments.length} audio segments with pauses`);
  
  if (segments.length === 1) {
    console.log(`Only one segment, copying directly to output`);
    // If there's only one segment, just copy it to the output path
    const inputStream = createReadStream(segments[0]);
    const outputStream = createWriteStream(outputPath);
    
    await new Promise<void>((resolve, reject) => {
      inputStream.pipe(outputStream);
      inputStream.on('end', () => resolve());
      inputStream.on('error', reject);
    });
    
    return outputPath;
  }
  
  // Ensure directory exists using our helper function
  ensureDirectoryExists(outputPath);
  
  try {
    // Create a silence file for the pause between segments
    const silenceDuration = 3; // 3 seconds pause between segments
    const silencePath = join(tmpdir(), `silence_${silenceDuration}s_${Date.now()}.mp3`);
    
    console.log(`Generating ${silenceDuration} second silence file at ${silencePath}`);
    
    // Generate silence file using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('anullsrc')
        .inputOptions('-f', 'lavfi')
        .audioFilters(`aevalsrc=0:d=${silenceDuration}`)
        .outputOptions('-ar', '44100')
        .outputOptions('-ac', '1')
        .outputOptions('-acodec', 'libmp3lame')
        .outputOptions('-q:a', '2')
        .output(silencePath)
        .on('end', () => {
          console.log(`Successfully generated silence file: ${silencePath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error generating silence file:', err);
          reject(err);
        })
        .run();
    });
    
    // STEP 1: Create a single file with all segments concatenated with silence between them
    console.log(`Preparing concatenation with ${silenceDuration}s pauses between segments`);
    
    // Create a concat file for ffmpeg
    const concatFilePath = join(tmpdir(), `concat_with_pauses_${Date.now()}.txt`);
    
    // Create the content for the concat file, interleaving silence between segments
    const concatSegments: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      concatSegments.push(segments[i]);
      if (i < segments.length - 1) {
        concatSegments.push(silencePath); // Add silence after every segment except the last
      }
    }
    
    const concatLines = concatSegments.map(segment => `file '${segment}'`);
    const concatContent = concatLines.join('\n');
    require('fs').writeFileSync(concatFilePath, concatContent);
    
    console.log(`Created concat file with ${concatSegments.length} entries (${segments.length} segments + ${segments.length - 1} silences)`);
    console.log(`Concat file content:\n${concatContent}`);
    
    // STEP 2: Perform the concatenation
    console.log(`Performing concatenation with pauses`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions('-f', 'concat')
        .inputOptions('-safe', '0')
        // Use copy codec for direct concatenation without re-encoding
        .outputOptions('-c', 'copy')
        .output(outputPath)
        .on('end', () => {
          console.log(`Successfully concatenated all segments with pauses to ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('Error concatenating segments:', err);
          reject(err);
        })
        .run();
    });
    
    // Clean up temporary files
    try {
      unlinkSync(concatFilePath);
      unlinkSync(silencePath);
      console.log('Cleaned up temporary files');
    } catch (err) {
      console.warn(`Failed to delete temporary files:`, err);
    }
    
    return outputPath;
  } catch (err) {
    console.error('Error in concatenateAudioSegments:', err);
    throw err;
  }
}

/**
 * Generates a precise silence audio file
 * @param duration Duration of silence in seconds
 * @param outputPath Path to save the silence file
 * @returns Promise resolving to the path of the silence file
 */
async function generateParagraphSilence(duration: number, outputPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    console.log(`Generating precise silence of ${duration} seconds in WAV format`);
    
    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputOptions('-f', 'lavfi')
      .outputFormat('wav')
      .outputOptions('-t', `${duration}`)
      .outputOptions('-acodec', 'pcm_s16le') // Use PCM signed 16-bit for maximum precision
      .audioFrequency(44100)
      .audioChannels(2) // Stereo
      .output(outputPath)
      .on('end', () => {
        console.log(`Generated precise silence file: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error generating silence file:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Uploads audio file to R2 Storage
 * @param filePath Path to the audio file to upload
 * @param storagePath Path in R2 Storage to upload to
 * @returns Promise resolving to the download URL of the uploaded file
 */
export async function uploadAudioToFirebase(filePath: string, storagePath: string): Promise<string> {
  try {
    console.log(`Uploading audio file to R2 Storage: ${filePath} -> ${storagePath}`);
    
    // Read the file
    const fileBuffer = require('fs').readFileSync(filePath);
    
    // Import R2 services
    const { uploadFileToR2 } = await import('@/r2/services');
    
    // Create a Blob from the file buffer
    const fileBlob = new Blob([fileBuffer]);
    
    // Upload to R2
    const downloadURL = await uploadFileToR2(fileBlob, storagePath);
    console.log(`Download URL: ${downloadURL}`);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading audio to R2:', error);
    throw error;
  }
}

/**
 * Generates narration with background music for a book
 * @param text Text to narrate
 * @param bookId ID of the book
 * @param options Narration options
 * @returns Promise resolving to an object containing episode data and paragraph audio URLs
 */
export async function generateNarrationWithBackgroundMusic(
  text: string,
  bookId: string,
  options: NarrationOptions = DEFAULT_OPTIONS
): Promise<{ paragraphUrls: string[], episodes: EpisodeAudio[] }> {
  try {
    console.log(`Starting narration generation for book ${bookId} with SEPARATE FILES AND LONG SILENCES`);
    
    // Create a temporary directory for processing with better error handling
    let tempDir;
    try {
      // Get the system's temporary directory
      const systemTmpDir = tmpdir();
      console.log(`System temporary directory: ${systemTmpDir}`);
      
      // Create a unique subdirectory for this narration
      tempDir = join(systemTmpDir, `narration_${Date.now()}`);
      console.log(`Creating temporary directory at: ${tempDir}`);
      
      // Check if the directory exists and create it if it doesn't
      if (!existsSync(tempDir)) {
        console.log(`Directory doesn't exist, creating it now...`);
        mkdirSync(tempDir, { recursive: true });
        console.log(`Directory created successfully`);
      } else {
        console.log(`Directory already exists`);
      }
      
      // Verify the directory was created
      if (!existsSync(tempDir)) {
        throw new Error(`Failed to create temporary directory at ${tempDir}`);
      }
    } catch (err) {
      console.error(`Error creating temporary directory:`, err);
      
      // Fallback to a directory in the current working directory
      console.log(`Trying fallback directory...`);
      tempDir = join(process.cwd(), 'temp', `narration_${Date.now()}`);
      console.log(`Fallback directory: ${tempDir}`);
      
      // Create the fallback directory
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
        console.log(`Fallback directory created successfully`);
      }
    }
    
    // Step 1: Split text into paragraphs using $ as the primary delimiter
    const paragraphs = text.split(/\$/).filter(p => p.trim().length > 0);
    console.log(`Split text into ${paragraphs.length} paragraphs using $ symbol as delimiter`);
    
    // Fallback to double full stops (..) if no paragraphs found with $
    if (paragraphs.length <= 1 && text.length > 500) {
      console.log(`Only one paragraph found with $ symbol, trying double full stops (..) as fallback`);
      const fallbackParagraphs = text.split(/\.\./).filter(p => p.trim().length > 0);
      if (fallbackParagraphs.length > 1) {
        console.log(`Found ${fallbackParagraphs.length} paragraphs using double full stops (..) as fallback`);
        paragraphs.splice(0, paragraphs.length, ...fallbackParagraphs);
      }
    }
    
    // Step 2: Extract metadata for each paragraph
    const paragraphMetadata = await extractParagraphMetadata(paragraphs);
    console.log(`Extracted metadata for ${paragraphMetadata.length} paragraphs`);
    
    // We'll create completely separate paragraph audio files
    // No need for silence files for concatenation anymore
    const silenceFilePath = ''; // Empty string as we won't use silence files
    
    // Step 4: Process each paragraph as a completely separate file
    console.log(`Starting to process ${paragraphs.length} paragraphs as separate files...`);
    
    // Array to hold all the paragraph audio file paths
    const allFilePaths: string[] = [];
    
    // Process each paragraph as a completely separate audio file
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const metadata = paragraphMetadata[i];
      
      // Skip empty paragraphs
      if (!paragraph.trim()) continue;
      
      console.log(`Processing paragraph ${i+1}/${paragraphs.length} with mood: ${metadata.mood} as a COMPLETELY SEPARATE FILE`);
      
      // Generate TTS audio for this paragraph
      const narrationPath = join(tempDir, `narration_${i+1}.mp3`);
      await generateTTSAudio(paragraph, narrationPath, options);
      
      // Fetch background music based on mood and intensity
      const backgroundMusicPath = join(tempDir, `background_${i+1}.mp3`);
      await fetchBackgroundMusic(metadata.mood, backgroundMusicPath, metadata.intensity);
      
      // Create the final paragraph audio file with a unique name
      const paragraphAudioPath = join(tempDir, `paragraph_${i+1}.mp3`);
      
      // Get narration duration for trimming background music
      const narrationDuration = await new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(narrationPath, (err, metadata) => {
          if (err) {
            console.error('Error getting narration duration:', err);
            reject(err);
            return;
          }
          resolve(metadata.format.duration || 0);
        });
      });
      
      console.log(`Paragraph ${i+1} narration duration: ${narrationDuration} seconds`);
      
      // Trim background music to match narration length
      const trimmedMusicPath = join(tempDir, `trimmed_music_${i+1}.mp3`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(backgroundMusicPath)
          .outputOptions('-t', `${narrationDuration}`)
          .output(trimmedMusicPath)
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });
      
      // Adjust background music volume
      const volumeAdjustedMusicPath = join(tempDir, `volume_adjusted_music_${i+1}.mp3`);
      const bgVolume = options.backgroundMusicVolume || DEFAULT_OPTIONS.backgroundMusicVolume;
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(trimmedMusicPath)
          .audioFilters(`volume=${bgVolume}`)
          .output(volumeAdjustedMusicPath)
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      }); 
      
      // Create a clean paragraph audio file with ABSOLUTELY NO FADING and HARD CUTS
      await new Promise<void>((resolve, reject) => {
        console.log(`Creating paragraph ${i+1} as STANDALONE FILE with ABSOLUTELY NO FADING`);
        
        ffmpeg()
          .input(narrationPath)
          .input(volumeAdjustedMusicPath)
          // Simple filter to mix audio with no fading
          .outputOptions('-filter_complex', `[0:a][1:a]amerge=inputs=2,pan=stereo|c0<c0+c2|c1<c1+c3[aout]`)
          .outputOptions('-map', '[aout]')
          .outputOptions('-ac', '2') // Ensure stereo output
          .outputOptions('-t', `${narrationDuration}`) // Strict duration limit
          .outputOptions('-ar', '44100')
          .outputOptions('-b:a', '128k')
          // Remove all fade filters completely
          .output(paragraphAudioPath)
          .on('end', () => {
            console.log(`Created STANDALONE paragraph ${i+1} audio file with ABSOLUTELY NO FADING`);
            
            // Verify the file exists and has content
            try {
              const stats = require('fs').statSync(paragraphAudioPath);
              console.log(`Paragraph ${i+1} file created: ${paragraphAudioPath}, size: ${stats.size} bytes`);
              
              if (stats.size === 0) {
                console.error(`ERROR: Paragraph ${i+1} file has zero bytes`);
              }
            } catch (err) {
              console.error(`Error verifying paragraph ${i+1} file:`, err);
            }
            
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error creating paragraph ${i+1} audio:`, err);
            reject(err);
          })
          .run();
      });
      
      // Add paragraph audio to the file list
      allFilePaths.push(paragraphAudioPath);
      
      // Clean up intermediate files
      try {
        unlinkSync(narrationPath);
        unlinkSync(backgroundMusicPath);
        unlinkSync(trimmedMusicPath);
        unlinkSync(volumeAdjustedMusicPath);
      } catch (err) {
        console.warn(`Failed to delete some intermediate files: ${err}`);
      }
    }
    
    // Step 5: Upload each paragraph audio file separately
    console.log(`Uploading ${paragraphs.length} separate paragraph audio files to Firebase`);
    
    // Array to store download URLs for each paragraph
    const downloadURLs: string[] = [];
    
    // Get only the paragraph audio files (not silence files)
    const paragraphAudioFiles = allFilePaths.filter(path => path.includes('paragraph_'));
    
    console.log(`Found ${paragraphAudioFiles.length} paragraph audio files to upload`);
    
    // Upload each paragraph audio file individually
    for (let i = 0; i < paragraphAudioFiles.length; i++) {
      const audioPath = paragraphAudioFiles[i];
      
      // Verify file exists and has content
      if (existsSync(audioPath)) {
        const stats = require('fs').statSync(audioPath);
        console.log(`Paragraph ${i+1} audio file: ${audioPath}, Size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          console.error(`ERROR: Paragraph ${i+1} audio file has zero bytes`);
          continue;
        }
        
        // Upload to Firebase with unique name
        const timestamp = Date.now();
        const storagePath = `audio-narrations/books/${bookId}/paragraph_${i+1}_${timestamp}.mp3`;
        
        try {
          console.log(`Uploading paragraph ${i+1} audio to Firebase: ${storagePath}`);
          const url = await uploadAudioToFirebase(audioPath, storagePath);
          downloadURLs.push(url);
          console.log(`Successfully uploaded paragraph ${i+1}, URL: ${url}`);
        } catch (err) {
          console.error(`Error uploading paragraph ${i+1} audio:`, err);
        }
      } else {
        console.error(`ERROR: Paragraph ${i+1} audio file does not exist: ${audioPath}`);
      }
    }
    
    // Clean up temporary files
    try {
      if (existsSync(silenceFilePath)) {
        unlinkSync(silenceFilePath);
      }
      
      // Clean up paragraph audio files
      for (const filePath of allFilePaths) {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.warn(`Failed to delete some temporary files: ${err}`);
    }
    
    console.log(`Completed processing with ${downloadURLs.length} separate paragraph audio files`);
    
    // Organize paragraphs into episodes if episode breaks are provided
    const episodes: EpisodeAudio[] = [];
    
    if (options.episodeBreaks && options.episodeBreaks.length > 0) {
      console.log(`Organizing paragraphs into ${options.episodeBreaks.length + 1} episodes`);
      
      // Sort episode breaks to ensure they're in ascending order
      const sortedBreaks = [...options.episodeBreaks].sort((a, b) => a - b);
      
      // Add a final break at the end
      sortedBreaks.push(downloadURLs.length);
      
      let startIdx = 0;
      for (let i = 0; i < sortedBreaks.length; i++) {
        const endIdx = sortedBreaks[i];
        
        // Get paragraphs and their metadata for this episode
        const episodeParagraphTexts = paragraphs.slice(startIdx, endIdx);
        const episodeParagraphMetadata = paragraphMetadata.slice(startIdx, endIdx);
        const episodeParagraphUrls = downloadURLs.slice(startIdx, endIdx);
        
        if (episodeParagraphUrls.length > 0) {
          // Extract metadata for this episode
          console.log(`Extracting metadata for episode ${i + 1}`);
          const episodeMetadata = await extractEpisodeMetadata(
            episodeParagraphTexts,
            episodeParagraphMetadata,
            i + 1
          );
          
          // Create the episode with metadata
          episodes.push({
            episodeNumber: i + 1,
            paragraphUrls: episodeParagraphUrls,
            metadata: episodeMetadata
          });
          
          console.log(`Episode ${i + 1} contains ${episodeParagraphUrls.length} paragraphs with dominant mood: ${episodeMetadata.mood}`);
        }
        
        startIdx = endIdx;
      }
    } else {
      // If no episode breaks, treat all paragraphs as a single episode
      console.log(`Extracting metadata for single episode`);
      const episodeMetadata = await extractEpisodeMetadata(
        paragraphs,
        paragraphMetadata,
        1
      );
      
      episodes.push({
        episodeNumber: 1,
        paragraphUrls: downloadURLs,
        metadata: episodeMetadata
      });
      
      console.log(`All ${downloadURLs.length} paragraphs organized as a single episode with dominant mood: ${episodeMetadata.mood}`);
    }
    
    return {
      paragraphUrls: downloadURLs,
      episodes: episodes
    };
  } catch (error: any) {
    console.error('Error generating narration with background music:', error);
    throw error;
  }
}

/**
 * Generates a fallback processed audio file when ffmpeg is not available
 * @param narrationPath Path to the narration audio file
 * @param backgroundMusicPath Path to the background music file
 * @param outputPath Path to save the processed audio
 * @returns Promise resolving to the path of the processed audio
 */
async function generateFallbackProcessedAudio(
  narrationPath: string,
  backgroundMusicPath: string,
  outputPath: string
): Promise<string> {
  console.log('Using fallback audio processing method');
  
  try {
    // Since we can't mix audio without ffmpeg, we'll just copy the narration file to the output path
    const fs = require('fs');
    
    // Check if the narration file exists
    if (existsSync(narrationPath)) {
      // Copy the narration file to the output path
      fs.copyFileSync(narrationPath, outputPath);
      console.log(`Copied narration file to output path as fallback: ${outputPath}`);
    } else {
      // If narration file doesn't exist, create a simple silent MP3
      console.log(`Narration file not found, creating silent audio: ${outputPath}`);
      const silentMp3Header = Buffer.from([
        0xFF, 0xFB, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      fs.writeFileSync(outputPath, silentMp3Header);
    }
    
    return outputPath;
  } catch (fallbackError) {
    console.error('Error in fallback audio processing:', fallbackError);
    throw new Error(`Failed to generate fallback processed audio: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
  }
}