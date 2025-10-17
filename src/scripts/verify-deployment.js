// Script to verify Firebase deployment
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Your web app's Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  // Your config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.R2_BUCKET_NAME || 'tunetalez';

async function verifyFirestoreRules() {
  console.log('Verifying Firestore Rules deployment...');
  try {
    // Try to access the pdfs collection (should be allowed for public read)
    const pdfsSnapshot = await getDocs(collection(db, 'pdfs'));
    console.log(`Successfully accessed pdfs collection. Found ${pdfsSnapshot.size} documents.`);
    
    // Try to access the books collection (should be allowed for public read)
    const booksSnapshot = await getDocs(collection(db, 'books'));
    console.log(`Successfully accessed books collection. Found ${booksSnapshot.size} documents.`);
    
    console.log('Firestore Rules verification: SUCCESS');
  } catch (error) {
    console.error('Firestore Rules verification: FAILED', error);
  }
}

async function verifyStorageRules() {
  console.log('Verifying R2 Storage access...');
  try {
    // Try to access the pdfs folder in R2 storage (should be allowed for public read)
    const pdfsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'pdfs/',
      MaxKeys: 10
    });
    
    const pdfsResult = await r2Client.send(pdfsCommand);
    console.log(`Successfully accessed pdfs storage in R2. Found ${pdfsResult.Contents?.length || 0} files.`);
    
    // Try to access the thumbnails/book folder in R2 storage (should be allowed for public read)
    const thumbnailsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'thumbnails/book/',
      MaxKeys: 10
    });
    
    const thumbnailsResult = await r2Client.send(thumbnailsCommand);
    console.log(`Successfully accessed thumbnails/book storage in R2. Found ${thumbnailsResult.Contents?.length || 0} files.`);
    
    console.log('R2 Storage access verification: SUCCESS');
  } catch (error) {
    console.error('R2 Storage access verification: FAILED', error);
  }
}

async function main() {
  console.log('Starting deployment verification...');
  await verifyFirestoreRules();
  await verifyStorageRules();
  console.log('Deployment verification completed.');
}

main().catch(console.error);