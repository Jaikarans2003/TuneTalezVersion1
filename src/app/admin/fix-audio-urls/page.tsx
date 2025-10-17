'use client';

import { useState } from 'react';
import { fixAllBlobUrls, fixBookBlobUrls, normalizeAndFixAudioFormat } from '@/scripts/fix-blob-urls';
import { getBooks, BookDocument, updateBook } from '@/firebase/services';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import Link from 'next/link';

export default function FixAudioUrlsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [books, setBooks] = useState<BookDocument[]>([]);
  const [results, setResults] = useState<{ fixed: number, total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | 'all'>('all');
  const [log, setLog] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isFixingFormat, setIsFixingFormat] = useState(false);
  const [formatFixResult, setFormatFixResult] = useState<{isFixed: boolean; newUrl: string | null; error?: string} | null>(null);

  // Function to add a log entry
  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Override console.log to capture logs
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  console.log = (...args) => {
    originalConsoleLog(...args);
    addLog(args.join(' '));
  };
  console.error = (...args) => {
    originalConsoleError(...args);
    addLog(`ERROR: ${args.join(' ')}`);
  };

  // Load books
  const loadBooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('Loading books...');
      
      const booksData = await getBooks();
      setBooks(booksData);
      
      addLog(`Loaded ${booksData.length} books.`);
    } catch (err: any) {
      setError(`Failed to load books: ${err.message || 'Unknown error'}`);
      addLog(`Error loading books: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize audio URL
  const handleFixAudioFormat = async () => {
    try {
      setIsFixingFormat(true);
      setError(null);
      setFormatFixResult(null);
      setLog([]);
      
      addLog(`Normalizing audio URL: ${audioUrl}...`);
      
      if (!audioUrl || !audioUrl.trim()) {
        throw new Error('Please enter a valid audio URL');
      }
      
      const result = await normalizeAndFixAudioFormat(audioUrl.trim());
      setFormatFixResult(result);
      
      if (result.isFixed && result.newUrl) {
        addLog(`✅ Successfully normalized audio URL. New URL: ${result.newUrl}`);
      } else if (!result.isFixed && !result.error) {
        addLog(`ℹ️ URL is already properly formatted. No changes needed.`);
      } else {
        throw new Error(result.error || 'Unknown error normalizing audio URL');
      }
    } catch (err: any) {
      setError(`Failed to normalize audio URL: ${err.message || 'Unknown error'}`);
      addLog(`Error normalizing audio URL: ${err.message || 'Unknown error'}`);
    } finally {
      setIsFixingFormat(false);
    }
  };
  
  // Fix blob URLs
  const handleFixUrls = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResults(null);
      setLog([]);
      
      if (selectedBook === 'all') {
        // Fix all books
        addLog('Starting migration for all books...');
        const result = await fixAllBlobUrls();
        setResults(result);
        addLog(`Migration complete! Fixed ${result.fixed} out of ${result.total} books.`);
      } else {
        // Fix a specific book
        const book = books.find(b => b.id === selectedBook);
        if (!book) {
          throw new Error('Selected book not found.');
        }
        
        addLog(`Starting migration for book "${book.title}"...`);
        const wasFixed = await fixBookBlobUrls(book);
        setResults({ fixed: wasFixed ? 1 : 0, total: 1 });
        addLog(`Migration complete! ${wasFixed ? 'Fixed' : 'No fixes needed for'} book "${book.title}".`);
      }
    } catch (err: any) {
      setError(`Failed to fix blob URLs: ${err.message || 'Unknown error'}`);
      addLog(`Error fixing blob URLs: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Fix Audio URLs</h1>
          <Link
            href="/admin"
            className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
          >
            Back to Admin
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fix Audio Issues in Database</h2>
          <p className="mb-4 text-gray-700">
            This tool helps fix common audio issues in your application:
          </p>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">Normalize Audio URLs</h3>
            <p className="mb-4 text-gray-700">
              If you're seeing "Audio format not supported" errors, use this tool to normalize the URL format.
              This adds format hints to ensure browsers recognize the audio file correctly.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Audio URL to Fix
              </label>
              <input
                type="text"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://firebasestorage.googleapis.com/...mp3"
                className="w-full p-2 border border-gray-300 rounded"
                disabled={isFixingFormat}
              />
            </div>
            
            <div className="mb-4">
              <button
                onClick={handleFixAudioFormat}
                disabled={isFixingFormat || !audioUrl}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors disabled:bg-green-300"
              >
                {isFixingFormat ? 'Normalizing URL...' : 'Normalize Audio URL'}
              </button>
            </div>
            
            {formatFixResult && (
              <div className={`mb-4 p-3 ${formatFixResult.isFixed ? 'bg-green-100 border-green-400 text-green-700' : formatFixResult.error ? 'bg-red-100 border-red-400 text-red-700' : 'bg-blue-100 border-blue-400 text-blue-700'} border rounded`}>
                {formatFixResult.isFixed ? (
                  <>
                    <p>✅ Successfully normalized audio URL!</p>
                    <p className="text-sm mt-1">New URL: {formatFixResult.newUrl}</p>
                  </>
                ) : formatFixResult.error ? (
                  <p>❌ {formatFixResult.error}</p>
                ) : (
                  <p>ℹ️ URL is already properly formatted. No changes needed.</p>
                )}
              </div>
            )}
          </div>
          
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium mb-2">Fix Blob URLs in Database</h3>
            <p className="mb-4 text-gray-700">
              This tool will fix any blob URLs stored in the database by replacing them with Firebase Storage URLs.
              Blob URLs are temporary and will not work in production environments.
            </p>
          </div>
          
          <div className="mb-4">
            <button
              onClick={loadBooks}
              disabled={isLoading}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {isLoading ? 'Loading...' : 'Load Books'}
            </button>
          </div>
          
          {books.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Book
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                disabled={isLoading}
              >
                <option value="all">All Books</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {books.length > 0 && (
            <div className="mb-4">
              <button
                onClick={handleFixUrls}
                disabled={isLoading}
                className="bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700 transition-colors disabled:bg-amber-300"
              >
                {isLoading ? 'Fixing...' : 'Fix Audio URLs'}
              </button>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {results && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Migration complete! Fixed {results.fixed} out of {results.total} books.
            </div>
          )}
          
          {log.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Log</h3>
              <div className="bg-gray-900 text-gray-200 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
                {log.map((entry, index) => (
                  <div key={index} className={`mb-1 ${entry.includes('ERROR') ? 'text-red-400' : ''}`}>
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
