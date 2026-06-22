/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBwaabxRH_bnsJ4h1Y0j_7cfqTcZDf2u8Q",
  authDomain: "freemail-c2a13.firebaseapp.com",
  projectId: "freemail-c2a13",
  storageBucket: "freemail-c2a13.firebasestorage.app",
  messagingSenderId: "219333706329",
  appId: "1:219333706329:web:10f48f9a28e02c9bb5e748",
  measurementId: "G-W2X0K98V7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with default database
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn("Failed to set auth persistence:", err);
});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export { app, db, auth, googleProvider, signInWithPopup, signOut };
export default app;
