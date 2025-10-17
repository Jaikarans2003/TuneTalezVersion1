'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminBookForm from '@/components/admin/AdminBookForm';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import Link from 'next/link';

export default function AdminWritePage() {
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  // Handle successful book creation
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
        
        {success ? (
          <div className="max-w-md mx-auto p-6 bg-green-100 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Book Published Successfully!</h2>
            <p className="text-green-700">Redirecting to admin dashboard...</p>
          </div>
        ) : (
          <AdminBookForm onSuccess={handleSuccess} />
        )}
      </div>
    </AdminProtectedRoute>
  );
}
