'use client';

// This file should be imported in the root layout.tsx to initialize debugging tools

// Import the audio debugger to ensure it's initialized
import '@/utils/audioDebugger';

// Log initialization
console.log('🔍 Audio debugging tools initialized');

// Export a dummy function to prevent tree-shaking
export function initDebugTools() {
  console.log('Debug tools ready');
}

// This is a self-executing function that will run when this module is imported
// Only run in browser environment
if (typeof window !== 'undefined') {
  (function() {
    console.log('🔧 Audio URL debugging active');
    console.log('❗ If you see blob: URLs, they will not work in production!');
    console.log('✅ Only https://firebasestorage.googleapis.com/... URLs will work');
  })();
}
