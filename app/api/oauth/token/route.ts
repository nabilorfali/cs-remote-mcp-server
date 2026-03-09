import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { pendingTokens } from '@/lib/pending-auth';

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'S256') {
    const hash = createHash('sha256').update(codeVerifier).digest();
    return base64urlEncode(hash) === codeChallenge;
  }
  if (method === 'plain') return codeVerifier === codeChallenge;
  return false;
}

export async function POST(req: NextRequest) {
  let params: URLSearchParams | null = null;

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(await req.text());
  } else {
    const body = await req.json().catch(() => ({}));
    params = new URLSearchParams(body);
  }

  const grantType    = params.get('grant_type');
  const code         = params.get('code');
  const codeVerifier = params.get('code_verifier');

  if (grantType !== 'authorization_code' || !code) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const pending = pendingTokens.get(code);
  if (!pending) {
    return NextResponse.json({ error: 'invalid_grant', error_description: 'Code not found or expired' }, { status: 400 });
  }

  // Verify PKCE if a challenge was stored
  if (pending.codeChallenge) {
    if (!codeVerifier || !verifyPKCE(codeVerifier, pending.codeChallenge, pending.codeChallengeMethod)) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 });
    }
  }

  pendingTokens.delete(code);

  return NextResponse.json({
    access_token: pending.encryptedToken,
    token_type: 'bearer',
    // Long expiry — the encrypted token contains the CS refresh token anyway
    expires_in: 3600 * 24 * 30,
  });
}
