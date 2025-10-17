'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getEpisodeById, updateEpisode } from '@/firebase/episodeServices';
import { Episode } from '@/types/episode';
import EpisodeNarrationGenerator from '@/components/episode/EpisodeNarrationGenerator';
import EpisodePlayer from '@/components/episode/EpisodePlayer';

export default function EpisodePage() {
  const params = useParams();
  const episodeId = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [narrationGenerated, setNarrationGenerated] = useState(false);

  // Fetch episode data
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
        setNarrationGenerated(!!episodeData.narrationUrl);
      } catch (err: any) {
        console.error('Error fetching episode:', err);
        setError(`Failed to load episode: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (episodeId) {
      fetchEpisode();
    }
  }, [episodeId]);

  // Handle narration success
  const handleNarrationSuccess = async (audioUrl: string) => {
    if (!episode) return;
    
    try {
      // Update the episode with the new narration URL
      await updateEpisode(episodeId, { narrationUrl: audioUrl });
      
      // Update local state
      setEpisode({
        ...episode,
        narrationUrl: audioUrl,
        updatedAt: Date.now()
      });
      
      setNarrationGenerated(true);
    } catch (err) {
      console.error('Error updating episode with narration URL:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Failed to load episode'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{episode.title}</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Episode Content</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>{episode.text}</p>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Audio Narration</h2>
        
        {episode.narrationUrl ? (
          <div className="mb-4">
            <EpisodePlayer episodeId={episodeId} />
          </div>
        ) : (
          <div className="mb-4 text-amber-600">
            No narration available for this episode yet.
          </div>
        )}
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Generate Narration</h3>
          <EpisodeNarrationGenerator 
            episodeId={episodeId}
            text={episode.text}
            onSuccess={handleNarrationSuccess}
            onError={(err) => console.error('Narration error:', err)}
          />
          
          {narrationGenerated && (
            <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
              Narration has been generated and saved to the episode!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
