// Script to create an admin user
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7byiynZrjiqAo8NDIurtBg-MVBolYSjY",
  authDomain: "tune-tales-7bc34.firebaseapp.com",
  projectId: "tune-tales-7bc34",
  storageBucket: "tune-tales-7bc34.firebasestorage.app",
  messagingSenderId: "73380609988",
  appId: "1:73380609988:web:deb202818f8a602f73ee91",
  measurementId: "G-54939GDQH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Default admin credentials - these should match the ones in your app
const ADMIN_EMAIL = 'admin@tunetalez.com';
const ADMIN_PASSWORD = 'admin123';

// Function to create admin user and set role
async function createAdminUser() {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const user = userCredential.user;
    
    // Set user role as admin in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: ADMIN_EMAIL,
      role: 'admin',
      createdAt: Date.now()
    });
    
    console.log(`Admin user created successfully with UID: ${user.uid}`);
    return user.uid;
  } catch (error) {
    // Check if error is because user already exists
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists. Please use the setUserAsAdmin function with the UID.');
    } else {
      console.error('Error creating admin user:', error);
    }
    return null;
  }
}

// Function to set a user as admin
async function setUserAsAdmin(uid) {
  try {
    await setDoc(doc(db, 'users', uid), { role: 'admin' }, { merge: true });
    console.log(`User ${uid} has been successfully set as admin.`);
  } catch (error) {
    console.error('Error setting user as admin:', error);
  }
}

// Execute the function to create admin user
createAdminUser()
  .then((uid) => {
    if (!uid) {
      // If user creation failed, you can manually set an existing user as admin
      // Uncomment the line below and replace with the UID of an existing user
      // return setUserAsAdmin('REPLACE_WITH_USER_UID');
    }
    return Promise.resolve();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
