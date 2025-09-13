import { handleAuth } from '@auth0/nextjs-auth0';

export const runtime = 'nodejs';

const authHandler = handleAuth();

function isAuth0Configured() {
  const e = process.env;
  return !!(e.AUTH0_BASE_URL && e.AUTH0_ISSUER_BASE_URL && e.AUTH0_CLIENT_ID && e.AUTH0_CLIENT_SECRET && e.AUTH0_SECRET && /^https?:\/\//.test(e.AUTH0_ISSUER_BASE_URL));
}

export async function GET(request: Request, ctx: { params: Promise<{ auth0: string }> }) {
  const params = await ctx.params;
  if (!isAuth0Configured()) {
    // Graceful degrade: don't error on login/me routes if not configured
    if (params.auth0 === 'me') return new Response(null, { status: 204 });
    if (params.auth0 === 'login' || params.auth0 === 'logout') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ error: 'Auth0 not configured' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
  }
  return (authHandler as any)(request as any, { params } as any);
}

export async function POST(request: Request, ctx: { params: Promise<{ auth0: string }> }) {
  const params = await ctx.params;
  if (!isAuth0Configured()) {
    return new Response(null, { status: 204 });
  }
  return (authHandler as any)(request as any, { params } as any);
}
