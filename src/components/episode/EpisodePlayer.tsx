'use client';

import { useState, useEffect } from 'react';
import { getEpisodeById } from '@/firebase/episodeServices';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Episode } from '@/types/episode';

interface EpisodePlayerProps {
  episodeId: string;
  className?: string;
}

const EpisodePlayer = ({ episodeId, className = '' }: EpisodePlayerProps) => {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch episode data on mount
  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const episodeData = await getEpisodeById(episodeId);
        
        if (!episodeData) {
          setError('Episode not found');
          return;
        }
        
        setEpisode(episodeData);
      } catch (err: any) {
        console.error('Error fetching episode:', err);
        setError(`Failed to load episode: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEpisode();
  }, [episodeId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className={`p-4 text-red-500 ${className}`}>
        {error || 'Failed to load episode'}
      </div>
    );
  }

  if (!episode.narrationUrl) {
    return (
      <div className={`p-4 text-amber-500 ${className}`}>
        No narration available for this episode
      </div>
    );
  }

  return (
    <div className={`episode-player ${className}`}>
      <h3 className="text-lg font-medium mb-2">{episode.title}</h3>
      <AudioPlayer 
        audioUrl={episode.narrationUrl} 
        showPlaybackSpeed={true}
      />
    </div>
  );
};

export default EpisodePlayer;
