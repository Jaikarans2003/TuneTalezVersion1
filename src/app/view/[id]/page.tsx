'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import PdfViewer from '@/components/pdf/PdfViewer';
import Link from 'next/link';

interface PdfData {
  name: string;
  url: string;
  createdAt: number;
}

export default function ViewPdfPage() {
  const params = useParams();
  const router = useRouter();
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdfData = async () => {
      if (!params.id) {
        setError('PDF ID is missing');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'pdfs', params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPdfData(docSnap.data() as PdfData);
        } else {
          setError('PDF not found');
        }
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('Failed to load PDF. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfData();
  }, [params.id]);

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
          Back to Documents
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
      ) : pdfData ? (
        <PdfViewer pdfUrl={pdfData.url} fileName={pdfData.name} />
      ) : null}
    </div>
  );
}