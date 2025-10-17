'use client';

import { useState } from 'react';
import { generateAudio, arrayBufferToBlob, extractContentMetadata, ContentMetadata } from '@/services/openai';
import { uploadEpisodeNarration } from '@/firebase/episodeServices';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { isValidR2Url, ensureR2Url } from '@/r2/utils';
import { 
  getBackgroundMusicForMetadata, 
  getBackgroundMusicForParagraphs,
  getRandomBackgroundMusicForMetadata,
  getRandomBackgroundMusicForParagraphs
} from '@/firebase/backgroundMusicService';
import { stitchAudioWithBackground, stitchAudioWithMultipleBackgrounds, estimateParagraphTimings } from '@/utils/audioStitcher';

interface EpisodeNarrationGeneratorProps {
  episodeId: string;
  text: string;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  enableBackgroundMusic?: boolean;
  enableParagraphAnalysis?: boolean;
}

const EpisodeNarrationGenerator = ({ 
  episodeId, 
  text, 
  onSuccess, 
  onError,
  className = '',
  enableBackgroundMusic = true,
  enableParagraphAnalysis = true
}: EpisodeNarrationGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);

  const handleGenerateNarration = async () => {
    if (!text.trim()) {
      setError('No text provided for narration');
      if (onError) onError(new Error('No text provided for narration'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setCurrentStep('extracting-metadata');

      // Step 1: Extract metadata from content if background music is enabled
      let contentMetadata: ContentMetadata | null = null;
      if (enableBackgroundMusic) {
        console.log('Extracting content metadata for background music selection...');
        contentMetadata = await extractContentMetadata(text);
        console.log('Extracted metadata:', contentMetadata);
        setMetadata(contentMetadata);
      }

      // Step 2: Generate audio from text using OpenAI TTS
      setCurrentStep('generating-narration');
      console.log('Generating audio from text using OpenAI TTS...');
      const audioBuffer = await generateAudio(text);
      console.log('Audio generated successfully, buffer size:', audioBuffer.byteLength);
      
      // Step 3: Convert ArrayBuffer to Blob for processing
      const narrationBlob = arrayBufferToBlob(audioBuffer);
      console.log('Converted audio buffer to blob, size:', narrationBlob.size, 'type:', narrationBlob.type);
      
      // Step 4: Process audio with background music if enabled
      let finalAudioBlob = narrationBlob;
      
      if (enableBackgroundMusic && contentMetadata) {
        try {
          setCurrentStep('processing-background-music');
          
          if (enableParagraphAnalysis && contentMetadata.paragraphMoods && contentMetadata.paragraphMoods.length > 1) {
            // Use paragraph-level analysis for multiple background tracks
            console.log('Using paragraph-level analysis for background music...');
            
            // Split content into paragraphs using $ as primary delimiter
            const paragraphs = text.split(/\$/).filter(p => p.trim().length > 0);
            
            // Fallback to double line breaks if no paragraphs found with $
            if (paragraphs.length <= 1 && text.length > 500) {
              console.log('Falling back to double line breaks for paragraph splitting');
              const fallbackParagraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
              if (fallbackParagraphs.length > 1) {
                paragraphs.splice(0, paragraphs.length, ...fallbackParagraphs);
              }
            }
            
            try {
              // Get random background music for each paragraph
              const backgroundMusic = await getRandomBackgroundMusicForParagraphs(contentMetadata);
              console.log('Selected random background music tracks:', backgroundMusic);
              
              // Estimate paragraph timings based on word count
              // We'll use a fixed duration and adjust it later in the audio processing
              const estimatedDuration = text.length / 20; // Rough estimate: 20 chars per second
              const paragraphTimings = estimateParagraphTimings(paragraphs, estimatedDuration);
              console.log('Estimated paragraph timings:', paragraphTimings);
              
              // Stitch narration with multiple background tracks
              console.log('Stitching narration with multiple background tracks...');
              finalAudioBlob = await stitchAudioWithMultipleBackgrounds(
                narrationBlob, // Pass the blob directly
                paragraphTimings,
                backgroundMusic,
                { backgroundVolume: 0.3, crossfadeDuration: 3 }
              );
            } catch (bgError) {
              console.error('Error in paragraph-level background music processing:', bgError);
              console.log('Falling back to narration-only audio');
              // Continue with narration-only audio if background music processing fails
            }
          } else {
            // Use single background track for the entire narration
            console.log('Using single background track for narration...');
            
            try {
              // Get random background music based on overall mood
              const backgroundMusic = await getRandomBackgroundMusicForMetadata(contentMetadata);
              console.log('Selected random background music:', backgroundMusic);
              
              // Stitch narration with background music
              console.log('Stitching narration with background music...');
              finalAudioBlob = await stitchAudioWithBackground(
                narrationBlob, // Pass the blob directly
                backgroundMusic.url, // This is a URL from Firebase Storage
                { backgroundVolume: 0.3 }
              );
            } catch (bgError) {
              console.error('Error in background music processing:', bgError);
              console.log('Falling back to narration-only audio');
              // Continue with narration-only audio if background music processing fails
            }
          }
          
          console.log('Audio processing complete, final blob size:', finalAudioBlob.size);
        } catch (processingError) {
          console.error('Error in audio processing:', processingError);
          console.log('Falling back to narration-only audio');
          // Continue with narration-only audio if the entire background music processing fails
        }
      }
      
      // Step 5: Upload to Firebase Storage and update episode
      setIsUploading(true);
      setCurrentStep('uploading');
      console.log('Starting upload process...');
      
      // Upload audio file to Firebase Storage and update episode
      console.log('Uploading narration for episode:', episodeId);
      const storageUrl = await uploadEpisodeNarration(
        episodeId,
        finalAudioBlob,
        (progress) => {
          console.log(`Upload progress in component: ${progress.toFixed(2)}%`);
          setUploadProgress(progress);
        }
      );
      console.log('Received storage URL:', storageUrl);
      
      // Step 6: Validate and set the audio URL to the R2 Storage URL
      let validUrl: string | null = null;
      
      // Validate and ensure proper R2 URL format
      validUrl = ensureR2Url(storageUrl);
      
      if (!validUrl) {
        throw new Error('Invalid R2 Storage URL received from uploadEpisodeNarration');
      }
      
      console.log('✅ Setting audio URL to R2 Storage URL:', validUrl);
      setAudioUrl(validUrl);
      setCurrentStep('complete');
      
      // Step 7: Call success callback with the validated Firebase Storage URL
      if (onSuccess) {
        console.log('📝 Calling success callback with Firebase Storage URL');
        onSuccess(validUrl);
      }
      
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

  // Helper function to get status text based on current step
  const getStatusText = () => {
    if (isGenerating) {
      switch (currentStep) {
        case 'extracting-metadata':
          return 'Analyzing content...';
        case 'generating-narration':
          return 'Generating narration...';
        case 'processing-background-music':
          return 'Adding background music...';
        case 'uploading':
          return `Uploading... ${Math.round(uploadProgress)}%`;
        default:
          return 'Generating audio...';
      }
    } else if (isUploading) {
      return `Uploading... ${Math.round(uploadProgress)}%`;
    }
    return 'Generate Narration';
  };

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={handleGenerateNarration}
        disabled={isGenerating || isUploading}
        className={`flex items-center px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C] ${className}`}
        title="Generate audio narration with background music"
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
      
      {audioUrl && !error && (
        <div className="mt-3 w-full">
          <p className="text-sm text-green-500 mb-1">
            Audio generated successfully! {metadata && `(${metadata.mood} mood with ${metadata.genre} background)`}
          </p>
          <div className="audio-player-container">
            <AudioPlayer audioUrl={audioUrl} />
          </div>
          
          {metadata && (
            <div className="mt-2 text-xs text-gray-500">
              <p>Content analysis: {metadata.mood} mood, {metadata.genre} genre, {metadata.intensity}/10 intensity</p>
              {metadata.paragraphMoods && metadata.paragraphMoods.length > 1 && (
                <p>Multiple moods detected across {metadata.paragraphMoods.length} paragraphs with seamless transitions</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EpisodeNarrationGenerator;
