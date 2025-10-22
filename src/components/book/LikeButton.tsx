'use client';

import React, { useState, useEffect } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/config';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface LikeButtonProps {
  bookId: string;
  className?: string;
}

export default function LikeButton({ bookId, className = '' }: LikeButtonProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likeId, setLikeId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const likesQuery = query(
          collection(db, 'likes'),
          where('userId', '==', user.uid),
          where('bookId', '==', bookId)
        );
        
        const likesSnapshot = await getDocs(likesQuery);
        
        if (!likesSnapshot.empty) {
          setIsLiked(true);
          setLikeId(likesSnapshot.docs[0].id);
        } else {
          setIsLiked(false);
          setLikeId(null);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkIfLiked();
  }, [user, bookId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      // Redirect to login or show login modal
      alert('Please sign in to like books');
      return;
    }

    setLoading(true);

    try {
      if (isLiked && likeId) {
        // Unlike the book
        await deleteDoc(doc(db, 'likes', likeId));
        setIsLiked(false);
        setLikeId(null);
      } else {
        // Like the book
        const newLike = await addDoc(collection(db, 'likes'), {
          userId: user.uid,
          bookId,
          createdAt: new Date()
        });
        setIsLiked(true);
        setLikeId(newLike.id);
      }
      
      // Refresh the page if we're on the liked page
      if (pathname === '/liked') {
        router.refresh();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleLike}
      disabled={loading}
      className={`flex items-center justify-center transition-all ${className}`}
      aria-label={isLiked ? 'Unlike book' : 'Like book'}
    >
      {loading ? (
        <div className="animate-pulse">
          <FaRegHeart className="h-5 w-5 text-gray-400" />
        </div>
      ) : isLiked ? (
        <FaHeart className="h-5 w-5 text-red-500" />
      ) : (
        <FaRegHeart className="h-5 w-5 hover:text-red-500" />
      )}
    </button>
  );
}