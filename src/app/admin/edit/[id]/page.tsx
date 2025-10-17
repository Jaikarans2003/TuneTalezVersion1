'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdminBookForm from '@/components/admin/AdminBookForm';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import Link from 'next/link';
import { getBookById, BookDocument } from '@/firebase/services';

export default function AdminEditBookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const [book, setBook] = useState<BookDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const bookData = await getBookById(bookId);
        
        if (!bookData) {
          setError('Book not found');
          return;
        }
        
        setBook(bookData);
      } catch (err: any) {
        console.error('Error fetching book:', err);
        setError(`Failed to load book: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (bookId) {
      fetchBook();
    }
  }, [bookId]);

  // Handle successful book update
  const handleSuccess = () => {
    setSuccess(true);
    // Redirect to admin page after 2 seconds
    setTimeout(() => {
      router.push('/admin');
    }, 2000);
  };

  return (
    <AdminProtectedRoute>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link 
            href="/admin"
            className="text-primary hover:text-primary-dark transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Admin Dashboard
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
                href="/admin"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Return to Admin Dashboard
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="max-w-md mx-auto p-6 bg-green-100 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Book Updated Successfully!</h2>
            <p className="text-green-700">Redirecting to admin dashboard...</p>
          </div>
        ) : book ? (
          <AdminBookForm onSuccess={handleSuccess} existingBook={book} />
        ) : null}
      </div>
    </AdminProtectedRoute>
  );
}
