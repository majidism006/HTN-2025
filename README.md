# HTN-2025

Automated scheduling with:
- Voice input via Vapi (optional)
- Smart suggestions (local free/busy over groups)
- Google Calendar OAuth + event creation
- CUA visual fallback (optional)

Setup
- Copy `.env.example` to `.env` and set:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - (optional) `VAPI_API_KEY`, `VAPI_TRANSCRIBE_URL`
- Install deps: `npm i`
- Run dev: `npm run dev`

Google Calendar
- Click “Connect” in the dashboard to link Google.
- When booking a suggestion, events will be created on connected users’ primary calendars.

Vapi Transcription (optional)
- Provide a transcription endpoint and key. The UI posts recorded audio to `/api/vapi/transcribe`.

CUA Fallback (optional)
- Configure `@trycua/computer` environment to allow visual booking.
