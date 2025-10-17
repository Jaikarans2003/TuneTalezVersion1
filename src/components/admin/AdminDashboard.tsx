'use client';

import { useState, FC } from 'react';
// @ts-ignore - Ignoring missing type declarations
import UserManagement from './UserManagement';
// @ts-ignore - Ignoring missing type declarations
import ContentManagement from './ContentManagement';
// @ts-ignore - Ignoring missing type declarations
import AdminStats from './AdminStats';
import AdminDirectUploadForm from './AdminDirectUploadForm';
import AdminPdfUpload from './AdminPdfUpload';
import AdminBookForm from './AdminBookForm';
import { useRouter } from 'next/navigation';

type TabType = 'stats' | 'users' | 'content' | 'write' | 'upload';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [bookSuccess, setBookSuccess] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const router = useRouter();

  // Handle successful book creation
  const handleBookSuccess = () => {
    setBookSuccess(true);
    // Reset after 2 seconds
    setTimeout(() => {
      setBookSuccess(false);
      setActiveTab('content');
    }, 2000);
  };
  
  // Handle successful PDF upload
  const handlePdfSuccess = () => {
    setPdfSuccess(true);
    // Reset after 2 seconds
    setTimeout(() => {
      setPdfSuccess(false);
      setActiveTab('content');
    }, 2000);
  };

  return (
    <div className="bg-[#1F1F1F] rounded-lg shadow-lg text-white">
      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-[#303030]">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'stats'
              ? 'border-b-2 border-[#FF0000] text-[#FF0000]'
              : 'text-white hover:bg-[#303030] transition-colors'
          }`}
        >
          Dashboard Stats
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'users'
              ? 'border-b-2 border-[#FF0000] text-[#FF0000]'
              : 'text-white hover:bg-[#303030] transition-colors'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'content'
              ? 'border-b-2 border-[#FF0000] text-[#FF0000]'
              : 'text-white hover:bg-[#303030] transition-colors'
          }`}
        >
          Content Management
        </button>
        <button
          onClick={() => setActiveTab('write')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'write'
              ? 'border-b-2 border-[#FF0000] text-[#FF0000]'
              : 'text-white hover:bg-[#303030] transition-colors'
          }`}
        >
          Write Book
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-3 text-sm font-medium ${
            activeTab === 'upload'
              ? 'border-b-2 border-[#FF0000] text-[#FF0000]'
              : 'text-white hover:bg-[#303030] transition-colors'
          }`}
        >
          Upload PDF
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'stats' && <AdminStats />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'content' && <ContentManagement />}
        {activeTab === 'write' && (
          bookSuccess ? (
            <div className="max-w-md mx-auto p-6 bg-[#303030] border border-[#FF0000] rounded-lg text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Book Published Successfully!</h2>
              <p className="text-gray-300">Redirecting to content management...</p>
            </div>
          ) : (
            <AdminBookForm onSuccess={handleBookSuccess} />
          )
        )}
        {activeTab === 'upload' && (
          pdfSuccess ? (
            <div className="max-w-md mx-auto p-6 bg-[#303030] border border-[#FF0000] rounded-lg text-center">
              <h2 className="text-2xl font-bold text-white mb-2">PDF Uploaded Successfully!</h2>
              <p className="text-gray-300">Redirecting to content management...</p>
            </div>
          ) : (
            <AdminPdfUpload onUploadSuccess={handlePdfSuccess} />
          )
        )}
      </div>
    </div>
  );
}
