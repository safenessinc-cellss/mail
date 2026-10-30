# TuiPhone
Private browser calling desk for incoming calls to a US Twilio number.

## Included
- Google OAuth login with signed HTTP-only session cookies.
- Twilio Voice browser registration and live incoming caller ID.
- Answer / decline controls and validated Twilio webhook.
- Provider secrets remain server-side.

## Configure Vercel
Set every variable in .env.example in Project Settings → Environment Variables. In Google Cloud Console create an OAuth Web client and add the exact callback URL https://YOUR_DOMAIN/api/auth/callback/google. Set GOOGLE_REDIRECT_URI to that same URL.

In Twilio Console create a Standard API Key. Set Account SID, Auth Token, API Key SID and API Key Secret. Use a US phone number with Voice capability and set its incoming Voice webhook to https://YOUR_DOMAIN/api/twilio/incoming using HTTP POST. Set TWILIO_INCOMING_WEBHOOK_URL to the exact public webhook URL, then redeploy.

Sign in with Google, keep the browser tab open and allow microphone access. Incoming calls will ring the browser identity owner.

## Limits
Twilio numbers and usage are paid. Caller ID is carrier-supplied; private/withheld IDs cannot be recovered. This first release shows live calls only: no persistent call history, recordings, outbound calling, or guaranteed background ringing. OAuth currently accepts any verified Google account; add an email allowlist before multi-user use. Never commit secrets.
