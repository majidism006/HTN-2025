import { NextRequest, NextResponse } from 'next/server';
import { hasGoogleAuth } from '@/lib/google-calendar';
import { deleteUserTokens } from '@/lib/google-token-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ connected: false, error: 'Missing userId' }, { status: 400 });
  const connected = await hasGoogleAuth(userId);
  return NextResponse.json({ connected });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
  await deleteUserTokens(userId);
  return NextResponse.json({ success: true });
}
