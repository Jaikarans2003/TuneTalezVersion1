'use client';

/**
 * Utility functions for handling R2 URLs
 */

/**
 * Validates that a URL is a proper R2 HTTPS URL
 * @param url The URL to validate
 * @returns true if the URL is a valid R2 URL, false otherwise
 */
export const isValidR2Url = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // Check if it's a blob URL
  if (url.startsWith('blob:')) {
    console.error('❌ Invalid URL: Blob URLs are not allowed', url);
    return false;
  }
  
  // Check if it's an HTTPS URL
  if (!url.startsWith('https://')) {
    console.error('❌ Invalid URL: URLs must start with https://', url);
    return false;
  }
  
  // Check if it's an R2 URL
  if (!url.includes('r2.cloudflarestorage.com')) {
    console.warn('⚠️ URL may not be an R2 URL', url);
    // Still return true as it might be a valid HTTPS URL from another source
  }
  
  return true;
};

/**
 * Ensures a URL is a valid R2 HTTPS URL
 * If not, returns null and logs an error
 * @param url The URL to ensure
 * @returns The URL if valid, null otherwise
 */
export const ensureR2Url = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  if (!isValidR2Url(url)) {
    console.error('❌ Invalid R2 URL rejected:', url);
    return null;
  }
  
  return url;
};

/**
 * Gets the filename from an R2 URL
 * @param url The R2 URL
 * @returns The filename or null if not a valid URL
 */
export const getFilenameFromR2Url = (url: string | null | undefined): string | null => {
  if (!url || !isValidR2Url(url)) return null;
  
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname);
    
    if (!path) return null;
    
    // Get the filename from the path
    const filename = path.split('/').pop();
    return filename || null;
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return null;
  }
};

/**
 * Normalizes an R2 URL to ensure it's treated as an audio file
 * @param url The URL to normalize
 * @returns The normalized URL with format hint if needed
 */
export const normalizeAudioUrl = (url: string): string => {
  if (!url) return url;
  
  // For R2 URLs that don't end with a recognized audio extension,
  // append a fake query parameter to help with format detection
  if (url.includes("r2.cloudflarestorage.com") && 
      !url.toLowerCase().endsWith(".mp3") && 
      !url.toLowerCase().endsWith(".wav")) {
    
    // Add a format hint query parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}format=audio/mp3`;
  }
  
  return url;
};

/**
 * Validates that a URL is a proper audio URL
 * @param url The URL to validate
 * @returns true if the URL is a valid audio URL, false otherwise
 */
export const validateAudioUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // Check if it's a valid URL first
  if (!isValidR2Url(url)) return false;
  
  // Check if it has an audio extension
  const hasAudioExtension = url.toLowerCase().endsWith('.mp3') || 
                           url.toLowerCase().endsWith('.wav') || 
                           url.toLowerCase().endsWith('.ogg') ||
                           url.toLowerCase().endsWith('.m4a');
  
  // Check if it has a format hint
  const hasFormatHint = url.includes('format=audio/');
  
  return hasAudioExtension || hasFormatHint;
};