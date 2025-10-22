'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookById, BookDocument, Chapter, updateBook, getBooks } from '@/firebase/services';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import LandingSidebar from '@/components/layout/LandingSidebar';
import { useAuth } from '@/context/AuthContext';
import AudioPlayer from '@/components/audio/AudioPlayer';
import TextMagnifier from '@/components/ui/TextMagnifier';
import LikeButton from '@/components/book/LikeButton';
import SaveButton from '@/components/book/SaveButton';
import ShareButton from '@/components/book/ShareButton';
import { debugAudioUrl, traceAudioUrl } from '@/utils/audioDebugger';
import { ensureR2HttpsUrl } from '@/utils/audioUtils';

// Base64-encoded 1-second silent MP3 file
const SILENT_MP3_BASE64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFWgD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAc0AAAAAAAAAABSAJAJAQgAAgAAAA+gQU9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

// Function to create a valid MP3 file from base64
const createValidMP3File = (): Blob => {
  // Convert base64 to binary
  const byteString = atob(SILENT_MP3_BASE64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  
  // Create a valid MP3 blob
  return new Blob([byteArray], { type: 'audio/mpeg' });
};

export default function ViewBookPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState<BookDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchBookData = async () => {
      if (!params.id) {
        setError('Book ID is missing');
        setLoading(false);
        return;
      }

      try {
        const bookData = await getBookById(params.id as string);

        if (bookData) {
          // Sort chapters by order
          if (bookData.chapters) {
            bookData.chapters = bookData.chapters.sort((a, b) => a.order - b.order);
          }
          
          // Debug: Check for blob URLs in book data
          console.log('📚 Book audioUrl:', bookData.audioUrl);
          if (bookData.audioUrl?.startsWith('blob:')) {
            console.warn('⚠️ Book has blob URL stored in database:', bookData.audioUrl);
          }
          
          // Debug: Check for blob URLs in chapters
          if (bookData.chapters) {
            bookData.chapters.forEach((chapter, index) => {
              console.log(`📖 Chapter ${index} audioUrl:`, chapter.audioUrl);
              if (chapter.audioUrl?.startsWith('blob:')) {
                console.warn(`⚠️ Chapter ${index} has blob URL stored in database:`, chapter.audioUrl);
              }
            });
          }
          
          setBook(bookData);
        } else {
          setError('Book not found');
        }
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('Failed to load book. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookData();
  }, [params.id]);

  const selectedChapter = book?.chapters?.[selectedChapterIndex];

  // Function to determine if current user is the author
  const isAuthor = () => {
    // This is a simple check, you might want to enhance this with proper author verification
    return user && book?.author === user.displayName;
  };
  
  // Function to fix blob URLs in book data
  const fixBlobUrls = async () => {
    if (!book || !params.id) return;
    
    try {
      console.log('🔧 Attempting to fix blob URLs in book data...');
      let bookUpdated = false;
      let updatedBook = { ...book };
      
      // Fix book audio URL if it's a blob
      if (book.audioUrl?.startsWith('blob:')) {
        console.log('🔄 Fixing blob URL in book audio...');
        try {
          // Create a valid MP3 file since we can't fetch the blob content directly
          const validAudio = createValidMP3File();
          const timestamp = Date.now();
          const path = `audio-narrations/books/${book.id}/fixed_${timestamp}.mp3`;
          
          // Import R2 services
          const { uploadFileToR2 } = await import('@/r2/services');
          
          // Upload the valid MP3 file to R2
          const newAudioUrl = await uploadFileToR2(
            new File([validAudio], `fixed_${timestamp}.mp3`, { type: 'audio/mpeg' }),
            path
          );
          
          // Update the book object
          updatedBook.audioUrl = newAudioUrl;
          bookUpdated = true;
          
          console.log('✅ Fixed book audio URL:', newAudioUrl);
        } catch (err) {
          console.error('❌ Failed to fix book audio URL:', err);
        }
      }
      
      // Fix chapter audio URLs if they're blobs
      if (book.chapters) {
        const updatedChapters = [...book.chapters];
        
        for (let i = 0; i < updatedChapters.length; i++) {
          const chapter = updatedChapters[i];
          
          if (chapter.audioUrl?.startsWith('blob:')) {
            console.log(`🔄 Fixing blob URL in chapter ${i}...`);
            try {
              // Create a valid MP3 file
              const validAudio = createValidMP3File();
              const timestamp = Date.now();
              const path = `audio-narrations/books/${book.id}/chapters/${chapter.id}/fixed_${timestamp}.mp3`;
              
              // Import R2 services
              const { uploadFileToR2 } = await import('@/r2/services');
              
              // Upload the valid MP3 file to R2
              const newAudioUrl = await uploadFileToR2(
                new File([validAudio], `fixed_${timestamp}.mp3`, { type: 'audio/mpeg' }),
                path
              );
              
              // Update the chapter
              updatedChapters[i] = {
                ...chapter,
                audioUrl: newAudioUrl
              };
              
              bookUpdated = true;
              console.log(`✅ Fixed chapter ${i} audio URL:`, newAudioUrl);
            } catch (err) {
              console.error(`❌ Failed to fix chapter ${i} audio URL:`, err);
            }
          }
        }
        
        updatedBook.chapters = updatedChapters;
      }
      
      // Update the book in Firestore if changes were made
      if (bookUpdated) {
        console.log('📝 Updating book in Firestore with fixed URLs...');
        await updateBook(params.id as string, updatedBook);
        
        // Update the local state
        setBook(updatedBook);
        
        console.log('✅ Book data updated successfully!');
        alert('Audio URLs have been fixed. The page will reload to apply changes.');
        
        // Reload the page to get fresh data
        router.refresh();
      } else {
        console.log('ℹ️ No blob URLs found in book data.');
      }
    } catch (err) {
      console.error('❌ Error fixing blob URLs:', err);
      alert('Failed to fix audio URLs. Please try again later.');
    }
  };
  
  // Function to handle audio playback
  const playAudio = async (audioUrl: string) => {
    // Debug log to check URL type
    console.log("🎧 Audio URL being played:", audioUrl);
    
    try {
      // Check if it's a blob URL
      if (audioUrl.startsWith('blob:')) {
        console.error('❌ Blob URL detected. Cannot play blob URLs:', audioUrl);
        console.error('Blob URLs are not supported in deployed environments.');
        return;
      }
      
      // Convert gs:// URIs to HTTPS URLs and validate the URL
      const httpsUrl = await ensureR2HttpsUrl(audioUrl);
      
      if (!httpsUrl) {
        console.error('❌ Invalid audio URL. Could not get a valid R2 HTTPS URL:', audioUrl);
        return;
      }
      
      // If it's the same URL that's already playing, stop it
      if (currentAudioUrl === httpsUrl) {
        setCurrentAudioUrl(null);
        setIsPlaying(false);
      } else {
        // Otherwise, play the new URL
        console.log('✅ Playing Firebase HTTPS URL:', httpsUrl);
        setCurrentAudioUrl(httpsUrl);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('❌ Error processing audio URL:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/"
          className="text-primary hover:text-primary-dark transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Books
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <div className="mt-4">
            <Link 
              href="/"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      ) : book ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Sidebar with book info and chapters list */}
          <div className="md:col-span-3">
            <div className="bg-[#1F1F1F] rounded-lg shadow-md p-4 sticky top-4">
              <div className="mb-4">
                <img 
                  src={book.thumbnailUrl} 
                  alt={book.title}
                  className="w-full h-auto rounded-md object-cover"
                />
              </div>
              
              <h1 className="text-xl font-bold text-white mb-2">{book.title}</h1>
              <p className="text-gray-300 mb-2">By {book.author}</p>
              
              {/* Quick Audio Play Button */}
              {book.audioUrl && (
                <div className="mb-6">
                  <div className="bg-[#2a2a2a] rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Listen to Episode
                    </h3>
                    {currentAudioUrl === book.audioUrl ? (
                      <AudioPlayer audioUrl={currentAudioUrl} />
                    ) : (
                      <button
                        onClick={() => playAudio(book.audioUrl!)}
                        className="flex items-center justify-center gap-2 bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors w-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play Narration
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                {book.tags?.map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-block bg-[#333333] text-gray-300 px-2 py-1 rounded-md text-sm mr-2 mb-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Author actions */}
              {isAuthor() && (
                <div className="mb-4 pt-4 border-t border-gray-700 space-y-2">
                  <Link
                    href={`/manage-episodes/${book.id}`}
                    className="block w-full bg-primary text-white py-2 px-4 rounded text-center hover:bg-primary-dark transition-colors"
                  >
                    Manage Episodes
                  </Link>
                  
                  <button
                    onClick={fixBlobUrls}
                    className="flex items-center justify-center gap-2 w-full bg-amber-600 text-white py-2 px-4 rounded text-center hover:bg-amber-700 transition-colors"
                    title="Fix any blob URLs stored in the database"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Fix Audio URLs
                  </button>
                  
                  <ShareButton
                    title={book.title}
                    text={`Check out "${book.title}" by ${book.author} on TuneTalez`}
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${book.id}`}
                    thumbnailUrl={book.thumbnailUrl}
                    author={book.author}
                    className="w-full"
                  />
                </div>
              )}
              
              {/* Episodes list */}
              <div className="mt-6">
                <h2 className="text-lg font-bold text-white mb-3">Episodes</h2>
                {book.chapters && book.chapters.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {book.chapters.map((chapter, index) => (
                      <div key={chapter.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedChapterIndex(index)}
                          className={`flex-grow text-left p-2 rounded-md ${
                            selectedChapterIndex === index
                              ? 'bg-primary text-white'
                              : 'bg-[#333333] text-gray-300 hover:bg-[#444444]'
                          }`}
                        >
                          <span className="block truncate">{chapter.title}</span>
                        </button>
                        
                        {chapter.audioUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chapter.audioUrl) {
                                playAudio(chapter.audioUrl);
                              }
                            }}
                            className={`p-2 ${isPlaying && currentAudioUrl === chapter.audioUrl 
                              ? 'bg-primary' 
                              : 'bg-[#333333] hover:bg-primary'} text-white rounded-md transition-colors`}
                            title={isPlaying && currentAudioUrl === chapter.audioUrl 
                              ? 'Now playing' 
                              : 'Play narration'}
                          >
                            {isPlaying && currentAudioUrl === chapter.audioUrl ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No episodes available</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="md:col-span-9">
            <div className="bg-[#1F1F1F] rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                {selectedChapter ? (
                  <h2 className="text-2xl font-bold text-white">
                    {selectedChapter.title}
                  </h2>
                ) : (
                  <h2 className="text-2xl font-bold text-white">
                    {book.title}
                  </h2>
                )}
                <div className="flex items-center space-x-3">
                  <TextMagnifier />
                  <LikeButton bookId={params.id as string} className="text-white hover:text-red-500" />
                  <SaveButton bookId={params.id as string} className="text-white hover:text-primary" />
                </div>
              </div>
              {selectedChapter ? (
                <>
                  
                  {/* Audio Player for Chapter */}
                  {(selectedChapter.audioUrl || currentAudioUrl === selectedChapter.audioUrl) && (
                    <div className="mb-6">
                      <div className="bg-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Listen to Episode
                        </h3>
                        {currentAudioUrl === selectedChapter.audioUrl ? (
                          <AudioPlayer audioUrl={currentAudioUrl} />
                        ) : (
                          <button
                            onClick={() => playAudio(selectedChapter.audioUrl!)}
                            className="flex items-center justify-center gap-2 bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors w-full"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Play Narration
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
                  />
                </>
              ) : book.content ? (
                <>
                  {/* Audio Player for Book */}
                  {(book.audioUrl || currentAudioUrl === book.audioUrl) && (
                    <div className="mb-6">
                      <div className="bg-[#2a2a2a] rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Listen to Narration
                        </h3>
                        {currentAudioUrl === book.audioUrl ? (
                          <AudioPlayer audioUrl={currentAudioUrl} />
                        ) : (
                          <button
                            onClick={() => playAudio(book.audioUrl!)}
                            className="flex items-center justify-center gap-2 bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark transition-colors w-full"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Play Narration
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: book.content }}
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No content available for this book.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

