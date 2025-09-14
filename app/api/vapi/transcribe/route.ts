import { NextRequest, NextResponse } from 'next/server';

function env(name: string) {
  return process.env[name];
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const VAPI_URL = env('VAPI_TRANSCRIBE_URL');
    const VAPI_KEY = env('VAPI_API_KEY') || env('VAPI_PRIVATE_API_KEY');
    if (!VAPI_KEY) {
      return NextResponse.json({ error: 'Missing Vapi key' }, { status: 400 });
    }
    if (!VAPI_URL) {
      return NextResponse.json({
        error: 'Vapi transcription endpoint not set',
        hint: 'Use Vapi Realtime/Client SDK for voice, or set VAPI_TRANSCRIBE_URL if you have a REST endpoint',
      }, { status: 501 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('audio') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
    }

    const forward = new FormData();
    forward.append('file', file, 'audio.wav');

    const res = await fetch(VAPI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_KEY}`,
      },
      body: forward,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'VAPI error', details: text }, { status: 502 });
    }

    const data = await res.json().catch(async () => ({ text: await res.text() }));
    const transcript = data.text || data.transcript || data.transcription || '';
    if (!transcript) {
      return NextResponse.json({ error: 'No transcript returned' }, { status: 502 });
    }
    return NextResponse.json({ transcript });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to transcribe' }, { status: 500 });
  }
}
