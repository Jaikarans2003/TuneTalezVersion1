'use client';

import { useState } from 'react';
import { Share } from '@capacitor/share';
import { FaShare } from 'react-icons/fa';
import { generateShareCard, dataUrlToFile } from '@/utils/shareCardGenerator';

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  thumbnailUrl?: string;
  className?: string;
  iconOnly?: boolean;
  author?: string;
}

const ShareButton = ({ title, text, url, thumbnailUrl, className = '', iconOnly = false, author = 'TuneTalez' }: ShareButtonProps) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsSharing(true);
      
      // Generate the share card if we have a thumbnail
      let shareCardFile: File | undefined;
      if (thumbnailUrl) {
        try {
          const shareCardDataUrl = await generateShareCard(thumbnailUrl, title, author);
          shareCardFile = dataUrlToFile(shareCardDataUrl, 'tunetalez-share.jpg');
        } catch (cardError) {
          console.error('Error generating share card:', cardError);
          // Continue without the share card
        }
      }
      
      // Check if Web Share API is available (for web)
      if (navigator.share) {
        const shareData: any = {
          title,
          text,
          url
        };
        
        // If we have a share card and the browser supports sharing files
        if (shareCardFile && navigator.canShare) {
          try {
            // Check if we can share with files
            const filesShareData = {
              files: [shareCardFile],
              title,
              text,
              url
            };
            
            if (navigator.canShare(filesShareData)) {
              await navigator.share(filesShareData);
              setIsSharing(false);
              return;
            }
          } catch (imageError) {
            console.error('Error sharing with image:', imageError);
            // Fall back to regular sharing
          }
        }
        
        // Regular share without image
        await navigator.share(shareData);
      } else {
        // Use Capacitor Share plugin (for native)
        // For native apps, we need to save the file to device storage first
        // This is a simplified version - in a real app, you'd need to save the file to device storage
        // and then pass the file path to the Share API
        
        // For native apps, we need to handle files differently
        // Since we can't directly use File objects with Capacitor Share
        // We'll use the thumbnailUrl directly if available
        const files = thumbnailUrl ? [thumbnailUrl] : undefined;
        
        await Share.share({
          title,
          text,
          url,
          dialogTitle: 'Share this story',
          files
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`text-white hover:text-primary transition-colors ${className}`}
        aria-label="Share"
      >
        <FaShare className={`${isSharing ? 'animate-pulse' : ''}`} />
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary-light font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105 ${className}`}
      aria-label="Share"
    >
      <FaShare className={`${isSharing ? 'animate-pulse' : ''}`} />
      {isSharing ? 'Sharing...' : 'Share'}
    </button>
  );
};

export default ShareButton;