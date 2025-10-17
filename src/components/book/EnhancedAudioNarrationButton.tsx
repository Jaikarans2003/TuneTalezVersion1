'use client';

import { useState } from 'react';
import { generateAudio, arrayBufferToBlob, ContentMetadata } from '@/services/openai';
import { uploadAudioNarration, updateBookAudio, updateChapterAudio } from '@/firebase/services';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { ensureR2Url, ensureR2HttpsUrl } from '@/utils/audioUtils';
import { getBackgroundMusicForMetadata, getRandomBackgroundMusicForMetadata, BackgroundMusic } from '@/firebase/backgroundMusicService';
import { stitchAudioWithBackground, estimateParagraphTimings, ParagraphTiming } from '@/utils/audioStitcher';
import { extractParagraphMetadata } from './ParagraphMetadataExtractor';

interface ParagraphData {
  text: string;
  metadata?: ContentMetadata;
  audioUrl?: string;
  backgroundMusic?: BackgroundMusic;
}

interface EnhancedAudioNarrationButtonProps {
  text: string;
  bookId?: string;
  chapterId?: string;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  enableBackgroundMusic?: boolean;
}

const EnhancedAudioNarrationButton = ({ 
  text, 
  bookId, 
  chapterId, 
  onSuccess, 
  onError,
  className = '',
  enableBackgroundMusic = true
}: EnhancedAudioNarrationButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);
  const [totalParagraphs, setTotalParagraphs] = useState<number>(0);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [showParagraphDetails, setShowParagraphDetails] = useState<boolean>(false);

  const handleGenerateNarration = async () => {
    if (!text.trim()) {
      setError('No text provided for narration');
      if (onError) onError(new Error('No text provided for narration'));
      return;
    }

    try {
      // Reset states
      setIsGenerating(true);
      setError(null);
      setCurrentStep('segmenting-text');
      setParagraphs([]);
      setCombinedAudioUrl(null);

      // Step 1: Split text into paragraphs
      // First normalize line breaks to ensure consistent splitting
      const normalizedText = text.replace(/\r\n/g, '\n');
      
      // Primary splitting strategy: Use $ symbol as paragraph delimiter
      let textParagraphs = normalizedText.split(/\$/).filter(p => p.trim().length > 0);
      console.log(`Found ${textParagraphs.length} paragraphs using $ symbol as delimiter`);
      
      // If we only found one paragraph, try alternative splitting methods
      if (textParagraphs.length <= 1 && normalizedText.length > 500) {
        console.log("Only one paragraph found with $ symbol, trying alternative splitting methods");
        
        // Try splitting by double line breaks (legacy method)
        const doubleBreakParagraphs = normalizedText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (doubleBreakParagraphs.length > 1) {
          console.log(`Found ${doubleBreakParagraphs.length} paragraphs using double line breaks`);
          textParagraphs = doubleBreakParagraphs;
        }
        
        // Try splitting by double periods (..) - legacy method
        if (textParagraphs.length <= 1) {
          console.log("Trying to split by double periods (..)");
          
          // Specifically target double periods (..) followed by whitespace or end of text
          const doublePeriodSplitText = normalizedText.replace(/\.\.(?:\s+|$)/g, "..\n\n");
          const doublePeriodParagraphs = doublePeriodSplitText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          
          if (doublePeriodParagraphs.length > 1) {
            console.log(`Found ${doublePeriodParagraphs.length} paragraphs using double periods`);
            textParagraphs = doublePeriodParagraphs;
          }
        }
      }
      
      // Limit to maximum 5 paragraphs for performance
      if (textParagraphs.length > 5) {
        console.log(`Limiting from ${textParagraphs.length} to 5 paragraphs for performance`);
        textParagraphs = textParagraphs.slice(0, 5);
      }
      
      setTotalParagraphs(textParagraphs.length);
      console.log(`Processing ${textParagraphs.length} paragraphs`);
      
      // Debug: Print each paragraph
      textParagraphs.forEach((p, i) => {
        console.log(`Paragraph ${i+1} (${p.length} chars): ${p.substring(0, 50)}${p.length > 50 ? '...' : ''}`);
      });

      // Initialize paragraphs data
      const initialParagraphs = textParagraphs.map(text => ({ text }));
      setParagraphs(initialParagraphs);

      // Step 2: Process each paragraph individually
      const processedParagraphs: ParagraphData[] = [];
      const processedAudioBlobs: Blob[] = [];
      
      for (let i = 0; i < textParagraphs.length; i++) {
        const paragraphText = textParagraphs[i];
        setCurrentParagraphIndex(i + 1);
        setCurrentStep(`processing-paragraph-${i + 1}`);
        
        console.log(`Processing paragraph ${i + 1}/${textParagraphs.length}...`);
        
        // Step 2.1: Extract metadata for this paragraph
        let paragraphMetadata: ContentMetadata | undefined;
        if (enableBackgroundMusic) {
          console.log(`Extracting metadata for paragraph ${i + 1}...`);
          try {
            paragraphMetadata = await extractParagraphMetadata(paragraphText);
            console.log(`Paragraph ${i + 1} metadata:`, paragraphMetadata);
          } catch (metadataError) {
            console.error(`Error extracting metadata for paragraph ${i + 1}:`, metadataError);
            // Provide fallback metadata if extraction fails
            paragraphMetadata = {
              mood: i === 0 ? 'suspense' : 'happy',
              genre: i === 0 ? 'thriller' : 'adventure',
              intensity: i === 0 ? 8 : 5,
              tempo: 'medium'
            };
          }
        }
        
        // Step 2.2: Generate TTS audio for this paragraph
        console.log(`Generating TTS for paragraph ${i + 1}...`);
        const audioBuffer = await generateAudio(paragraphText);
        const narrationBlob = arrayBufferToBlob(audioBuffer);
        
        // Step 2.3: Get background music for this paragraph
        let backgroundMusic: BackgroundMusic | undefined;
        let finalParagraphAudio = narrationBlob;
        
        if (enableBackgroundMusic && paragraphMetadata) {
          try {
            console.log(`Fetching background music for paragraph ${i + 1} with mood: ${paragraphMetadata.mood}...`);
            backgroundMusic = await getRandomBackgroundMusicForMetadata(paragraphMetadata);
            console.log(`Selected background music for paragraph ${i + 1}:`, backgroundMusic);
            
            // Step 2.4: Mix narration with background music
            console.log(`Mixing narration with background music for paragraph ${i + 1}...`);
            finalParagraphAudio = await stitchAudioWithBackground(
              narrationBlob,
              backgroundMusic.url,
              { backgroundVolume: 0.3 }
            );
          } catch (bgError) {
            console.error(`Error processing background music for paragraph ${i + 1}:`, bgError);
            // Continue with narration-only audio if background music processing fails
          }
        }
        
        // Add processed audio to the collection
        processedAudioBlobs.push(finalParagraphAudio);
        
        // Update paragraph data
        processedParagraphs.push({
          text: paragraphText,
          metadata: paragraphMetadata,
          backgroundMusic
        });
        
        // Update state to show progress
        setParagraphs(prev => {
          const updated = [...prev];
          updated[i] = {
            text: paragraphText,
            metadata: paragraphMetadata,
            backgroundMusic
          };
          return updated;
        });
      }
      
      // Step 3: Concatenate all processed paragraph audios
      setCurrentStep('concatenating-audio');
      console.log('Concatenating all processed paragraph audios...');
      console.log(`Number of processed paragraphs: ${processedParagraphs.length}`);
      console.log(`Number of audio blobs to concatenate: ${processedAudioBlobs.length}`);
      
      // Debug: Log processed paragraphs
      processedParagraphs.forEach((p, i) => {
        console.log(`Processed paragraph ${i+1}: ${p.text.substring(0, 30)}... | Mood: ${p.metadata?.mood || 'unknown'} | Has background music: ${!!p.backgroundMusic}`);
      });
      
      const finalAudioBlob = await concatenateAudioBlobs(processedAudioBlobs);
      console.log('Audio concatenation complete, final size:', finalAudioBlob.size);
      
      // Step 4: Upload the final audio to Firebase
      setCurrentStep('uploading');
      setIsUploading(true);
      
      // Use a temporary ID if no bookId is provided
      const tempId = bookId || `temp_${Date.now()}`;
      const tempChapterId = chapterId || `preview_${Date.now()}`;
      
      console.log('Uploading final audio to Firebase...');
      const storageUrl = await uploadAudioNarration(
        finalAudioBlob,
        tempId,
        chapterId || tempChapterId,
        (progress) => {
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          setUploadProgress(progress);
        }
      );
      
      // Step 5: Validate and set the audio URL
      let validUrl: string | null = null;
      
      if (storageUrl.startsWith('gs://')) {
        console.log('Converting gs:// URI to HTTPS URL...');
        validUrl = await ensureR2HttpsUrl(storageUrl);
        
        if (!validUrl) {
          throw new Error('Failed to convert gs:// URI to R2 HTTPS URL');
        }
      } else {
        validUrl = ensureR2Url(storageUrl);
        
        if (!validUrl) {
          throw new Error('Invalid R2 Storage URL');
        }
      }
      
      setCombinedAudioUrl(validUrl);
      setCurrentStep('complete');
      
      // Step 6: If bookId is provided, update the book or chapter
      if (bookId) {
        console.log('Updating book/chapter with audio URL...');
        if (chapterId) {
          await updateChapterAudio(bookId, chapterId, validUrl);
        } else {
          await updateBookAudio(bookId, validUrl);
        }
      }
      
      // Call success callback
      if (onSuccess) onSuccess(validUrl);
      
      setIsUploading(false);
    } catch (err: any) {
      console.error('Error generating narration:', err);
      setError(`Failed to generate narration: ${err.message || 'Unknown error'}`);
      if (onError) onError(err);
      setCurrentStep('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Concatenate audio blobs into a single blob
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
    
    // Concatenate buffers with crossfade
    let currentTime = 0;
    const crossfadeDuration = 2; // 2 seconds crossfade
    
    buffers.forEach((buffer, index) => {
      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      
      // Create gain node for this source
      const gainNode = offlineContext.createGain();
      
      // Connect source to gain node and gain node to destination
      source.connect(gainNode);
      gainNode.connect(offlineContext.destination);
      
      // Apply fade in at the beginning of this segment (except for first segment)
      if (index > 0) {
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(1, currentTime + crossfadeDuration);
      }
      
      // Apply fade out at the end of this segment (except for last segment)
      if (index < buffers.length - 1) {
        const fadeOutStart = currentTime + buffer.duration - crossfadeDuration;
        gainNode.gain.setValueAtTime(1, fadeOutStart);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + buffer.duration);
      }
      
      // Start the source
      source.start(currentTime);
      
      // Update current time for next buffer
      // If not the last buffer, overlap by crossfade duration
      if (index < buffers.length - 1) {
        currentTime += buffer.duration - crossfadeDuration;
      } else {
        currentTime += buffer.duration;
      }
    });
    
    // Render audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV blob
    const wavArrayBuffer = await audioBufferToWav(renderedBuffer);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
  };

  // Convert AudioBuffer to WAV format
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

  // Handle click to prevent form submission
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();  // Prevent form submission
    e.stopPropagation(); // Stop event propagation to parent elements
    handleGenerateNarration();
  };

  // Helper function to get status text based on current step
  const getStatusText = () => {
    if (isGenerating) {
      switch (currentStep) {
        case 'segmenting-text':
          return 'Analyzing text...';
        case 'concatenating-audio':
          return 'Combining audio segments...';
        case 'uploading':
          return `Uploading... ${Math.round(uploadProgress)}%`;
        default:
          if (currentStep.startsWith('processing-paragraph')) {
            return `Processing paragraph ${currentParagraphIndex}/${totalParagraphs}...`;
          }
          return 'Generating audio...';
      }
    } else if (isUploading) {
      return `Uploading... ${Math.round(uploadProgress)}%`;
    }
    return 'Generate Narration';
  };

  return (
    <div className="flex flex-col items-start w-full" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleButtonClick(e);
        }}
        disabled={isGenerating || isUploading}
        className={`flex items-center px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C] ${className}`}
        title="Generate audio narration with background music"
        type="button" // Explicitly set type to button to prevent form submission
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
            Generate Narration
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
      
      {combinedAudioUrl && !error && (
        <div className="mt-3 w-full">
          <p className="text-sm text-green-500 mb-1">
            Audio generated successfully with paragraph-specific background music!
          </p>
          <div className="audio-player-container" onClick={(e) => e.stopPropagation()}>
            <AudioPlayer audioUrl={combinedAudioUrl} />
          </div>
          
          {paragraphs.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowParagraphDetails(!showParagraphDetails)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
              >
                {showParagraphDetails ? 'Hide' : 'Show'} paragraph details
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 ml-1 transition-transform ${showParagraphDetails ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {showParagraphDetails && (
                <div className="mt-2 space-y-3">
                  {paragraphs.map((paragraph, index) => (
                    <div key={index} className="p-3 bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-white mb-1">
                        Paragraph {index + 1}:
                        {paragraph.metadata && (
                          <span className="ml-1 text-xs text-gray-300">
                            {paragraph.metadata.mood} mood, {paragraph.metadata.genre} genre
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                        {paragraph.text.substring(0, 100)}
                        {paragraph.text.length > 100 ? '...' : ''}
                      </p>
                      {paragraph.backgroundMusic && (
                        <p className="text-xs text-blue-400">
                          Background music: {paragraph.backgroundMusic.category} - {paragraph.backgroundMusic.filename}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedAudioNarrationButton;
