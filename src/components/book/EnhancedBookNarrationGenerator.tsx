'use client';

import { useState } from 'react';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { updateBookAudio } from '@/firebase/services';
import ParagraphNarrationPlayer from './ParagraphNarrationPlayer';

interface ParagraphMetadata {
  paragraph: number;
  mood: string;
  genre?: string;
  intensity?: number;
}

interface ParagraphNarration {
  text: string;
  metadata: ParagraphMetadata;
  audioUrl: string;
}

interface EnhancedBookNarrationGeneratorProps {
  bookId: string;
  text: string;
  onSuccess?: (audioUrls: string[]) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const EnhancedBookNarrationGenerator = ({
  bookId,
  text,
  onSuccess,
  onError,
  className = ''
}: EnhancedBookNarrationGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paragraphNarrations, setParagraphNarrations] = useState<ParagraphNarration[]>([]);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);
  const [totalParagraphs, setTotalParagraphs] = useState<number>(0);

  const handleGenerateNarration = async () => {
    if (!text.trim()) {
      const errorMessage = 'No text provided for narration';
      setError(errorMessage);
      if (onError) onError(new Error(errorMessage));
      return;
    }

    try {
      // Reset state
      setIsGenerating(true);
      setError(null);
      setCurrentStep('processing');
      setProgress(5);
      setParagraphNarrations([]);
      
      // Split text into paragraphs
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      setTotalParagraphs(paragraphs.length);
      console.log(`Processing ${paragraphs.length} paragraphs`);

      // Call the narration API
      const response = await fetch('/api/narration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          bookId,
          options: {
            voice: 'alloy',
            backgroundMusicVolume: 0.3,
            crossfadeDuration: 2,
            fadeInDuration: 1,
            fadeOutDuration: 2
          }
        }),
      });

      setProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate narration');
      }

      const data = await response.json();
      setProgress(60);

      // Now, we need to get individual paragraph narrations
      // For now, we'll simulate this by making separate API calls for each paragraph
      const paragraphResults: ParagraphNarration[] = [];
      
      for (let i = 0; i < paragraphs.length; i++) {
        setCurrentParagraphIndex(i + 1);
        setCurrentStep(`processing-paragraph-${i + 1}`);
        setProgress(60 + Math.floor((i / paragraphs.length) * 30));
        
        // Make API call for each paragraph
        try {
          const paragraphResponse = await fetch('/api/narration/paragraph', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: paragraphs[i],
              bookId: bookId,
              paragraphIndex: i,
              options: {
                voice: 'alloy',
                backgroundMusicVolume: 0.3,
                fadeInDuration: 1,
                fadeOutDuration: 2
              }
            }),
          });
          
          if (!paragraphResponse.ok) {
            const errorData = await paragraphResponse.json();
            console.error(`Failed to generate narration for paragraph ${i + 1}:`, errorData.error);
            
            // Add with fallback metadata
            paragraphResults.push({
              text: paragraphs[i],
              metadata: {
                paragraph: i + 1,
                mood: i === 0 ? 'suspense' : 'happy', // Fallback mood
                genre: i === 0 ? 'thriller' : 'adventure', // Fallback genre
                intensity: i === 0 ? 9 : 6 // Fallback intensity
              },
              audioUrl: '' // Empty URL indicates error
            });
            continue;
          }
          
          const paragraphData = await paragraphResponse.json();
          
          // Verify metadata exists before using it
          if (!paragraphData.metadata) {
            console.error(`Missing metadata for paragraph ${i + 1}`);
            
            // Add with fallback metadata
            paragraphResults.push({
              text: paragraphs[i],
              metadata: {
                paragraph: i + 1,
                mood: i === 0 ? 'suspense' : 'happy', // Fallback mood
                genre: i === 0 ? 'thriller' : 'adventure', // Fallback genre
                intensity: i === 0 ? 9 : 6 // Fallback intensity
              },
              audioUrl: paragraphData.url
            });
          } else {
            // Add to our results with metadata from the API
            paragraphResults.push({
              text: paragraphs[i],
              metadata: {
                paragraph: i + 1,
                mood: paragraphData.metadata.mood || 'unknown',
                genre: paragraphData.metadata.genre || 'unknown',
                intensity: paragraphData.metadata.intensity || 5
              },
              audioUrl: paragraphData.url
            });
          }
        } catch (paragraphError) {
          console.error(`Error processing paragraph ${i + 1}:`, paragraphError);
          
          // Add with fallback metadata
          paragraphResults.push({
            text: paragraphs[i],
            metadata: {
              paragraph: i + 1,
              mood: 'unknown',
              genre: 'unknown',
              intensity: 5
            },
            audioUrl: '' // Empty URL indicates error
          });
        }
      }
      
      setParagraphNarrations(paragraphResults);
      setProgress(90);

      // Update the book with the combined audio URL
      await updateBookAudio(bookId, data.url);
      setProgress(100);

      // Set the combined audio URL for playback
      setCombinedAudioUrl(data.url);
      setCurrentStep('complete');

      // Call success callback with all URLs
      if (onSuccess) {
        onSuccess(paragraphResults.map(p => p.audioUrl));
      }
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
        case 'processing':
          return `Processing... ${Math.round(progress)}%`;
        default:
          if (currentStep.startsWith('processing-paragraph')) {
            return `Processing paragraph ${currentParagraphIndex}/${totalParagraphs}... ${Math.round(progress)}%`;
          }
          return 'Generating audio...';
      }
    }
    return 'Generate Narration';
  };

  return (
    <div className="flex flex-col items-start w-full">
      <button
        onClick={handleGenerateNarration}
        disabled={isGenerating}
        className={`flex items-center px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C] ${className}`}
        title="Generate audio narration with background music"
      >
        {isGenerating ? (
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
        <div className="mt-6 w-full">
          <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-800">
            <h3 className="text-lg font-semibold mb-2">Complete Narration</h3>
            <p className="text-sm text-green-500 mb-3">
              Complete audio narration with all paragraphs and background music
            </p>
            <div className="audio-player-container">
              <AudioPlayer audioUrl={combinedAudioUrl} />
            </div>
          </div>
          
          {paragraphNarrations.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Individual Paragraph Narrations</h3>
              <p className="text-sm text-gray-400 mb-4">
                Each paragraph has been narrated separately with its own appropriate background music based on the mood.
              </p>
              
              {paragraphNarrations.map((narration, index) => (
                <ParagraphNarrationPlayer 
                  key={index}
                  paragraphText={narration.text}
                  metadata={narration.metadata}
                  audioUrl={narration.audioUrl}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedBookNarrationGenerator;
