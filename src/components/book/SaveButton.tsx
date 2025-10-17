'use client';

import React, { useState, useEffect } from 'react';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface SaveButtonProps {
  bookId: string;
  className?: string;
}

export default function SaveButton({ bookId, className = '' }: SaveButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkIfSaved = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid),
          where('bookId', '==', bookId)
        );
        
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        
        if (!bookmarksSnapshot.empty) {
          setIsSaved(true);
          setBookmarkId(bookmarksSnapshot.docs[0].id);
        } else {
          setIsSaved(false);
          setBookmarkId(null);
        }
      } catch (error) {
        console.error('Error checking bookmark status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkIfSaved();
  }, [user, bookId]);

  const toggleSave = async () => {
    if (!user) {
      // Redirect to login or show login modal
      alert('Please sign in to save books');
      return;
    }

    setLoading(true);

    try {
      if (isSaved && bookmarkId) {
        // Unsave the book
        await deleteDoc(doc(db, 'bookmarks', bookmarkId));
        setIsSaved(false);
        setBookmarkId(null);
      } else {
        // Save the book
        const newBookmark = await addDoc(collection(db, 'bookmarks'), {
          userId: user.uid,
          bookId,
          createdAt: new Date()
        });
        setIsSaved(true);
        setBookmarkId(newBookmark.id);
      }
      
      // Refresh the page if we're on the saved page
      if (pathname === '/saved') {
        router.refresh();
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleSave}
      disabled={loading}
      className={`flex items-center justify-center transition-all ${className}`}
      aria-label={isSaved ? 'Unsave book' : 'Save book'}
    >
      {loading ? (
        <div className="animate-pulse">
          <FaRegBookmark className="h-5 w-5 text-gray-400" />
        </div>
      ) : isSaved ? (
        <FaBookmark className="h-5 w-5 text-primary" />
      ) : (
        <FaRegBookmark className="h-5 w-5 hover:text-primary" />
      )}
    </button>
  );
}