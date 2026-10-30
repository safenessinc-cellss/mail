import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export function getFirebaseClient() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "messagingSenderId" && !value)
    .map(([key]) => key);
  if (missing.length) throw new Error("Firebase web config is incomplete. Missing: " + missing.join(", "));
  const app = getApps().length ? getApp() : initializeApp(config);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}