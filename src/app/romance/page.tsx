'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { FaHeart } from 'react-icons/fa';
import BookCard from '@/components/book/BookCard';

export default function RomancePage() {
  const [romanceBooks, setRomanceBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRomanceBooks = async () => {
      try {
        // Query books with the "Romance" tag
        const booksRef = collection(db, 'books');
        const romanceBooksQuery = query(
          booksRef,
          where('tags', 'array-contains', 'Romance')
        );
        
        const romanceSnapshot = await getDocs(romanceBooksQuery);
        
        if (romanceSnapshot.empty) {
          setRomanceBooks([]);
          setLoading(false);
          return;
        }
        
        // Map the documents to the books array
        const booksData = romanceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRomanceBooks(booksData);
      } catch (error) {
        console.error('Error fetching romance books:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRomanceBooks();
  }, []);

  const handleDeleteBook = (id: string) => {
    setRomanceBooks((prevBooks) => prevBooks.filter((book) => book.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">Romance Books</span>
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl">
            Discover our collection of romance novels featuring captivating love stories, passionate characters, and emotional journeys.
          </p>
        </div>

        {romanceBooks.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-[#1F1F1F] to-[#252525] rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
            <FaHeart className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-slide-up" />
            <h3 className="text-2xl font-bold text-white mb-2 animate-slide-up stagger-1">No romance books found</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto animate-slide-up stagger-2">Our romance collection is growing. Check back later for exciting new titles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {romanceBooks.map((book, index) => (
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