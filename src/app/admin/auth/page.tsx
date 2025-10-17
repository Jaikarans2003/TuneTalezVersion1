'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { signIn } from '@/firebase/auth';

// Default admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin@tunetalez.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export default function AdminAuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check if using default admin credentials
      if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
        // Set admin session in localStorage with special default admin marker
        localStorage.setItem('adminSession', JSON.stringify({
          uid: 'default-admin',
          email: DEFAULT_ADMIN_EMAIL,
          timestamp: Date.now(),
          isDefaultAdmin: true,
          // Session expires in 2 hours
          expiresAt: Date.now() + (2 * 60 * 60 * 1000)
        }));
        
        // Redirect to admin dashboard
        router.push('/admin');
        return;
      }

      // If not using default credentials, proceed with Firebase auth
      const userCredential = await signIn(email, password);
      const user = userCredential.user;
      
      // Then check if this user has admin privileges
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData && userData.role === 'admin') {
        // Set admin session in localStorage
        localStorage.setItem('adminSession', JSON.stringify({
          uid: user.uid,
          email: user.email,
          timestamp: Date.now(),
          // Session expires in 2 hours
          expiresAt: Date.now() + (2 * 60 * 60 * 1000)
        }));
        
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        setError('You do not have admin privileges');
        setLoading(false);
      }
    } catch (error) {
      console.error('Admin authentication error:', error);
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="max-w-md w-full p-8 bg-[#1F1F1F] rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Login</h1>
          <p className="text-gray-400 mt-2">
            Enter your credentials to access the admin dashboard
          </p>
          <div className="mt-4 p-3 bg-[#303030] border border-[#FF0000] rounded-md text-sm text-left">
            <p className="font-bold text-white">Default Admin Credentials:</p>
            <p className="text-gray-300">Email: {DEFAULT_ADMIN_EMAIL}</p>
            <p className="text-gray-300">Password: {DEFAULT_ADMIN_PASSWORD}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#3A1212] border border-[#FF0000] text-white rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-[#303030] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF0000] bg-[#2A2A2A] text-white"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-[#303030] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF0000] bg-[#2A2A2A] text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF0000] text-white py-2 px-4 rounded-md hover:bg-[#CC0000] transition-colors disabled:bg-gray-600"
          >
            {loading ? 'Authenticating...' : 'Login to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
