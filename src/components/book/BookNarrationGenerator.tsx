'use client';

import { useState } from 'react';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { updateBookAudio } from '@/firebase/services';

interface BookNarrationGeneratorProps {
  bookId: string;
  text: string;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const BookNarrationGenerator = ({
  bookId,
  text,
  onSuccess,
  onError,
  className = ''
}: BookNarrationGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');

  const handleGenerateNarration = async () => {
    if (!text.trim()) {
      const errorMessage = 'No text provided for narration';
      setError(errorMessage);
      if (onError) onError(new Error(errorMessage));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setCurrentStep('processing');
      setProgress(10);

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
      setProgress(80);

      // Update the book with the new audio URL
      await updateBookAudio(bookId, data.url);
      setProgress(100);

      // Set the audio URL for playback
      setAudioUrl(data.url);
      setCurrentStep('complete');

      // Call success callback
      if (onSuccess) {
        onSuccess(data.url);
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
          return 'Generating audio...';
      }
    }
    return 'Generate Narration';
  };

  return (
    <div className="flex flex-col items-start">
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
      
      {audioUrl && !error && (
        <div className="mt-3 w-full">
          <p className="text-sm text-green-500 mb-1">
            Audio generated successfully! Narration includes background music based on the content mood.
          </p>
          <div className="audio-player-container">
            <AudioPlayer audioUrl={audioUrl} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BookNarrationGenerator;
