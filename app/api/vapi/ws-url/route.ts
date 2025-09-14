import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const VAPI_KEY = process.env.VAPI_PRIVATE_API_KEY || process.env.VAPI_API_KEY;
    if (!VAPI_KEY) {
      return NextResponse.json({ error: 'Missing Vapi private key' }, { status: 400 });
    }
    const { assistantId } = await req.json().catch(() => ({}));
    const body: any = {
      transport: { provider: 'vapi.websocket' },
    };
    const asst = assistantId || process.env.VAPI_ASSISTANT_ID;
    if (asst) body.assistantId = asst;

    const res = await fetch('https://api.vapi.ai/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Vapi call create failed', details: text }, { status: 502 });
    }
    const data = await res.json();
    const wsUrl = data?.transport?.websocketCallUrl;
    if (!wsUrl) return NextResponse.json({ error: 'No websocketCallUrl in response' }, { status: 502 });
    return NextResponse.json({ wsUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create Vapi websocket call' }, { status: 500 });
  }
}

