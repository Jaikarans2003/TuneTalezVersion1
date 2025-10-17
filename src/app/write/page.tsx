'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookForm from '@/components/book/BookForm';
import { useAuth } from '@/context/AuthContext';

export default function WritePage() {
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  // Handle successful book creation
  const handleSuccess = () => {
    setSuccess(true);
    // Redirect to home page after 2 seconds
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8">
      {success ? (
        <div className="max-w-md mx-auto p-6 bg-green-100 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Book Published Successfully!</h2>
          <p className="text-green-700">Redirecting to home page...</p>
        </div>
      ) : (
        <BookForm onSuccess={handleSuccess} />
      )}
    </div>
  );
}