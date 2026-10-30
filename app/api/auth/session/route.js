import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "../../../lib/firebase-admin";
export const runtime = "nodejs";
const COOKIE = "tui_session";
const OPTIONS = { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:432000 };
export async function GET(req) {
 const cookie=req.cookies.get(COOKIE)?.value;
 if(!cookie) return NextResponse.json({user:null});
 try { const {auth}=getFirebaseAdmin(); const decoded=await auth.verifySessionCookie(cookie,true); return NextResponse.json({user:{uid:decoded.uid,email:decoded.email,name:decoded.name||"",picture:decoded.picture||""}}); }
 catch { return NextResponse.json({user:null}); }
}
export async function POST(req) {
 try {
  const {idToken}=await req.json();
  if(typeof idToken!=="string"||!idToken) return NextResponse.json({error:"Falta el token de Firebase."},{status:400});
  const {auth,db}=getFirebaseAdmin();
  const decoded=await auth.verifyIdToken(idToken,true);
  if(!decoded.email_verified) return NextResponse.json({error:"La cuenta de Google debe tener el correo verificado."},{status:403});
  const sessionCookie=await auth.createSessionCookie(idToken,{expiresIn:OPTIONS.maxAge*1000});
  await db.collection("users").doc(decoded.uid).set({uid:decoded.uid,email:decoded.email||"",displayName:decoded.name||"",photoURL:decoded.picture||"",lastLoginAt:new Date(),updatedAt:new Date(),provider:"google"},{merge:true});
  const response=NextResponse.json({ok:true,user:{uid:decoded.uid,email:decoded.email,name:decoded.name||"",picture:decoded.picture||""}});
  response.cookies.set(COOKIE,sessionCookie,OPTIONS); return response;
 } catch(e) { console.error("Firebase session exchange failed",e); return NextResponse.json({error:e.message||"No se pudo validar la sesión con Firebase."},{status:503}); }
}