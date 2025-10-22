// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB7byiynZrjiqAo8NDIurtBg-MVBolYSjY",
  authDomain: "tune-tales-7bc34.firebaseapp.com",
  projectId: "tune-tales-7bc34",
  storageBucket: "tune-tales-7bc34.firebasestorage.app",
  messagingSenderId: "73380609988",
  appId: "1:73380609988:web:deb202818f8a602f73ee91",
  measurementId: "G-54939GDQH8"
};

// Handle different environments - modify authDomain for local development
if (typeof window !== 'undefined') {
  // Check if we're running on localhost
  if (window.location.hostname === 'localhost') {
    firebaseConfig.authDomain = 'tune-tales-7bc34.firebaseapp.com';
  }
  
  // Add your deployed domain if needed
  if (window.location.hostname === 'tunetalez.com' || 
      window.location.hostname === 'www.tunetalez.com' ||
      window.location.hostname === 'tune-tales-7bc34.web.app' ||
      window.location.hostname === 'tune-tales-7bc34.firebaseapp.com') {
    firebaseConfig.authDomain = 'tune-tales-7bc34.firebaseapp.com';
  }
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };