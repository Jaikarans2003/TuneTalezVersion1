'use client';

import { BackgroundMusic } from '@/firebase/backgroundMusicService';

// Interface for audio segments with timing information
export interface AudioSegment {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  url: string;   // URL to the audio file
  type: 'narration' | 'background'; // Type of audio
  volume: number; // Volume level (0-1)
}

// Interface for paragraph timing information
export interface ParagraphTiming {
  index: number;
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  text: string;
  mood?: string;
}

// Interface for audio stitching options
export interface AudioStitchingOptions {
  backgroundVolume?: number; // Volume level for background music (0-1), default 0.3
  crossfadeDuration?: number; // Duration of crossfade between music tracks in seconds, default 3
  fadeInDuration?: number; // Duration of fade in at the start in seconds, default 2
  fadeOutDuration?: number; // Duration of fade out at the end in seconds, default 3
}

// Default options
const DEFAULT_OPTIONS: AudioStitchingOptions = {
  backgroundVolume: 0.3,
  crossfadeDuration: 3,
  fadeInDuration: 2,
  fadeOutDuration: 3
};

/**
 * Fetches an audio file and decodes it into an AudioBuffer
 * @param source URL or Blob of the audio file
 * @param audioContext AudioContext to use for decoding
 * @returns Promise resolving to the decoded AudioBuffer
 */
export const fetchAndDecodeAudio = async (
  source: string | Blob, 
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  try {
    let arrayBuffer: ArrayBuffer;
    
    if (typeof source === 'string') {
      // Handle URL (string) source
      console.log(`Fetching audio from URL: ${source}`);
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      // Handle Blob source directly
      console.log(`Processing audio from Blob, size: ${source.size} bytes, type: ${source.type}`);
      arrayBuffer = await source.arrayBuffer();
    }
    
    console.log(`Audio data prepared, size: ${arrayBuffer.byteLength} bytes`);
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log(`Audio decoded successfully, duration: ${audioBuffer.duration} seconds, channels: ${audioBuffer.numberOfChannels}`);
    
    return audioBuffer;
  } catch (error) {
    console.error(`Error processing audio:`, error);
    throw error;
  }
};

/**
 * Mixes narration and background music into a single audio file
 * @param narrationSource URL or Blob of the narration audio
 * @param backgroundMusicSource URL or Blob of the background music
 * @param options Audio stitching options
 * @returns Promise resolving to a Blob containing the mixed audio
 */
export const stitchAudioWithBackground = async (
  narrationSource: string | Blob, 
  backgroundMusicSource: string | Blob,
  options: AudioStitchingOptions = DEFAULT_OPTIONS
): Promise<Blob> => {
  try {
    // Log the audio sources
    console.log('Stitching audio with background music', { 
      narrationSource: typeof narrationSource === 'string' 
        ? narrationSource 
        : `Blob (${narrationSource.size} bytes)`,
      backgroundMusicSource: typeof backgroundMusicSource === 'string'
        ? backgroundMusicSource
        : `Blob (${backgroundMusicSource.size} bytes)`,
      options 
    });
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Fetch and decode both audio files
    console.log('Fetching and decoding narration audio...');
    const narrationBuffer = await fetchAndDecodeAudio(narrationSource, audioContext);
    
    console.log('Fetching and decoding background music...');
    const backgroundBuffer = await fetchAndDecodeAudio(backgroundMusicSource, audioContext);
    
    // Get the duration of the narration
    const narrationDuration = narrationBuffer.duration;
    console.log('Narration duration:', narrationDuration);
    
    // Create an offline audio context with the same duration as the narration
    const offlineContext = new OfflineAudioContext({
      numberOfChannels: 2,
      length: audioContext.sampleRate * narrationDuration,
      sampleRate: audioContext.sampleRate
    });
    
    // Create audio buffer sources
    const narrationSourceNode = offlineContext.createBufferSource();
    narrationSourceNode.buffer = narrationBuffer;
    
    const backgroundSourceNode = offlineContext.createBufferSource();
    backgroundSourceNode.buffer = backgroundBuffer;
    backgroundSourceNode.loop = true; // Loop the background music if it's shorter than the narration
    
    // Create gain nodes for volume control
    const narrationGain = offlineContext.createGain();
    narrationGain.gain.value = 0.9; // Slightly reduced narration volume (from 1.0 to 0.9) to make background more audible
    
    const backgroundGain = offlineContext.createGain();
    // Ensure background volume is at least 0.3 for audibility
    const bgVolume = Math.max(0.3, options.backgroundVolume || DEFAULT_OPTIONS.backgroundVolume!);
    backgroundGain.gain.value = bgVolume;
    
    // Apply fade-in to background music
    const fadeInDuration = options.fadeInDuration || DEFAULT_OPTIONS.fadeInDuration!;
    backgroundGain.gain.setValueAtTime(0, 0);
    backgroundGain.gain.linearRampToValueAtTime(
      bgVolume, // Use the bgVolume variable for consistency
      fadeInDuration
    );
    
    // Apply fade-out to background music at the end
    const fadeOutDuration = options.fadeOutDuration || DEFAULT_OPTIONS.fadeOutDuration!;
    backgroundGain.gain.setValueAtTime(
      bgVolume, // Use the bgVolume variable for consistency
      narrationDuration - fadeOutDuration
    );
    backgroundGain.gain.linearRampToValueAtTime(0, narrationDuration);
    
    // Connect the nodes
    narrationSourceNode.connect(narrationGain);
    backgroundSourceNode.connect(backgroundGain);
    
    narrationGain.connect(offlineContext.destination);
    backgroundGain.connect(offlineContext.destination);
    
    // Log audio parameters for debugging
    console.log('Audio mixing parameters:', {
      narrationDuration: narrationBuffer.duration,
      backgroundDuration: backgroundBuffer.duration,
      narrationChannels: narrationBuffer.numberOfChannels,
      backgroundChannels: backgroundBuffer.numberOfChannels,
      narrationVolume: narrationGain.gain.value,
      backgroundVolume: backgroundGain.gain.value,
      fadeInDuration,
      fadeOutDuration
    });
    
    // Start the sources
    narrationSourceNode.start(0);
    backgroundSourceNode.start(0);
    
    // Render the audio
    console.log('Rendering audio...');
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert the rendered buffer to a WAV file
    console.log('Converting to WAV...');
    const wavBlob = await audioBufferToWav(renderedBuffer);
    
    return wavBlob;
  } catch (error) {
    console.error('Error stitching audio:', error);
    throw error;
  }
};

/**
 * Stitches narration with multiple background music tracks based on paragraph moods
 * @param narrationSource URL or Blob of the narration audio
 * @param paragraphTimings Array of paragraph timing information
 * @param backgroundMusicByParagraph Array of background music URLs for each paragraph
 * @param options Audio stitching options
 * @returns Promise resolving to a Blob containing the mixed audio
 */
export const stitchAudioWithMultipleBackgrounds = async (
  narrationSource: string | Blob,
  paragraphTimings: ParagraphTiming[],
  backgroundMusicByParagraph: BackgroundMusic[],
  options: AudioStitchingOptions = DEFAULT_OPTIONS
): Promise<Blob> => {
  try {
    // Log the audio source
    console.log('Stitching audio with multiple background tracks', { 
      narrationSource: typeof narrationSource === 'string' 
        ? narrationSource 
        : `Blob (${narrationSource.size} bytes)`,
      paragraphCount: paragraphTimings.length,
      musicCount: backgroundMusicByParagraph.length,
      options 
    });
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Fetch and decode narration
    console.log('Fetching and decoding narration audio...');
    const narrationBuffer = await fetchAndDecodeAudio(narrationSource, audioContext);
    
    // Get the duration of the narration
    const narrationDuration = narrationBuffer.duration;
    console.log('Narration duration:', narrationDuration);
    
    // Create an offline audio context with the same duration as the narration
    const offlineContext = new OfflineAudioContext({
      numberOfChannels: 2,
      length: audioContext.sampleRate * narrationDuration,
      sampleRate: audioContext.sampleRate
    });
    
    // Create audio buffer source for narration
    const narrationSourceNode = offlineContext.createBufferSource();
    narrationSourceNode.buffer = narrationBuffer;
    
    // Create gain node for narration
    const narrationGain = offlineContext.createGain();
    narrationGain.gain.value = 0.9; // Slightly reduced narration volume (from 1.0 to 0.9) to make background more audible
    
    // Connect narration nodes
    narrationSourceNode.connect(narrationGain);
    narrationGain.connect(offlineContext.destination);
    
    // Start narration
    narrationSourceNode.start(0);
    
    // Process each paragraph and its background music
    const backgroundSources: AudioBufferSourceNode[] = [];
    const backgroundGains: GainNode[] = [];
    
    // Fetch and decode all background music tracks
    console.log('Fetching and decoding background music tracks...');
    const backgroundBuffers: AudioBuffer[] = [];
    
    for (const music of backgroundMusicByParagraph) {
      try {
        const buffer = await fetchAndDecodeAudio(music.url, audioContext);
        backgroundBuffers.push(buffer);
      } catch (error) {
        console.error(`Error loading background music ${music.filename}:`, error);
        // Push a silent buffer as fallback
        const silentBuffer = offlineContext.createBuffer(
          2, // stereo
          audioContext.sampleRate * 10, // 10 seconds of silence
          audioContext.sampleRate
        );
        backgroundBuffers.push(silentBuffer);
      }
    }
    
    // Create and connect background sources
    for (let i = 0; i < paragraphTimings.length; i++) {
      const paragraph = paragraphTimings[i];
      const nextParagraph = paragraphTimings[i + 1];
      // Ensure we use the correct background music for this paragraph
      const backgroundBuffer = backgroundBuffers[i];
      console.log(`Using background music ${i} for paragraph ${i} with mood: ${paragraph.mood || 'unknown'}`);
      
      // Create source and gain nodes
      const source = offlineContext.createBufferSource();
      source.buffer = backgroundBuffer;
      source.loop = true; // Loop if needed
      
      const gain = offlineContext.createGain();
      gain.gain.value = 0; // Start at zero volume
      
      // Connect nodes
      source.connect(gain);
      gain.connect(offlineContext.destination);
      
      // Calculate timing
      const start = paragraph.start;
      const end = nextParagraph ? nextParagraph.start : narrationDuration;
      const crossfadeDuration = options.crossfadeDuration || DEFAULT_OPTIONS.crossfadeDuration!;
      
      // Set volume automation
      // Fade in
      gain.gain.setValueAtTime(0, start);
      // Ensure background volume is at least 0.3 for audibility
      const bgVolume = Math.max(0.3, options.backgroundVolume || DEFAULT_OPTIONS.backgroundVolume!);
      gain.gain.linearRampToValueAtTime(
        bgVolume,
        start + Math.min(crossfadeDuration, (end - start) / 2)
      );
      
      // Fade out
      if (nextParagraph) {
        gain.gain.setValueAtTime(
          bgVolume, // Use the same bgVolume variable for consistency
          end - crossfadeDuration
        );
        gain.gain.linearRampToValueAtTime(0, end);
      } else {
        // Last paragraph, fade out at the end
        gain.gain.setValueAtTime(
          bgVolume, // Use the same bgVolume variable for consistency
          end - (options.fadeOutDuration || DEFAULT_OPTIONS.fadeOutDuration!)
        );
        gain.gain.linearRampToValueAtTime(0, end);
      }
      
      // Start the source
      source.start(start);
      source.stop(end);
      
      // Store references
      backgroundSources.push(source);
      backgroundGains.push(gain);
    }
    
    // Render the audio
    console.log('Rendering audio with multiple background tracks...');
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert the rendered buffer to a WAV file
    console.log('Converting to WAV...');
    const wavBlob = await audioBufferToWav(renderedBuffer);
    
    return wavBlob;
  } catch (error) {
    console.error('Error stitching audio with multiple backgrounds:', error);
    throw error;
  }
};

/**
 * Converts an AudioBuffer to a WAV file Blob
 * @param buffer AudioBuffer to convert
 * @returns Blob containing the WAV file
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length
  view.setUint32(4, bufferLength - 8, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw)
  view.setUint16(20, format, true);
  // Channel count
  view.setUint16(22, numberOfChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * blockAlign, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitDepth, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, dataLength, true);
  
  // Write the PCM samples
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // Clamp the sample to [-1.0, 1.0] and convert to 16-bit PCM
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, value, true);
      offset += 2;
    }
  }
  
  return new Blob([view], { type: 'audio/wav' });
};

/**
 * Helper function to write a string to a DataView
 */
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Estimates paragraph timings based on word count and speaking rate
 * @param paragraphs Array of paragraph texts
 * @param totalDuration Total duration of the narration in seconds
 * @returns Array of paragraph timing information
 */
export const estimateParagraphTimings = (
  paragraphs: string[],
  totalDuration: number
): ParagraphTiming[] => {
  // Count words in each paragraph
  const wordCounts = paragraphs.map(p => p.split(/\s+/).filter(w => w.length > 0).length);
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
  
  // Calculate timing based on word count proportion
  let currentTime = 0;
  const timings: ParagraphTiming[] = [];
  
  for (let i = 0; i < paragraphs.length; i++) {
    const start = currentTime;
    const duration = totalWords > 0 ? (wordCounts[i] / totalWords) * totalDuration : 0;
    const end = start + duration;
    
    timings.push({
      index: i,
      start,
      end,
      text: paragraphs[i]
    });
    
    currentTime = end;
  }
  
  return timings;
};