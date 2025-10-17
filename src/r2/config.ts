'use client';

import { S3Client } from '@aws-sdk/client-s3';

// Cloudflare R2 configuration
const r2Config = {
  region: 'auto',
  endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY || '',
  },
  // Use path-style endpoint
  forcePathStyle: true,
  // Configure fetch options to fix CORS issues
  requestHandler: {
    disableHostPrefix: true
  }
};

// Initialize R2 client
const r2Client = new S3Client(r2Config);

// Bucket name
const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'tunetalez';

export { r2Client, bucketName };