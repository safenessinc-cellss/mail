import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
export function getFirebaseAdmin() {
 const projectId=process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
 const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
 const keyPem=(process.env.FIREBASE_PRIVATE_KEY || "").replaceAll("\\n","\n");
 if(!projectId || !clientEmail || !keyPem) throw new Error("Firebase Admin credentials are missing.");
 const app=getApps().length ? getApps()[0] : initializeApp({credential:cert({projectId,clientEmail,privateKey:keyPem}),projectId});
 return {auth:getAuth(app),db:getFirestore(app)};
}