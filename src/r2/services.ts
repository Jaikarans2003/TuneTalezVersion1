'use client';

import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, bucketName } from './config';

/**
 * Uploads a file to Cloudflare R2
 * @param file The file to upload (Blob or File)
 * @param path The path in R2 where the file should be stored
 * @param onProgress Optional callback for upload progress
 * @returns Promise resolving to the URL of the uploaded file
 */
export const uploadFileToR2 = async (
  file: Blob | File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Create upload command
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type || 'application/octet-stream',
    });

    // Upload to R2
    await r2Client.send(uploadCommand);
    
    // Since R2 doesn't have built-in progress events like Firebase,
    // we'll simulate progress for the UI
    if (onProgress) {
      // Simulate upload progress (this is just for UI feedback)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(Math.min(progress, 100));
        if (progress >= 100) clearInterval(interval);
      }, 100);
    }
    
    // Generate a URL for the uploaded file
    const url = await getFileUrlFromR2(path);
    return url;
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw error;
  }
};

/**
 * Gets a signed URL for a file in R2
 * @param path The path of the file in R2
 * @param expiresIn Expiration time in seconds (default: 24 hours)
 * @returns Promise resolving to the signed URL
 */
export const getFileUrlFromR2 = async (
  path: string,
  expiresIn: number = 86400
): Promise<string> => {
  try {
    // Create a command to get the object
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: path,
    });
    
    // Generate a signed URL
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error getting file URL from R2:', error);
    throw error;
  }
};

/**
 * Checks if a file exists in R2
 * @param path The path of the file in R2
 * @returns Promise resolving to true if the file exists, false otherwise
 */
export const fileExistsInR2 = async (path: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: path,
    });
    
    await r2Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Deletes a file from R2
 * @param path The path of the file in R2
 * @returns Promise resolving when the file is deleted
 */
export const deleteFileFromR2 = async (path: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: path,
    });
    
    await r2Client.send(command);
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    throw error;
  }
};

/**
 * Converts a Firebase Storage URL to an R2 path
 * This is useful during migration to maintain the same path structure
 * @param firebaseUrl The Firebase Storage URL
 * @returns The equivalent R2 path
 */
export const firebaseUrlToR2Path = (firebaseUrl: string): string | null => {
  try {
    if (!firebaseUrl) return null;
    
    // Extract the path from the Firebase URL
    // Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
    const urlObj = new URL(firebaseUrl);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0]);
    
    if (!path) return null;
    
    return path;
  } catch (error) {
    console.error('Error converting Firebase URL to R2 path:', error);
    return null;
  }
};