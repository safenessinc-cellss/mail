import { NextResponse } from "next/server";
import twilio from "twilio";
import { getFirebaseAdmin } from "../../../lib/firebase-admin";
export const runtime="nodejs";
export async function GET(req) {
 try {
  const cookie=req.cookies.get("tui_session")?.value;
  if(!cookie) return NextResponse.json({error:"Sign in required"},{status:401});
  const {auth}=getFirebaseAdmin();
  try { await auth.verifySessionCookie(cookie,true); } catch { return NextResponse.json({error:"Firebase session expired. Sign in again."},{status:401}); }
  const {TWILIO_ACCOUNT_SID,TWILIO_API_KEY,TWILIO_API_SECRET}=process.env;
  if(!TWILIO_ACCOUNT_SID||!TWILIO_API_KEY||!TWILIO_API_SECRET) return NextResponse.json({error:"Add TWILIO_ACCOUNT_SID, TWILIO_API_KEY and TWILIO_API_SECRET in Vercel."},{status:503});
  const Token=twilio.jwt.AccessToken,Grant=Token.VoiceGrant;
  const token=new Token(TWILIO_ACCOUNT_SID,TWILIO_API_KEY,TWILIO_API_SECRET,{identity:"owner",ttl:3600});
  token.addGrant(new Grant({incomingAllow:true})); return NextResponse.json({token:token.toJwt()});
 } catch(e) { console.error("Twilio token endpoint failed",e); return NextResponse.json({error:e.message||"Unable to create Twilio token."},{status:503}); }
}