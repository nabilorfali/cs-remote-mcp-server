import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { OAuthManager } from '@/lib/oauth';
import { pendingAuths } from '@/lib/pending-auth';

const oauth = new OAuthManager({
  appUid: process.env.CS_APP_UID!,
  clientId: process.env.CS_CLIENT_ID!,
  clientSecret: process.env.CS_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
  region: process.env.CS_REGION ?? 'us',
});

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const clientRedirectUri    = searchParams.get('redirect_uri');
  const clientState          = searchParams.get('state') ?? '';
  const codeChallenge        = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod  = searchParams.get('code_challenge_method') ?? 'S256';

  if (!clientRedirectUri) {
    // No client redirect_uri — this is a direct browser visit, show simple page
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`;
    const state = randomUUID();
    // Store a dummy pending auth that redirects back to our callback page
    pendingAuths.set(state, {
      clientRedirectUri: `${base}/api/oauth/callback-done`,
      clientState: '',
      codeChallenge: '',
      codeChallengeMethod: 'S256',
    });
    return NextResponse.redirect(oauth.getAuthorizationUrl(state));
  }

  // MCP client is initiating OAuth — store their params and redirect to Contentstack
  const csState = randomUUID();
  pendingAuths.set(csState, {
    clientRedirectUri,
    clientState,
    codeChallenge,
    codeChallengeMethod,
  });
  // Expire after 10 minutes
  setTimeout(() => pendingAuths.delete(csState), 10 * 60 * 1000);

  return NextResponse.redirect(oauth.getAuthorizationUrl(csState));
}
