'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { FaBookmark } from 'react-icons/fa';
import BookCard from '@/components/book/BookCard';
import Link from 'next/link';

export default function SavedPage() {
  const { user } = useAuth();
  const [savedBooks, setSavedBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBooks = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Query the bookmarks collection for the current user
        const bookmarksQuery = query(
          collection(db, 'bookmarks'),
          where('userId', '==', user.uid)
        );
        
        const bookmarksSnapshot = await getDocs(bookmarksQuery);
        const bookIds = bookmarksSnapshot.docs.map(doc => doc.data().bookId);
        
        // If there are no saved books, set empty array and return
        if (bookIds.length === 0) {
          setSavedBooks([]);
          setLoading(false);
          return;
        }
        
        // Fetch the actual book data for each saved book
        const booksData = [];
        
        // Get all books at once to avoid multiple queries
        const booksRef = collection(db, 'books');
        const booksSnapshot = await getDocs(booksRef);
        const allBooks = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter books that match the saved book IDs
        for (const bookId of bookIds) {
          const matchedBook = allBooks.find(book => 
            book.id === bookId || book.id === bookId
          );
          
          if (matchedBook) {
            booksData.push(matchedBook);
          }
        }
        
        setSavedBooks(booksData);
      } catch (error) {
        console.error('Error fetching saved books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedBooks();
  }, [user]);

  const handleDeleteBook = (book: any) => {
    setSavedBooks((prevBooks) => prevBooks.filter((b) => b.id !== book.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-12 animate-fade-in">
            <div className="flex items-center mb-2">
              <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
              <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Collection</span>
            </div>
            <h1 className="text-5xl font-bold text-white flex items-center">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Saved Books</span>
            </h1>
          </div>
          
          {/* <div className="text-center py-16 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
            <FaBookmark className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" />
            <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">Please sign in to view your saved books</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">Sign in to access your saved books collection.</p>
            <Link 
              href="/auth/signin" 
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/80 transition-all"
            >
              Sign In
            </Link>
          </div> */}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center mb-2">
            <div className="w-10 h-1 bg-gradient-to-r from-primary to-orange rounded mr-3"></div>
            <span className="text-primary-light uppercase tracking-wider text-sm font-semibold">Collection</span>
          </div>
          <h1 className="text-5xl font-bold text-white flex items-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Saved Books</span>
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl">
            Your personal collection of bookmarked books. Find all your saved titles here for easy access.
          </p>
        </div>

        {savedBooks.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
            <FaBookmark className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" />
            <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">You haven't saved any books yet</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">Explore our collection and save books to find them here.</p>
            <Link 
              href="/"
              className="bg-orange/20 hover:bg-orange/30 text-orange-light font-medium py-2 px-6 rounded-lg transition-all duration-300 animate-slide-up stagger-3 hover:scale-105"
              suppressHydrationWarning
            >
              Explore Books
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {savedBooks.map((book, index) => (
              <div key={book.id} className={`animate-fade-in stagger-${Math.min(index % 5 + 1, 5)}`}>
                <BookCard book={book} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}