'use client';

import { useState, useRef } from 'react';
import { generateAudio, arrayBufferToBlob, extractContentMetadata, ContentMetadata } from '@/services/openai';
import { uploadAudioNarration } from '@/firebase/services';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { 
  getRandomBackgroundMusicForMetadata,
  getRandomBackgroundMusicForParagraphs
} from '@/firebase/backgroundMusicService';
import { 
  stitchAudioWithBackground, 
  stitchAudioWithMultipleBackgrounds, 
  estimateParagraphTimings,
  ParagraphTiming
} from '@/utils/audioStitcher';
// Using stitchAudioWithBackground instead of processAudioWithNodeLibs

interface AudiobookProductionProps {
  text: string;
  bookId?: string;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const AudiobookProduction = ({ 
  text, 
  bookId, 
  onSuccess, 
  onError,
  className = ''
}: AudiobookProductionProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [segments, setSegments] = useState<{text: string, metadata: ContentMetadata}[]>([]);
  const [segmentAudios, setSegmentAudios] = useState<Blob[]>([]);
  const [finalAudio, setFinalAudio] = useState<Blob | null>(null);

  const handleGenerateAudiobook = async () => {
    if (!text.trim()) {
      setError('No text provided for audiobook');
      if (onError) onError(new Error('No text provided for audiobook'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setCurrentStep('segmenting-text');

      // Step 1: Split text into coherent segments (paragraphs) using $ as primary delimiter
      const paragraphs = text.split(/\$/).filter(p => p.trim().length > 0);
      
      // Fallback to double line breaks if no paragraphs found with $
      if (paragraphs.length <= 1 && text.length > 500) {
        console.log('Falling back to double line breaks for paragraph splitting');
        const fallbackParagraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (fallbackParagraphs.length > 1) {
          paragraphs.splice(0, paragraphs.length, ...fallbackParagraphs);
        }
      }
      console.log(`Identified ${paragraphs.length} paragraphs for processing`);
      
      // Step 2: Determine mood for each paragraph using OpenAI
      setCurrentStep('detecting-moods');
      const segmentsWithMetadata: {text: string, metadata: ContentMetadata}[] = [];
      
      // Process each paragraph individually to ensure distinct mood detection
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        console.log(`Analyzing paragraph ${i+1}/${paragraphs.length}...`);
        
        // Extract metadata for this paragraph with OpenAI
        const segmentMetadata = await extractContentMetadata(paragraph);
        console.log(`Paragraph ${i+1} mood detected: ${segmentMetadata.mood}`);
        
        segmentsWithMetadata.push({
          text: paragraph,
          metadata: segmentMetadata
        });
      }
      
      setSegments(segmentsWithMetadata);
      
      // Step 3: Process each paragraph sequentially and build final audio buffer
      setCurrentStep('processing-segments');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create an offline context for the final audio
      // We'll calculate the total duration as we go and resize if needed
      let estimatedTotalDuration = 0;
      const pauseDuration = 7; // Exactly 7-second pause between paragraphs
      
      // Create a new offline context with initial size (we'll render in chunks)
      let offlineContext = new OfflineAudioContext({
        numberOfChannels: 2,
        length: audioContext.sampleRate * 60, // Start with 60 seconds, will resize if needed
        sampleRate: audioContext.sampleRate
      });
      
      // Track our position in the final audio buffer
      let currentTime = 0;
      const processedSegments: Blob[] = [];
      
      console.log('Implementing sequential paragraph processing pipeline');
      
      // Process each paragraph sequentially
      for (let i = 0; i < segmentsWithMetadata.length; i++) {
        const segment = segmentsWithMetadata[i];
        console.log(`Processing paragraph ${i+1}/${segmentsWithMetadata.length}...`);
        console.log(`Paragraph mood: ${segment.metadata.mood}, genre: ${segment.metadata.genre}`);
        
        // STEP 1: Generate TTS narration for this paragraph
        console.log(`STEP 1: Generating TTS narration for paragraph ${i+1}...`);
        const audioBuffer = await generateAudio(segment.text);
        const narrationBlob = arrayBufferToBlob(audioBuffer);
        console.log(`TTS narration generated, size: ${narrationBlob.size} bytes`);
        
        // STEP 2: Add silence from Firebase if not the last paragraph
        console.log(`STEP 2: Adding silence after paragraph ${i+1}...`);
        let narrationWithSilence = narrationBlob;
        
        if (i < segmentsWithMetadata.length - 1) {
          // Fetch the silence MP3 from Firebase
          const silenceUrl = 'https://firebasestorage.googleapis.com/v0/b/tune-tales-7bc34.appspot.com/o/BackgroundMusic%2FSilence.mp3?alt=media';
          
          try {
            // Fetch the silence file
            const silenceResponse = await fetch(silenceUrl);
            const silenceBlob = await silenceResponse.blob();
            console.log(`Silence file fetched, size: ${silenceBlob.size} bytes`);
            
            // Concatenate narration with silence
            narrationWithSilence = await concatenateAudioBlobs([narrationBlob, silenceBlob]);
            console.log(`Added silence to narration, new size: ${narrationWithSilence.size} bytes`);
          } catch (error) {
            console.error('Error fetching silence file:', error);
            // Continue with just the narration if there's an error
            console.log('Continuing with narration without silence');
          }
        }
        
        // STEP 3: Select background music based on paragraph's mood
        console.log(`STEP 3: Selecting background music for paragraph ${i+1} with mood: ${segment.metadata.mood}`);
        const backgroundMusic = await getRandomBackgroundMusicForMetadata(segment.metadata);
        console.log('Selected music: ' + backgroundMusic.filename + ' (' + backgroundMusic.category + ')');
        
        // STEP 4: Add background music to narration with silence
        console.log(`STEP 4: Adding background music to paragraph ${i+1}...`);
        const paragraphWithMusic = await stitchAudioWithBackground(
          narrationWithSilence,
          backgroundMusic.url,
          { 
            backgroundVolume: 0.15, // Reduced to 15% volume for more consistent background music
            crossfadeDuration: 0,   // No crossfade
            fadeInDuration: 0       // No fade-in effect
          }
        );
        
        // Add the processed paragraph to our collection
        processedSegments.push(paragraphWithMusic);
        console.log(`Added paragraph ${i+1} to processed segments collection`);
        
        // Get the duration for logging purposes
        const paragraphArrayBuffer = await paragraphWithMusic.arrayBuffer();
        const paragraphBuffer = await audioContext.decodeAudioData(paragraphArrayBuffer);
        console.log(`Paragraph ${i+1} final duration: ${paragraphBuffer.duration.toFixed(2)} seconds`);
        
        // No need for STEP 5 as we already added silence in STEP 2
        
        // Check if we need to resize our offline context
        const paragraphDuration = paragraphBuffer.duration;
        const requiredDuration = currentTime + paragraphDuration + pauseDuration;
        
        if (requiredDuration > estimatedTotalDuration) {
          // We need to create a new offline context with the updated size
          console.log(`Resizing audio context to accommodate longer duration: ${requiredDuration.toFixed(2)} seconds`);
          
          // Create new context with updated size
          const newOfflineContext = new OfflineAudioContext({
            numberOfChannels: 2,
            length: Math.ceil(audioContext.sampleRate * (requiredDuration + 10)), // Add 10s buffer
            sampleRate: audioContext.sampleRate
          });
          
          // If we already have audio in the current context, render and transfer it
          if (currentTime > 0) {
            const previousBuffer = await offlineContext.startRendering();
            const previousSource = newOfflineContext.createBufferSource();
            previousSource.buffer = previousBuffer;
            previousSource.connect(newOfflineContext.destination);
            previousSource.start(0);
          }
          
          // Update our context and total duration
          offlineContext = newOfflineContext;
          estimatedTotalDuration = requiredDuration + 10; // Add 10s buffer
        }
        
        // STEP 5: Add the paragraph audio to our final buffer
        console.log(`STEP 5: Adding paragraph ${i+1} audio to final buffer at position ${currentTime.toFixed(2)}s`);
        const paragraphSource = offlineContext.createBufferSource();
        paragraphSource.buffer = paragraphBuffer;
        paragraphSource.connect(offlineContext.destination);
        paragraphSource.start(currentTime);
        
        // Update current position
        currentTime += paragraphBuffer.duration;
        
        // STEP 6: Add 7-second silence after each paragraph (except the last one)
        if (i < segmentsWithMetadata.length - 1) {
          console.log(`STEP 6: Adding EXACTLY ${pauseDuration}-second silence after paragraph ${i+1}`);
          
          // Create silence buffer for pause - exactly 7 seconds
          const silenceBuffer = offlineContext.createBuffer(
            2, // stereo
            Math.ceil(offlineContext.sampleRate * pauseDuration),
            offlineContext.sampleRate
          );
          
          // Create and connect silence source
          const silenceSource = offlineContext.createBufferSource();
          silenceSource.buffer = silenceBuffer;
          silenceSource.connect(offlineContext.destination);
          silenceSource.start(currentTime);
          
          // Update current time to include silence duration
          currentTime += pauseDuration;
          console.log(`Current position after adding silence: ${currentTime.toFixed(2)} seconds`);
        }
        
        // Store the processed segment for reference
        processedSegments.push(paragraphWithMusic);
      }
      
      setSegmentAudios(processedSegments);
      
      // Step 4: Render the final audio with all paragraphs and silences
      setCurrentStep('rendering-final-audio');
      console.log(`Rendering final audio with total duration: ${currentTime.toFixed(2)} seconds`);
      
      // Render the final audio buffer
      const renderedBuffer = await offlineContext.startRendering();
      console.log(`Final audio rendered successfully, actual duration: ${renderedBuffer.duration.toFixed(2)} seconds`);
      
      // Convert to blob
      const audioData = await audioBufferToWav(renderedBuffer);
      const finalAudioBlob = new Blob([audioData], { type: 'audio/wav' });
      console.log(`Final audio blob created, size: ${finalAudioBlob.size} bytes`);
      
      // Set the final audio
      setFinalAudio(finalAudioBlob);
      
      // Step 5: Upload to Firebase
      setCurrentStep('uploading');
      setIsUploading(true);
      
      const finalAudioToUpload = finalAudioBlob;
      const uploadedUrl = await uploadAudioNarration(
        finalAudioToUpload,
        bookId || `audiobook_${Date.now()}`
      );
      
      // Set upload complete
      setUploadProgress(100);
      
      setAudioUrl(uploadedUrl);
      setIsUploading(false);
      setIsGenerating(false);
      
      if (onSuccess) onSuccess(uploadedUrl);
      
    } catch (err: any) {
      console.error('Error generating audiobook:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
      setIsGenerating(false);
      setIsUploading(false);
      if (onError) onError(err);
    }
  };
  
  // Helper function to concatenate audio blobs
  const concatenateAudioBlobs = async (blobs: Blob[]): Promise<Blob> => {
    if (blobs.length === 0) throw new Error('No audio blobs to concatenate');
    if (blobs.length === 1) return blobs[0];
    
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decode all audio blobs
    const buffers = await Promise.all(
      blobs.map(blob => 
        blob.arrayBuffer().then(arrayBuffer => 
          audioContext.decodeAudioData(arrayBuffer)
        )
      )
    );
    
    // Calculate total duration
    const totalDuration = buffers.reduce((sum, buffer) => sum + buffer.duration, 0);
    
    // Create offline context for the total duration
    const offlineContext = new OfflineAudioContext({
      numberOfChannels: 2,
      length: audioContext.sampleRate * totalDuration,
      sampleRate: audioContext.sampleRate
    });
    
    // Concatenate buffers
    let currentTime = 0;
    buffers.forEach(buffer => {
      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start(currentTime);
      currentTime += buffer.duration;
    });
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to blob
    const audioData = await audioBufferToWav(renderedBuffer);
    return new Blob([audioData], { type: 'audio/wav' });
  };
  
  // Helper function to get audio duration from a blob
  const getAudioDuration = async (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audioElement = new Audio();
      const objectUrl = URL.createObjectURL(audioBlob);
      
      audioElement.addEventListener('loadedmetadata', () => {
        const duration = audioElement.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      });
      
      audioElement.addEventListener('error', (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error loading audio: ' + err));
      });
      
      audioElement.src = objectUrl;
    });
  };

  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer: AudioBuffer): Promise<ArrayBuffer> => {
    return new Promise((resolve) => {
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;
      
      const dataLength = buffer.length * numberOfChannels * (bitDepth / 8);
      const headerLength = 44;
      const totalLength = headerLength + dataLength;
      
      const wavData = new ArrayBuffer(totalLength);
      const view = new DataView(wavData);
      
      // Write WAV header
      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numberOfChannels * (bitDepth / 8), true);
      view.setUint16(32, numberOfChannels * (bitDepth / 8), true);
      view.setUint16(34, bitDepth, true);
      writeString(view, 36, 'data');
      view.setUint32(40, dataLength, true);
      
      // Write audio data
      const channels = [];
      for (let i = 0; i < numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
      }
      
      let offset = 44;
      for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, channels[channel][i]));
          const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, value, true);
          offset += 2;
        }
      }
      
      resolve(wavData);
    });
  };
  
  // Helper function to write string to DataView
  const writeString = (view: DataView, offset: number, string: string): void => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // Helper function to get status text
  const getStatusText = () => {
    if (isUploading) return `Uploading: ${uploadProgress.toFixed(0)}%`;
    if (isGenerating) {
      switch (currentStep) {
        case 'segmenting-text':
          return 'Segmenting text...';
        case 'detecting-moods':
          return 'Detecting moods...';
        case 'processing-segments':
          return `Processing segments (${segments.length > 0 ? `${segmentAudios.length}/${segments.length}` : '...'})...`;
        case 'concatenating-segments':
          return 'Concatenating segments...';
        case 'uploading':
          return `Uploading (${uploadProgress.toFixed(0)}%)...`;
        default:
          return 'Processing...';
      }
    }
    return 'Generate Audiobook';
  };

  return (
    <div className={`flex flex-col items-start ${className}`}>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      
      <button 
        onClick={handleGenerateAudiobook}
        disabled={isGenerating || isUploading}
        className="flex items-center px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C]"
        title="Generate audiobook with dynamic background music"
        type="button"
      >
        {isGenerating || isUploading ? (
          <>
            <span className="inline-block animate-spin mr-2">⟳</span>
            {getStatusText()}
          </>
        ) : (
          <>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Generate Audiobook
          </>
        )}
      </button>
      
      {audioUrl && !error && (
        <div className="mt-3 w-full">
          <p className="text-sm text-green-500 mb-1">
            Audiobook generated successfully!
          </p>
          <h3 className="text-lg font-medium mt-2 mb-1">Continuous Playback</h3>
          <p className="text-sm text-gray-600 mb-2">All paragraphs with appropriate background music will play continuously</p>
          <AudioPlayer 
            audioUrl={audioUrl} 
            className="w-full"
          />
          
          {segments.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h4 className="text-md font-medium mb-2">Paragraph Information</h4>
              <ul className="space-y-2">
                {segments.map((segment, index) => (
                  <li key={index} className="p-2 bg-gray-50 rounded">
                    <strong>Paragraph {index + 1}:</strong> {segment.metadata.mood} mood
                    <p className="text-sm text-gray-700 mt-1">{segment.text.substring(0, 100)}...</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudiobookProduction;