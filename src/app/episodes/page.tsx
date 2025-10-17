'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getEpisodes, createEpisode } from '@/firebase/episodeServices';
import { Episode } from '@/types/episode';
import Link from 'next/link';

export default function EpisodesPage() {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch episodes
  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const episodesData = await getEpisodes();
        setEpisodes(episodesData);
      } catch (err: any) {
        console.error('Error fetching episodes:', err);
        setError(`Failed to load episodes: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEpisodes();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    
    if (!text.trim()) {
      setFormError('Episode text is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      const newEpisode = await createEpisode({
        title,
        text,
        authorId: 'current-user-id', // In a real app, get this from auth context
        published: true,
        tags: []
      });
      
      // Navigate to the new episode page
      router.push(`/episodes/${newEpisode.id}`);
    } catch (err: any) {
      console.error('Error creating episode:', err);
      setFormError(`Failed to create episode: ${err.message || 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Episodes</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New Episode</h2>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          {formError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {formError}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Episode title"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
              Episode Text
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter the episode text here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This text will be used to generate the audio narration.
            </p>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#5A3E85] text-white rounded hover:bg-[#6E4A9E] transition-colors disabled:bg-[#3E2A5C]"
            >
              {isSubmitting ? 'Creating...' : 'Create Episode'}
            </button>
          </div>
        </form>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">All Episodes</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : episodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No episodes found. Create your first episode above.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {episodes.map((episode) => (
              <Link 
                href={`/episodes/${episode.id}`}
                key={episode.id}
                className="block bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-medium mb-2">{episode.title}</h3>
                <p className="text-gray-600 line-clamp-3">{episode.text}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {new Date(episode.createdAt).toLocaleDateString()}
                  </span>
                  
                  {episode.narrationUrl ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      Narration Available
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full">
                      No Narration
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
