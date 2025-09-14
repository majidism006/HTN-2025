import { NextRequest, NextResponse } from 'next/server';
import { insertEventForUser } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId, title, description, start, end, attendeesEmails } = await req.json();
    if (!userId || !title || !start || !end) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    const result = await insertEventForUser(userId, { title, description, start, end, attendeesEmails });
    return NextResponse.json({ success: true, event: result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to create event' }, { status: 500 });
  }
}
