import { NextRequest, NextResponse } from 'next/server';
import { parseSmart } from '@/lib/ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }
    const parsed = await parseSmart(text);
    return NextResponse.json({ success: true, parsed });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Parse failed' }, { status: 500 });
  }
}
