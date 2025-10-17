'use client';

import { useState } from 'react';
import { getUserProfile, setUserAsAdmin } from '@/firebase/services';

export default function CreateAdminPage() {
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // This ensures this page only works in development mode
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>This page is only available in development mode.</p>
      </div>
    );
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!uid) {
        setMessage('Please enter a user ID');
        setLoading(false);
        return;
      }

      await setUserAsAdmin(uid);
      
      // Verify the user is now an admin
      const userProfile = await getUserProfile(uid);
      
      if (userProfile && userProfile.role === 'admin') {
        setMessage(`Success! User ${uid} is now an admin.`);
      } else {
        setMessage('Operation completed, but could not verify admin status.');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Create Admin User</h1>
      <p className="text-red-500 font-bold mb-4">
        WARNING: This page is for development use only. 
        It allows you to set any user as an admin.
      </p>

      <form onSubmit={handleCreateAdmin} className="max-w-md">
        <div className="mb-4">
          <label htmlFor="uid" className="block text-sm font-medium mb-1">
            User ID (UID)
          </label>
          <input
            type="text"
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter the Firebase user ID"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            This is the Firebase Authentication UID of the user
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Processing...' : 'Make Admin'}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
