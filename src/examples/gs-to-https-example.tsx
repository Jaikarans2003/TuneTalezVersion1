'use client';

import { useState } from 'react';
import { convertGsUriToHttpsUrl } from '@/utils/audioUtils';
import { getFileUrlFromR2 } from '@/r2/services';

/**
 * Example component showing how to convert gs:// URIs to HTTPS URLs
 * This can be used as a reference for handling Firebase Storage URLs
 */
export default function GsToHttpsExample() {
  const [gsUri, setGsUri] = useState<string>('');
  const [httpsUrl, setHttpsUrl] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example of converting a gs:// URI to an HTTPS URL
  const handleConvert = async () => {
    if (!gsUri) {
      setError('Please enter a gs:// URI');
      return;
    }

    try {
      setIsConverting(true);
      setError(null);

      // Method 1: Using our utility function
      const url = await convertGsUriToHttpsUrl(gsUri);
      
      if (!url) {
        throw new Error('Failed to convert gs:// URI to HTTPS URL');
      }
      
      setHttpsUrl(url);
    } catch (err: any) {
      setError(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Example of manually converting a gs:// URI to an HTTPS URL
  const handleManualConvert = async () => {
    if (!gsUri) {
      setError('Please enter a gs:// URI');
      return;
    }

    try {
      setIsConverting(true);
      setError(null);

      // Method 2: Manual conversion using R2
      // Extract the path from the gs:// URI
      // Format: gs://bucket-name/path/to/file.mp3
      if (!gsUri.startsWith('gs://')) {
        throw new Error('Not a valid gs:// URI');
      }

      const path = gsUri.replace(/^gs:\/\/[^\/]+\//, '');
      
      // Get the download URL from R2
      const url = await getFileUrlFromR2(path);
      
      setHttpsUrl(url);
    } catch (err: any) {
      setError(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Convert gs:// URI to HTTPS URL</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          gs:// URI
        </label>
        <input
          type="text"
          value={gsUri}
          onChange={(e) => setGsUri(e.target.value)}
          placeholder="gs://bucket-name/path/to/file.mp3"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: gs://tune-tales-7bc34.firebasestorage.app/audio-narrations/books/temp_1757873846963/narration.mp3
        </p>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleConvert}
          disabled={isConverting || !gsUri}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isConverting ? 'Converting...' : 'Convert'}
        </button>
        
        <button
          onClick={handleManualConvert}
          disabled={isConverting || !gsUri}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
        >
          Manual Convert
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {httpsUrl && (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-2">HTTPS URL:</h2>
          <div className="p-2 bg-gray-100 border border-gray-300 rounded break-all">
            {httpsUrl}
          </div>
          
          <div className="mt-4">
            <h3 className="text-md font-medium mb-2">Audio Preview:</h3>
            <audio src={httpsUrl} controls className="w-full" />
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-medium mb-2">Code Example:</h2>
        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto text-sm">
{`import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/firebase/config";

// Convert gs:// URI to HTTPS URL
async function getAudioUrl(gsUri: string) {
  // Extract the path from the gs:// URI
  // Format: gs://bucket-name/path/to/file.mp3
  const path = gsUri.replace(/^gs:\\/\\/[^\\/]+\\//, '');
  
  // Create a reference to the file
  const storageRef = ref(storage, path);
  
  // Get the download URL
  const url = await getDownloadURL(storageRef);
  return url;
}

// Example usage
const gsUri = "gs://tune-tales-7bc34.firebasestorage.app/audio-narrations/books/temp_1757873846963/narration.mp3";
const httpsUrl = await getAudioUrl(gsUri);
console.log(httpsUrl);
// https://firebasestorage.googleapis.com/v0/b/tune-tales-7bc34.firebasestorage.app/o/audio-narrations%2Fbooks%2Ftemp_1757873846963%2Fnarration.mp3?alt=media&token=aa3d7a39-97ed-4950-9c35-9cf4fc7f6371
`}
        </pre>
      </div>
    </div>
  );
}
