import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "../../../../lib/firebase-admin";
export const runtime="nodejs";
export async function POST(req) {
 try {
  const cookie=req.cookies.get("tui_session")?.value;
  if(!cookie) return NextResponse.json({error:"Sign in required"},{status:401});
  const {auth,db}=getFirebaseAdmin();
  const user=await auth.verifySessionCookie(cookie,true);
  const body=await req.json();
  const from=typeof body.from==="string"?body.from.slice(0,80):"Unknown caller";
  await db.collection("callHistory").add({uid:user.uid,type:"incoming",from,status:"ringing",createdAt:new Date()});
  return NextResponse.json({ok:true});
 } catch(e) { console.error("Call log write failed",e); return NextResponse.json({error:"Unable to save call activity."},{status:503}); }
}