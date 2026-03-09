import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { OAuthManager } from '@/lib/oauth';
import { sessions, saveSessions } from '@/lib/sessions';

const oauth = new OAuthManager({
  appUid: process.env.CS_APP_UID!,
  clientId: process.env.CS_CLIENT_ID!,
  clientSecret: process.env.CS_CLIENT_SECRET!,
  redirectUri: process.env.REDIRECT_URI!,
  region: process.env.CS_REGION ?? 'us',
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`<h2>OAuth error: ${error}</h2>`, { headers: { 'Content-Type': 'text/html' } });
  }
  if (!code) {
    return new NextResponse('<h2>Missing authorization code.</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const tokens = await oauth.exchangeCode(code);
    const sessionId = randomUUID();
    sessions.set(sessionId, tokens);
    saveSessions(sessions);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Authorized — CS Remote MCP Server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 680px; margin: 60px auto; padding: 0 20px; color: #222; }
    .token { background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 6px;
             font-family: monospace; font-size: 0.95em; word-break: break-all; }
    pre  { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>✓ Authorized successfully</h1>
  <p>Your session token (treat this like a password):</p>
  <div class="token">${sessionId}</div>
  <h2>Connect an MCP client</h2>
  <pre>{
  "mcpServers": {
    "contentstack": {
      "url": "${baseUrl}/api/mcp",
      "headers": {
        "Authorization": "Bearer ${sessionId}"
      }
    }
  }
}</pre>
  <p><a href="/">← Back to home</a></p>
</body>
</html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    return new NextResponse(`<h2>Token exchange failed.</h2><pre>${err}</pre>`, {
      status: 500, headers: { 'Content-Type': 'text/html' },
    });
  }
}
