'use client';

import { useState, useRef, useEffect } from 'react';
import { debugAudioUrl } from '@/utils/audioDebugger';
import { ensureR2Url, ensureR2HttpsUrl, validateAudioUrl, normalizeAudioUrl } from '@/utils/audioUtils';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  showPlaybackSpeed?: boolean;
  showWaveform?: boolean;
  showMetadata?: boolean;
  onEnded?: () => void;
}

const AudioPlayer = ({ 
  audioUrl, 
  className = '', 
  showPlaybackSpeed = true,
  showWaveform = false,
  showMetadata = false,
  onEnded
}: AudioPlayerProps) => {
  // Debug log to check URL type received by AudioPlayer
  console.log("🔊 AudioPlayer received URL:", audioUrl);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Handle potential gs:// URIs and ensure we have a valid R2 Storage URL
        const processUrl = async () => {
          try {
            setIsLoading(true);
            setError(null);
            
            // Check if it's a gs:// URI
            if (audioUrl.startsWith('gs://')) {
              console.warn('⚠️ Received gs:// URI instead of HTTPS URL:', audioUrl);
              
              // Convert gs:// URI to HTTPS URL
              const httpsUrl = await ensureR2HttpsUrl(audioUrl);
              
              if (!httpsUrl) {
                setError('Failed to convert gs:// URI to HTTPS URL. Please provide a valid R2 Storage URL.');
                setIsLoading(false);
                return;
              }
              
              console.log('✅ Converted gs:// URI to HTTPS URL:', httpsUrl);
              
              // Simple validation
              if (!validateAudioUrl(httpsUrl)) {
                console.warn('⚠️ URL may not be a valid audio file:', httpsUrl);
              }
              
              // Normalize the URL to ensure proper audio format detection
              const normalizedUrl = normalizeAudioUrl(httpsUrl);
              console.log('✅ Normalized audio URL:', normalizedUrl);
              
              // Extract format from URL
              const format = normalizedUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp3';
              setAudioFormat(format);
              
              // Set the audio source to the normalized HTTPS URL
              if (audioRef.current) {
                audioRef.current.src = normalizedUrl;
              }
              return;
            }
            
            // For non-gs:// URLs, validate normally
            const validUrl = ensureR2Url(audioUrl);
            
            if (!validUrl) {
              console.error('❌ Invalid audio URL rejected:', audioUrl);
              console.error('Component stack:', new Error().stack);
              setError('Invalid audio URL. Only R2 Storage HTTPS URLs are supported.');
              setIsLoading(false);
              return;
            }
            
            // Log the valid URL being used
            console.log('✅ Using R2 HTTPS URL for audio:', validUrl);
            
            // Simple validation
            if (!validateAudioUrl(validUrl)) {
              console.warn('⚠️ URL may not be a valid audio file:', validUrl);
            }
            
            // Normalize the URL to ensure proper audio format detection
            const normalizedUrl = normalizeAudioUrl(validUrl);
            console.log('✅ Normalized audio URL:', normalizedUrl);
            
            // Extract format from URL
            const format = normalizedUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp3';
            setAudioFormat(format);
            
            // Set audio source
            if (audioRef.current) {
              audioRef.current.src = normalizedUrl;
            }
          } catch (err: any) {
            console.error('Error processing audio URL:', err);
            setError(`Error processing audio URL: ${err?.message || 'Unknown error'}`);
            setIsLoading(false);
          }
        };
    
    processUrl();

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      console.log('Audio metadata loaded successfully');
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handleCanPlay = () => {
      console.log('Audio can play now');
      setIsLoading(false);
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error('Audio loading error:', e, audio.error, 'URL:', audioUrl);
      let errorMessage = 'Error loading audio';
      let detailedError = '';
      
      if (audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading aborted';
            detailedError = 'The audio loading was interrupted or cancelled.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio';
            detailedError = 'A network error occurred while trying to load the audio file. Check your internet connection and try again.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error';
            detailedError = 'The audio file is corrupted or in an invalid format. Try regenerating the audio narration.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            detailedError = 'The audio file format is not supported by your browser or the file may be corrupted. Try regenerating the audio narration.';
            
            // Check if it's a Firebase Storage URL
            if (audioUrl.includes('firebasestorage.googleapis.com')) {
              detailedError += ' This appears to be a Firebase Storage URL, but the file may not be a valid audio file.';
            }
            break;
          default:
            errorMessage = `Unknown audio error (code: ${audio.error.code})`;
            detailedError = 'An unknown error occurred while trying to play the audio.';
        }
      }
      
      // Add more information if it's a blob URL
          if (audioUrl.startsWith('blob:')) {
            detailedError += ' Blob URLs are not supported. Please use R2 Storage URLs.';
          }
      
      console.error(`${errorMessage}: ${detailedError} URL: ${audioUrl}`);
      setError(`${errorMessage}${detailedError ? ': ' + detailedError : ''}`);
      setIsLoading(false);
    };
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError as EventListener);
    
    // Clean up event listeners
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError as EventListener);
    };
  }, [audioRef]);
  
  // Handle play/pause
  const togglePlayPause = (e?: React.MouseEvent) => {
    // Prevent event bubbling and form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();
    
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();
    
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  };
  
  // Handle playback rate change
  const handlePlaybackRateChange = (rate: number, e: React.MouseEvent) => {
    if (!audioRef.current) return;
    
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();
    
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`bg-[#2a2a2a] rounded-lg p-4 ${className}`}>
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="metadata" 
        onEnded={onEnded}
      />
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-12">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">
          {error}
          <div className="text-xs mt-1 text-gray-400">
            URL: {audioUrl ? audioUrl.substring(0, 50) + (audioUrl.length > 50 ? '...' : '') : 'No URL provided'}
          </div>
          <div className="text-xs mt-1">
            <button 
              onClick={() => window.open('https://online-audio-converter.com/', '_blank')} 
              className="text-blue-400 hover:underline"
            >
              Try converting to MP3 format
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex items-center mb-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => togglePlayPause(e)}
              className="w-10 h-10 flex items-center justify-center bg-primary rounded-full text-white hover:bg-primary-dark transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button" // Explicitly set type to button to prevent form submission
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <div className="flex-1 mx-4">
              {audioFormat && (
                <div className="text-xs text-gray-400 mb-1">Format: {audioFormat}</div>
              )}
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                step="0.1"
                onChange={handleSeek}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <div className="relative group">
              <button
                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white"
                aria-label="Volume"
              >
                {volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.75.75v4.5c0 .414.336.75.75.75h1.536l4.033 3.796A.75.75 0 0010 16.25V3.75zM11.5 10a1 1 0 011-1h.5a1 1 0 010 2h-.5a1 1 0 01-1-1z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-24 bg-[#1F1F1F] rounded-lg p-2 shadow-lg">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Playback Speed */}
          {showPlaybackSpeed && (
            <div className="flex justify-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={(e) => handlePlaybackRateChange(rate, e)}
                  className={`text-xs px-2 py-1 rounded ${
                    playbackRate === rate
                      ? 'bg-primary text-white'
                      : 'bg-[#3a3a3a] text-gray-300 hover:bg-[#4a4a4a]'
                  }`}
                  type="button" // Explicitly set type to button to prevent form submission
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AudioPlayer;
