import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const env = process.env;
    const vapiConfigured = !!(env.VAPI_PRIVATE_API_KEY && env.VAPI_TRANSCRIBE_URL);
    const auth0Enabled = env.NEXT_PUBLIC_AUTH0_ENABLED === 'true';
    const auth0Configured = !!(
      env.AUTH0_BASE_URL && env.AUTH0_ISSUER_BASE_URL && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET && env.AUTH0_SECRET
    );
    const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
    const parserProvider = env.AI_PARSER_PROVIDER || 'regex-fallback';

    return NextResponse.json({
      success: true,
      vapiConfigured,
      auth0Enabled,
      auth0Configured,
      googleConfigured,
      parserProvider,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Diagnostics failed' }, { status: 500 });
  }
}

