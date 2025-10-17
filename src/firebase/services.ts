import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDoc, getDocs, doc, query, where, orderBy, deleteDoc, setDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { app, db, auth } from './config';

// Auth functions
export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
  return await firebaseSignOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// User functions
export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  phoneNumber?: string;
  role: 'user' | 'admin' | 'reader' | 'author';
  createdAt: number;
}

export const createUserProfile = async (userProfile: Omit<UserProfile, 'id' | 'createdAt'>) => {
  try {
    const timestamp = Date.now();
    const userDoc = {
      ...userProfile,
      createdAt: timestamp
    };
    
    const docRef = await setDoc(doc(db, 'users', userProfile.uid), userDoc);
    return { ...userDoc, id: userProfile.uid };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
    
    // Get the updated user profile
    const updatedDoc = await getDoc(userRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as UserProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Update user role specifically
export const updateUserRole = async (uid: string, role: 'user' | 'admin' | 'reader' | 'author') => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role });
    
    // Get the updated user profile
    const updatedDoc = await getDoc(userRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as UserProfile;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Set user as admin specifically
export const setUserAsAdmin = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { role: 'admin' });
    
    // Get the updated user profile
    const updatedDoc = await getDoc(userRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as UserProfile;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    throw error;
  }
};

// PDF functions
export interface PdfDocument {
  id?: string;
  title: string;
  name?: string; // Some code uses 'name' instead of 'title'
  fileUrl: string;
  thumbnailUrl?: string;
  author: string;
  description?: string;
  tags: string[];
  createdAt: number;
  lastUpdated?: number;
}

export const uploadPdfFile = async (file: File, onProgress?: (progress: number) => void) => {
  try {
    const timestamp = Date.now();
    const path = `pdfs/${timestamp}_${file.name}`;
    
    // Import R2 services
    const { uploadFileToR2 } = await import('@/r2/services');
    
    // Upload to R2
    const url = await uploadFileToR2(file, path, onProgress);
    
    // Create a basic PDF document in Firestore
    const pdfDoc = {
      title: file.name.replace(/\.pdf$/i, ''),
      name: file.name,
      fileUrl: url,
      author: 'Unknown', // Default author
      description: '', // Empty string instead of undefined
      tags: [],
      createdAt: timestamp,
      lastUpdated: timestamp
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'pdfs'), pdfDoc);
    
    return url;
  } catch (error) {
    console.error('Error in uploadPdfFile:', error);
    throw error;
  }
};

export const uploadPdfThumbnail = async (file: File, onProgress?: (progress: number) => void) => {
  try {
    const timestamp = Date.now();
    const path = `thumbnails/pdf/${timestamp}_${file.name}`;
    
    // Import R2 services
    const { uploadFileToR2 } = await import('@/r2/services');
    
    // Upload to R2
    const url = await uploadFileToR2(file, path, onProgress);
    return url;
  } catch (error) {
    console.error('Error in uploadPdfThumbnail:', error);
    throw error;
  }
};

export const createPdf = async (pdf: Omit<PdfDocument, 'id' | 'createdAt' | 'lastUpdated'>) => {
  try {
    const timestamp = Date.now();
    const pdfDoc = {
      ...pdf,
      createdAt: timestamp,
      lastUpdated: timestamp
    };
    
    const docRef = await addDoc(collection(db, 'pdfs'), pdfDoc);
    return { ...pdfDoc, id: docRef.id } as PdfDocument;
  } catch (error) {
    console.error('Error creating PDF document:', error);
    throw error;
  }
};

export const getPdfs = async () => {
  try {
    // Using orderBy requires an index to be created in Firebase
    // Index has been created for 'createdAt' in descending order
    const q = query(collection(db, 'pdfs'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PdfDocument));
  } catch (error) {
    console.error('Error getting PDFs:', error);
    throw error;
  }
};

export const getPdfById = async (id: string) => {
  try {
    const docRef = doc(db, 'pdfs', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as PdfDocument;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting PDF:', error);
    throw error;
  }
};

export const deletePdf = async (pdf: PdfDocument) => {
  try {
    // Import R2 services
    const { deleteFileFromR2, firebaseUrlToR2Path } = await import('@/r2/services');
    
    // Delete the PDF file from R2 Storage
    if (pdf.fileUrl) {
      const filePath = firebaseUrlToR2Path(pdf.fileUrl);
      if (filePath) {
        await deleteFileFromR2(filePath);
      }
    }
    
    // Delete the thumbnail from R2 Storage if it exists
    if (pdf.thumbnailUrl) {
      const thumbnailPath = firebaseUrlToR2Path(pdf.thumbnailUrl);
      if (thumbnailPath) {
        await deleteFileFromR2(thumbnailPath);
      }
    }
    
    // Delete the document from Firestore
    await deleteDoc(doc(db, 'pdfs', pdf.id!));
    
    return true;
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
};

// Book functions
export interface Chapter {
  id?: string;
  bookId?: string; // Reference to the parent book
  title: string;
  content: string;
  order: number;
  createdAt: number;
  audioUrl?: string; // URL to the narration audio file
  paragraphAudioUrls?: string[]; // URLs for individual paragraph audio files
  episodeMetadata?: {
    mood?: string;
    genre?: string;
    intensity?: number;
  }; // Metadata for the episode
}

// Interface for Book document
export interface BookDocument {
  id?: string;
  title: string;
  content?: string; // Main content for single-chapter books
  description: string; // Summary/description of the book
  author: string;
  tags: string[];
  thumbnailUrl: string;
  createdAt: number;
  chapters: Chapter[]; // Array of chapters/episodes
  lastUpdated?: number; // Track when the book was last updated
  audioUrl?: string; // URL to the narration audio file
}

// Upload Book Thumbnail to R2 Storage
export const uploadBookThumbnail = async (file: File, onProgress?: (progress: number) => void) => {
  try {
    const timestamp = Date.now();
    const path = `thumbnails/book/${timestamp}_${file.name}`;
    
    // Import R2 services
    const { uploadFileToR2 } = await import('@/r2/services');
    
    // Upload to R2
    const url = await uploadFileToR2(file, path, onProgress);
    return url;
  } catch (error) {
    console.error('Error in uploadBookThumbnail:', error);
    throw error;
  }
};

// Create a new book in Firestore
export const createBook = async (book: Omit<BookDocument, 'id' | 'createdAt' | 'lastUpdated'>): Promise<BookDocument> => {
  try {
    const timestamp = Date.now();
    const bookDoc: Omit<BookDocument, 'id'> = {
      ...book,
      // Ensure all required fields exist
      title: book.title,
      content: book.content || '',
      description: book.description || '',
      author: book.author,
      tags: book.tags || [],
      thumbnailUrl: book.thumbnailUrl,
      audioUrl: book.audioUrl || '',
      createdAt: timestamp,
      lastUpdated: timestamp,
      // Ensure chapters array exists and all chapters have required fields
      chapters: (book.chapters || []).map(chapter => ({
        ...chapter,
        id: chapter.id || `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: chapter.title,
        content: chapter.content,
        order: typeof chapter.order === 'number' ? chapter.order : 0,
        createdAt: chapter.createdAt || timestamp,
        audioUrl: chapter.audioUrl || '',
        bookId: chapter.bookId || ''
      }))
    };
    
    const docRef = await addDoc(collection(db, 'books'), bookDoc);
    return { ...bookDoc, id: docRef.id } as BookDocument;
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
};

// Update an existing book in Firestore
export const updateBook = async (bookId: string, updates: Partial<Omit<BookDocument, 'id' | 'createdAt'>>): Promise<BookDocument> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    // Update with new data and set lastUpdated timestamp
    const timestamp = Date.now();
    const updateData: any = {
      ...updates,
      lastUpdated: timestamp
    };
    
    // If chapters are being updated, ensure all chapters have required fields
    if (updates.chapters) {
      updateData.chapters = updates.chapters.map((chapter: Chapter) => ({
        ...chapter,
        id: chapter.id || `chapter_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        title: chapter.title,
        content: chapter.content,
        order: typeof chapter.order === 'number' ? chapter.order : 0,
        createdAt: chapter.createdAt || timestamp,
        audioUrl: chapter.audioUrl || '',
        bookId: chapter.bookId || bookId
      }));
    }
    
    // Ensure audioUrl is never undefined
    if (updates.audioUrl === undefined) {
      const currentData = bookSnap.data();
      updateData.audioUrl = currentData?.audioUrl || '';
    }
    
    await setDoc(bookRef, updateData, { merge: true });
    
    // Get the updated book
    const updatedBookSnap = await getDoc(bookRef);
    return { id: bookId, ...updatedBookSnap.data() } as BookDocument;
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
};

// Get all books from Firestore
export const getBooks = async () => {
  try {
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookDocument));
  } catch (error) {
    console.error('Error getting books:', error);
    throw error;
  }
};

// Get a single book by ID
export const getBookById = async (id: string): Promise<BookDocument | null> => {
  try {
    const docRef = doc(db, 'books', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BookDocument;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting book:', error);
    throw error;
  }
};

// Delete book from Firestore and R2 Storage
export const deleteBook = async (book: BookDocument) => {
  try {
    // Delete the thumbnail from R2 Storage
    if (book.thumbnailUrl) {
      // Import R2 services
      const { deleteFileFromR2, firebaseUrlToR2Path } = await import('@/r2/services');
      
      // Convert the URL to a path
      const path = firebaseUrlToR2Path(book.thumbnailUrl);
      
      if (path) {
        // Delete the file from R2
        await deleteFileFromR2(path);
      }
    }
    
    // Delete the document from Firestore
    await deleteDoc(doc(db, 'books', book.id!));
    
    return true;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
};

// Add a new chapter to a book
export const addChapter = async (bookId: string, chapter: Omit<Chapter, 'id' | 'createdAt'>): Promise<Chapter> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookSnap.data() as BookDocument;
    const chapters = bookData.chapters || [];
    
    // Create new chapter with ID and timestamp
    const newChapter: Chapter = {
      ...chapter,
      id: `chapter_${Date.now()}`, // Generate a unique ID
      createdAt: Date.now(),
    };
    
    // Add chapter to the book
    const updatedChapters = [...chapters, newChapter];
    
    // Update the book document
    await setDoc(bookRef, { 
      chapters: updatedChapters,
      lastUpdated: Date.now()
    }, { merge: true });
    
    return newChapter;
  } catch (error) {
    console.error('Error adding chapter:', error);
    throw error;
  }
};

// Update an existing chapter
export const updateChapter = async (bookId: string, chapterId: string, updates: Partial<Omit<Chapter, 'id' | 'createdAt'>>): Promise<Chapter> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    if (!chapterId) throw new Error('Chapter ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookSnap.data() as BookDocument;
    const chapters = bookData.chapters || [];
    
    // Find the chapter to update
    const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      throw new Error('Chapter not found');
    }
    
    // Update the chapter
    const updatedChapter = {
      ...chapters[chapterIndex],
      ...updates
    };
    
    // Replace the chapter in the array
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    
    // Update the book document
    await setDoc(bookRef, { 
      chapters: updatedChapters,
      lastUpdated: Date.now()
    }, { merge: true });
    
    return updatedChapter;
  } catch (error) {
    console.error('Error updating chapter:', error);
    throw error;
  }
};

// Delete a chapter
export const deleteChapter = async (bookId: string, chapterId: string): Promise<void> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    if (!chapterId) throw new Error('Chapter ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookSnap.data() as BookDocument;
    const chapters = bookData.chapters || [];
    
    // Filter out the chapter to delete
    const updatedChapters = chapters.filter(ch => ch.id !== chapterId);
    
    // Update the book document
    await setDoc(bookRef, { 
      chapters: updatedChapters,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    throw error;
  }
};

// Reorder chapters
export const reorderChapters = async (bookId: string, newOrder: string[]): Promise<void> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookSnap.data() as BookDocument;
    const chapters = bookData.chapters || [];
    
    // Create a map of chapters by ID for quick lookup
    const chaptersMap = new Map(chapters.map(chapter => [chapter.id, chapter]));
    
    // Create the new ordered array
    const reorderedChapters = newOrder
      .map((id, index) => {
        const chapter = chaptersMap.get(id);
        if (!chapter) return null;
        
        // Update the order property
        return {
          ...chapter,
          order: index
        };
      })
      .filter((chapter): chapter is Chapter => chapter !== null);
    
    // Update the book document
    await setDoc(bookRef, { 
      chapters: reorderedChapters,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error reordering chapters:', error);
    throw error;
  }
};

// Upload audio narration file to R2 Storage
export const uploadAudioNarration = async (
  file: Blob | File,
  bookId: string,
  chapterId?: string,
  onProgress?: (progress: number) => void,
  retryAttempt: number = 0
): Promise<string> => {
  try {
    console.log('Starting audio upload to R2 Storage:', { bookId, chapterId, fileSize: file.size, retryAttempt });
    
    const timestamp = Date.now();
    const fileName = `${timestamp}_narration${chapterId ? `_${chapterId}` : ''}.mp3`;
    
    // Create a dedicated 'audio-narrations' directory at the root level to match your structure
    const path = chapterId 
      ? `audio-narrations/books/${bookId}/chapters/${chapterId}/${fileName}`
      : `audio-narrations/books/${bookId}/${fileName}`;
    
    console.log('Audio upload path:', path);
    
    // Import R2 services
    const { uploadFileToR2 } = await import('@/r2/services');
    
    // Upload to R2
    const url = await uploadFileToR2(file, path, onProgress);
    console.log('Upload complete, R2 URL:', url);
    
    return url;
  } catch (error) {
    console.error('Error uploading audio narration:', error);
    
    // Retry logic for failed uploads
    if (retryAttempt < 3) {
      console.log(`Retrying upload (attempt ${retryAttempt + 1})...`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return uploadAudioNarration(file, bookId, chapterId, onProgress, retryAttempt + 1);
    }
    
    throw error;
  }
};

// Update book with audio narration URL
export const updateBookAudio = async (bookId: string, audioUrl: string): Promise<BookDocument> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    // Update with audio URL
    const updateData = {
      audioUrl,
      lastUpdated: Date.now()
    };
    
    await setDoc(bookRef, updateData, { merge: true });
    
    // Get the updated book
    const updatedBookSnap = await getDoc(bookRef);
    return { id: bookId, ...updatedBookSnap.data() } as BookDocument;
  } catch (error) {
    console.error('Error updating book audio:', error);
    throw error;
  }
};

// Update chapter with audio narration URL
export const updateChapterAudio = async (
  bookId: string, 
  chapterId: string, 
  audioUrl: string, 
  paragraphAudioUrls?: string[],
  episodeMetadata?: { mood?: string; genre?: string; intensity?: number }
): Promise<Chapter> => {
  try {
    if (!bookId) throw new Error('Book ID is required');
    if (!chapterId) throw new Error('Chapter ID is required');
    
    // Get the current book
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      throw new Error('Book not found');
    }
    
    const bookData = bookSnap.data() as BookDocument;
    const chapters = bookData.chapters || [];
    
    // Find the chapter to update
    const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
    if (chapterIndex === -1) {
      throw new Error('Chapter not found');
    }
    
    // Update the chapter with audio URL and additional data if provided
    const updatedChapter = {
      ...chapters[chapterIndex],
      audioUrl,
      ...(paragraphAudioUrls && { paragraphAudioUrls }),
      ...(episodeMetadata && { episodeMetadata })
    };
    
    // Replace the chapter in the array
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex] = updatedChapter;
    
    // Update the book document
    await setDoc(bookRef, { 
      chapters: updatedChapters,
      lastUpdated: Date.now()
    }, { merge: true });
    
    return updatedChapter;
  } catch (error) {
    console.error('Error updating chapter audio:', error);
    throw error;
  }
};