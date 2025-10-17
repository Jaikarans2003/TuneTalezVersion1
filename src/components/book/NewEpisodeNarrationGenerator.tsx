'use client';

import { useState } from 'react';
import { generateAudio, arrayBufferToBlob } from '@/services/openai';
import { traceAudioUrl } from '@/utils/audioDebugger';

interface NewEpisodeNarrationGeneratorProps {
  bookId: string;
  text: string;
  onSuccess?: (audioUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const NewEpisodeNarrationGenerator = ({ 
  bookId, 
  text, 
  onSuccess, 
  onError,
  className = ''
}: NewEpisodeNarrationGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('idle');

  const handleGenerateNarration = async () => {
    if (!text || !text.trim()) {
      setError('No text provided for narration');
      if (onError) onError(new Error('No text provided for narration'));
      return;
    }
    
    if (!bookId) {
      setError('Book ID is required');
      if (onError) onError(new Error('Book ID is required'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setCurrentStep('generating-narration');
      
      // Generate audio from text using OpenAI TTS
      console.log('Generating audio from text using OpenAI TTS...');
      const audioBuffer = await generateAudio(text);
      
      // Convert ArrayBuffer to Blob
      const audioBlob = arrayBufferToBlob(audioBuffer);
      
      // Create a temporary URL for the audio blob
      const tempUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(tempUrl);
      
      // Call success callback with the temporary URL
      if (onSuccess) {
        const tracedUrl = traceAudioUrl(tempUrl, 'NewEpisodeNarrationGenerator.onSuccess');
        onSuccess(tracedUrl);
      }
      
      setCurrentStep('complete');
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
        case 'generating-narration':
          return 'Generating narration...';
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
        title="Generate audio narration"
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
            Audio generated successfully!
          </p>
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default NewEpisodeNarrationGenerator;