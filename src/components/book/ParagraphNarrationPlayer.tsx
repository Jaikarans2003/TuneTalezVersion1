'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '@/components/audio/AudioPlayer';

interface ParagraphMetadata {
  paragraph: number;
  mood: string;
  genre?: string;
  intensity?: number;
}

interface ParagraphNarrationPlayerProps {
  paragraphText: string;
  metadata?: ParagraphMetadata;
  audioUrl: string;
}

const ParagraphNarrationPlayer = ({
  paragraphText,
  metadata,
  audioUrl
}: ParagraphNarrationPlayerProps) => {
  const [expanded, setExpanded] = useState(false);

  // Truncate paragraph text for display if it's too long
  const displayText = expanded || paragraphText.length < 150 
    ? paragraphText 
    : `${paragraphText.substring(0, 150)}...`;

  return (
    <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-800">
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm text-gray-400">
          {metadata && (
            <span>
              {metadata.mood} mood, {metadata.genre} genre, intensity: {metadata.intensity}/10
            </span>
          )}
        </div>
        {paragraphText.length > 150 && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      
      <p className="text-white mb-3 whitespace-pre-wrap">{displayText}</p>
      
      <div className="audio-player-container">
        {audioUrl ? (
          <AudioPlayer audioUrl={audioUrl} />
        ) : (
          <div className="p-3 bg-red-900/30 text-red-300 rounded-md text-sm">
            Failed to generate audio for this paragraph. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default ParagraphNarrationPlayer;
