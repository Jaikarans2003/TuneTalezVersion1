'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile, logout, updateRole, updateProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    // Only redirect if we're sure the user is not logged in (not during initial loading)
    if (!user && !loading) {
      // Add a small delay to prevent immediate redirect during auth state changes
      const redirectTimer = setTimeout(() => {
        if (!user) {
          router.push('/auth/signin');
        }
      }, 500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, loading, router]);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setPhoneNumber(profile.phoneNumber || '');
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setMessage('');
      await updateProfile({ bio, phoneNumber });
      setMessage('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      setMessage('Failed to update profile. Please try again.');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-[#1F1F1F] rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-[#1F1F1F] rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-white">Loading profile...</p>
        </div>
      </div>
    }>
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-[#1F1F1F] rounded-lg shadow-lg overflow-hidden">
        {/* Header section with user info */}
        <div className="p-6 bg-[#2a2a2a] border-b border-[#3a3a3a]">
          <div className="flex items-center">
            <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden mr-6">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-medium text-white">{user.email?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user.displayName || user.email?.split('@')[0]}</h1>
              <p className="text-gray-400">{user.email}</p>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[#3a3a3a] text-sm text-white capitalize">
                {profile.role}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="p-6">
          {message && (
            <div className="mb-6 p-4 rounded-md bg-green-900 text-white">
              {message}
            </div>
          )}

          {/* Profile Information Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Profile Information</h2>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 bg-[#3a3a3a] text-white rounded-md hover:bg-[#4a4a4a]"
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded-md border border-[#3a3a3a] focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-400 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded-md border border-[#3a3a3a] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setBio(profile.bio || '');
                      setPhoneNumber(profile.phoneNumber || '');
                    }}
                    className="px-4 py-2 bg-[#3a3a3a] text-white rounded-md hover:bg-[#4a4a4a]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Bio</h3>
                  <p className="text-white mt-1">{profile.bio || 'No bio added yet'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Phone Number</h3>
                  <p className="text-white mt-1">{profile.phoneNumber || 'No phone number added'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#3a3a3a] pt-6 flex flex-col sm:flex-row gap-4">
            <Link href="/" className="px-4 py-2 bg-[#2a2a2a] text-white rounded-md text-center hover:bg-[#3a3a3a]">
              Back to Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-900 text-white rounded-md hover:bg-red-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
    </Suspense>
  );
}