'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';

export default function TestAudioPage() {
  const [audioUrl, setAudioUrl] = useState<string>('https://firebasestorage.googleapis.com/v0/b/tune-tales-7bc34.firebasestorage.app/o/audio-narrations%2Fbooks%2F5ZaaGL1gxHE97e0S5lah%2Fchapters%2Ftemp_1757851201620%2Ffixed_1757876158196.mp3?alt=media&token=cb5a4231-fa4b-4b09-b38c-8642ce4985b6');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<string>('Loading...');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [corsProxyUrl, setCorsProxyUrl] = useState<string>('');
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);
  
  useEffect(() => {
    // Reset error state when URL changes
    setAudioError(null);
    setAudioStatus('Loading...');
    setFetchStatus(null);
  }, [audioUrl]);
  
  // Test fetch the audio file
  const testFetch = async () => {
    try {
      setFetchStatus('Fetching...');
      const response = await fetch(audioUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Get the first few bytes to check the file header
      const buffer = await response.arrayBuffer();
      const headerBytes = new Uint8Array(buffer.slice(0, Math.min(16, buffer.byteLength)));
      const headerHex = Array.from(headerBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      setFetchStatus(`Success! Content-Type: ${contentType}, Size: ${contentLength} bytes, Header: ${headerHex}`);
    } catch (error) {
      setFetchStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomUrl(e.target.value);
  };

  const handleTestCustomUrl = () => {
    if (customUrl) {
      setAudioUrl(customUrl);
    }
  };
  
  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget;
    let errorMessage = 'Unknown error';
    
    if (audio.error) {
      switch (audio.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Audio loading aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading audio';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Audio decoding error';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Audio format not supported';
          break;
        default:
          errorMessage = `Unknown error (code: ${audio.error.code})`;
      }
    }
    
    setAudioError(errorMessage);
    setAudioStatus('Error');
    console.error('Audio error:', errorMessage, audio.error);
  };
  
  const handleAudioCanPlay = () => {
    setAudioStatus('Ready');
    console.log('Audio can play now');
  };
  
  const handleAudioPlay = () => {
    setAudioStatus('Playing');
    console.log('Audio playing');
  };
  
  const handleAudioPause = () => {
    setAudioStatus('Paused');
    console.log('Audio paused');
  };
  
  const useCorsProxy = () => {
    // Create a CORS proxy URL
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${audioUrl}`;
    setCorsProxyUrl(proxyUrl);
  };
  
  const downloadAudio = () => {
    // Create a download link
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'audio.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AdminProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Test Audio Playback</h1>
          <Link
            href="/admin"
            className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Direct Audio Tag Test</h2>
          <p className="mb-4 text-gray-700">
            This page tests audio playback using the native HTML audio tag without any custom components.
          </p>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Current Audio</h3>
            <div className="flex items-center mb-2">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${audioStatus === 'Playing' ? 'bg-green-500' : audioStatus === 'Error' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
              <span className="text-sm font-medium">{audioStatus}</span>
            </div>
            
            <audio 
              ref={audioRef}
              controls 
              className="w-full" 
              onError={handleAudioError}
              onCanPlay={handleAudioCanPlay}
              onPlay={handleAudioPlay}
              onPause={handleAudioPause}
            >
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            
            {audioError && (
              <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                Error: {audioError}
              </div>
            )}
            
            <p className="mt-2 text-sm text-gray-500 break-all">
              URL: {audioUrl}
            </p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={useCorsProxy}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try CORS Proxy
              </button>
              <button
                onClick={downloadAudio}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download Audio
              </button>
              <button
                onClick={() => audioRef.current?.load()}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Reload Audio
              </button>
              <button
                onClick={testFetch}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Test Fetch API
              </button>
            </div>
            
            {fetchStatus && (
              <div className={`mt-3 p-2 text-sm rounded ${fetchStatus.startsWith('Success') ? 'bg-green-100 text-green-800' : fetchStatus === 'Fetching...' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Fetch Test:</strong> {fetchStatus}
              </div>
            )}
          </div>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Test Custom URL</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audio URL
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={handleUrlChange}
                placeholder="https://firebasestorage.googleapis.com/..."
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={handleTestCustomUrl}
              disabled={!customUrl}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              Test URL
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Audio Format Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Audio Tag (Simple)</h4>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
              <div>
                <h4 className="font-medium mb-2">Audio Tag (with multiple MIME types)</h4>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  <source src={audioUrl} type="audio/mp3" />
                  <source src={audioUrl} type="audio/x-mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
            
            {corsProxyUrl && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Audio with CORS Proxy</h4>
                <audio controls className="w-full">
                  <source src={corsProxyUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                <p className="mt-1 text-xs text-gray-500 break-all">
                  Proxy URL: {corsProxyUrl}
                </p>
              </div>
            )}
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Audio Element (without source tag)</h4>
              <audio src={audioUrl} controls className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Audio with Normalized URL</h4>
              <audio controls className="w-full">
                <source src={`${audioUrl}${audioUrl.includes('?') ? '&' : '?'}format=audio/mp3`} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Direct Audio in iframe</h4>
              <div className="border border-gray-300 rounded p-2 bg-white">
                <iframe 
                  src={audioUrl} 
                  className="w-full h-20" 
                  title="Audio iframe"
                  sandbox="allow-same-origin"
                ></iframe>
                <p className="text-xs text-gray-500 mt-1">Note: iframe may not work with audio files due to content-type headers</p>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">HTML5 Media Element Creation</h4>
              <div id="dynamic-audio-container" className="border border-gray-300 rounded p-2 bg-white h-20 flex items-center justify-center">
                <button
                  onClick={() => {
                    const container = document.getElementById('dynamic-audio-container');
                    if (container) {
                      container.innerHTML = '';
                      const audio = document.createElement('audio');
                      audio.controls = true;
                      audio.src = audioUrl;
                      audio.className = 'w-full';
                      container.appendChild(audio);
                      audio.load();
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Audio Element
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Browser Audio Support</h3>
            <p className="text-sm text-gray-700">
              This section shows which audio formats your browser supports:
            </p>
            <div className="mt-2">
              <AudioFormatSupport />
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}

// Component to check browser audio format support
function AudioFormatSupport() {
  // Check which audio formats are supported
  const audioElement = typeof Audio !== 'undefined' ? new Audio() : null;
  
  const formats = [
    { type: 'audio/mpeg', ext: '.mp3' },
    { type: 'audio/mp4', ext: '.m4a' },
    { type: 'audio/wav', ext: '.wav' },
    { type: 'audio/ogg', ext: '.ogg' },
    { type: 'audio/webm', ext: '.webm' }
  ];
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {formats.map((format) => (
        <div key={format.type} className="flex items-center">
          <span className={`inline-block w-4 h-4 rounded-full mr-2 ${audioElement && audioElement.canPlayType(format.type) ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm">
            {format.ext} ({format.type})
            {audioElement && (
              <span className="ml-1 text-xs text-gray-500">
                {audioElement.canPlayType(format.type) ? 
                  (audioElement.canPlayType(format.type) === 'probably' ? 
                    '- Full Support' : '- Partial Support') 
                  : '- Not Supported'}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
