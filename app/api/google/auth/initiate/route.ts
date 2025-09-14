import { NextRequest, NextResponse } from 'next/server';
import { createAuthUrl } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const redirect = searchParams.get('redirect') || '/';
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  const state = new URLSearchParams({ userId, redirect }).toString();
  const url = createAuthUrl(state);
  return NextResponse.redirect(url);
}
