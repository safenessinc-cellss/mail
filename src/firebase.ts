/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuración de Firebase - Valores de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBwaabxRH_bnsJ4h1Y0j_7cfqTcZDf2u8Q",
  authDomain: "freemail-c2a13.firebaseapp.com",
  projectId: "freemail-c2a13",
  storageBucket: "freemail-c2a13.firebasestorage.app",
  messagingSenderId: "219333706329",
  appId: "1:219333706329:web:10f48f9a28e02c9bb5e748",
  measurementId: "G-W2X0K98V7Q"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Analytics (opcional)
const analytics = getAnalytics(app);

// Autenticación
const auth = getAuth(app);

// Firestore (Base de Datos)
const db = getFirestore(app);

// Proveedores OAuth
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

// Configuración adicional para Microsoft
microsoftProvider.setCustomParameters({
  tenant: 'common' // Permite cuentas personales y de trabajo
});

// Exportaciones
export {
  // App
  app,
  
  // Auth
  auth,
  googleProvider,
  microsoftProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  
  // Firestore
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
};

// Exportación por defecto para facilitar la importación
export default {
  app,
  auth,
  db,
  googleProvider,
  microsoftProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
};
