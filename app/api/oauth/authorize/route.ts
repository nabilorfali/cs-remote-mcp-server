import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { OAuthManager } from '@/lib/oauth';
import { oauthStates } from '@/lib/oauth-states';

const oauth = new OAuthManager({
  appUid: process.env.CS_APP_UID!,
  clientId: process.env.CS_CLIENT_ID!,
  clientSecret: process.env.CS_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
  region: process.env.CS_REGION ?? 'us',
});

export function GET() {
  const state = randomUUID();
  oauthStates.add(state);
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
  return NextResponse.redirect(oauth.getAuthorizationUrl(state));
}
