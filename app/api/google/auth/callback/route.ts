import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-calendar';
import { saveUserTokens } from '@/lib/google-token-store';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateStr = searchParams.get('state') || '';
    const state = new URLSearchParams(stateStr);
    const userId = state.get('userId') || '';
    const redirect = state.get('redirect') || '/';
    if (!code || !userId) {
      return NextResponse.json({ error: 'Missing code or userId' }, { status: 400 });
    }
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens?.access_token) {
      return NextResponse.json({ error: 'No access token returned' }, { status: 400 });
    }
    await saveUserTokens(userId, tokens as any);
    const url = new URL(redirect, req.nextUrl.origin);
    url.searchParams.set('google', 'connected');
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('Google OAuth callback error', err);
    return NextResponse.json({ error: 'OAuth failed' }, { status: 500 });
  }
}
