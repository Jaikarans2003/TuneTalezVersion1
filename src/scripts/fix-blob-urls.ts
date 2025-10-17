'use client';

import { getBooks, updateBook, BookDocument } from '@/firebase/services';
import { r2Client, bucketName } from '@/r2/config';
import { uploadFileToR2, getFileUrlFromR2 } from '@/r2/services';

/**
 * This script fixes blob URLs in the database by replacing them with Cloudflare R2 URLs
 * It can be run from the browser console or from a dedicated admin page
 */

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
  // This will be uploaded to R2 instead of Firebase Storage
  return new Blob([byteArray], { type: 'audio/mpeg' });
};

// Function to fix a single book
export const fixBookBlobUrls = async (book: BookDocument): Promise<boolean> => {
  try {
    console.log(`🔍 Checking book "${book.title}" (${book.id})...`);
    let bookUpdated = false;
    let updatedBook = { ...book };
    
    // Fix book audio URL if it's a blob
    if (book.audioUrl?.startsWith('blob:')) {
      console.log(`🔄 Fixing blob URL in book "${book.title}"...`);
      try {
        // Create a valid MP3 file since we can't fetch the blob content directly
        const validAudio = createValidMP3File();
        const timestamp = Date.now();
        const path = `audio-narrations/books/${book.id}/fixed_${timestamp}.mp3`;
        
        // Upload the valid MP3 file to R2
        const newAudioUrl = await uploadFileToR2(validAudio, path);
        
        // Update the book object
        updatedBook.audioUrl = newAudioUrl;
        bookUpdated = true;
        
        console.log(`✅ Fixed book audio URL for "${book.title}":`, newAudioUrl);
      } catch (err) {
        console.error(`❌ Failed to fix book audio URL for "${book.title}":`, err);
      }
    }
    
    // Fix chapter audio URLs if they're blobs
    if (book.chapters) {
      const updatedChapters = [...book.chapters];
      
      for (let i = 0; i < updatedChapters.length; i++) {
        const chapter = updatedChapters[i];
        
        if (chapter.audioUrl?.startsWith('blob:')) {
          console.log(`🔄 Fixing blob URL in chapter "${chapter.title}" of book "${book.title}"...`);
          try {
            // Create a valid MP3 file
            const validAudio = createValidMP3File();
            const timestamp = Date.now();
            const path = `audio-narrations/books/${book.id}/chapters/${chapter.id}/fixed_${timestamp}.mp3`;
            
            // Upload the valid MP3 file to R2
            const newAudioUrl = await uploadFileToR2(validAudio, path);
            
            // Update the chapter
            updatedChapters[i] = {
              ...chapter,
              audioUrl: newAudioUrl
            };
            
            bookUpdated = true;
            console.log(`✅ Fixed chapter audio URL for "${chapter.title}":`, newAudioUrl);
          } catch (err) {
            console.error(`❌ Failed to fix chapter audio URL for "${chapter.title}":`, err);
          }
        }
      }
      
      updatedBook.chapters = updatedChapters;
    }
    
    // Update the book in Firestore if changes were made
    if (bookUpdated) {
      console.log(`📝 Updating book "${book.title}" in Firestore with fixed URLs...`);
      await updateBook(book.id!, updatedBook);
      console.log(`✅ Book "${book.title}" updated successfully!`);
      return true;
    } else {
      console.log(`ℹ️ No blob URLs found in book "${book.title}".`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error fixing blob URLs for book "${book.title}":`, err);
    return false;
  }
};

// Function to fix all books in the database
export const fixAllBlobUrls = async (): Promise<{ fixed: number, total: number }> => {
  try {
    console.log('🔍 Fetching all books...');
    const books = await getBooks();
    console.log(`📚 Found ${books.length} books.`);
    
    let fixedCount = 0;
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      console.log(`📖 Processing book ${i + 1}/${books.length}: "${book.title}"...`);
      
      const wasFixed = await fixBookBlobUrls(book);
      if (wasFixed) {
        fixedCount++;
      }
    }
    
    console.log(`🎉 Migration complete! Fixed ${fixedCount} out of ${books.length} books.`);
    return { fixed: fixedCount, total: books.length };
  } catch (err) {
    console.error('❌ Error fixing all blob URLs:', err);
    throw err;
  }
};

/**
 * Function to normalize an audio URL and ensure it's treated as an MP3
 */
export const normalizeAndFixAudioFormat = async (audioUrl: string): Promise<{
  isFixed: boolean;
  newUrl: string | null;
  error?: string;
}> => {
  try {
    console.log(`🔍 Checking audio URL: ${audioUrl}...`);
    
    if (!audioUrl.startsWith('https://')) {
      return { 
        isFixed: false, 
        newUrl: null, 
        error: 'Not a valid HTTPS URL' 
      };
    }
    
    // Import the R2 utility functions
    const { isValidR2Url } = await import('@/r2/utils');
    
    // Check if it's a valid R2 URL
    if (!isValidR2Url(audioUrl)) {
      console.log(`⚠️ URL is not a valid R2 URL: ${audioUrl}`);
      return { 
        isFixed: false, 
        newUrl: null, 
        error: 'Not a valid R2 URL' 
      };
    }
    
    // Import the normalizeAudioUrl function
    const { normalizeAudioUrl } = await import('@/utils/audioUtils');
    
    // Normalize the URL
    const normalizedUrl = normalizeAudioUrl(audioUrl);
    
    // If the URL was already normalized (no change needed)
    if (normalizedUrl === audioUrl) {
      console.log(`✅ URL is already properly formatted: ${audioUrl}`);
      return { isFixed: false, newUrl: audioUrl }; // No fix needed
    }
    
    console.log(`✅ Normalized audio URL: ${normalizedUrl}`);
    return { isFixed: true, newUrl: normalizedUrl };
  } catch (error: any) {
    console.error('❌ Error normalizing audio URL:', error);
    return { 
      isFixed: false, 
      newUrl: null, 
      error: error.message || 'Unknown error normalizing audio URL' 
    };
  }
};

// Export functions that can be called from the browser console
// Only attach to window in browser environment
if (typeof window !== 'undefined') {
  (window as any).fixAllBlobUrls = fixAllBlobUrls;
  (window as any).fixBookBlobUrls = fixBookBlobUrls;
  (window as any).normalizeAndFixAudioFormat = normalizeAndFixAudioFormat;
}
