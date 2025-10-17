'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PdfUpload from '@/components/pdf/PdfUpload';
import { useAuth } from '@/context/AuthContext';

export default function UploadPage() {
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { user, loading } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  const handleUploadSuccess = () => {
    setUploadSuccess(true);
    // Redirect to home page after a short delay
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-secondary mb-8 text-center">Upload Book</h1>
      
      {uploadSuccess ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative max-w-md mx-auto" role="alert">
          <span className="block sm:inline">Book uploaded successfully! Redirecting to home page...</span>
        </div>
      ) : (
        <PdfUpload onUploadSuccess={handleUploadSuccess} />
      )}
    </div>
  );
}