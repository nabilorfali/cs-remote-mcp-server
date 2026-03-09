import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { OAuthManager, TokenSet } from './oauth.js';
import { ContentstackClient } from './cs-client.js';
import { registerTools } from './tools.js';

// ── Config ───────────────────────────────────────────────────────────────────

const {
  CS_APP_UID,
  CS_CLIENT_ID,
  CS_CLIENT_SECRET,
  CS_REGION = 'us',
  PORT = '3000',
  REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`,
} = process.env;

if (!CS_APP_UID || !CS_CLIENT_ID || !CS_CLIENT_SECRET) {
  console.error('Missing CS_APP_UID, CS_CLIENT_ID or CS_CLIENT_SECRET in .env');
  process.exit(1);
}

const oauth = new OAuthManager({
  appUid: CS_APP_UID,
  clientId: CS_CLIENT_ID,
  clientSecret: CS_CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  region: CS_REGION,
});

// ── Session stores ───────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_FILE = join(__dirname, '..', '.sessions.json');

function loadSessions(): Map<string, TokenSet> {
  if (existsSync(SESSIONS_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'));
      return new Map(Object.entries(raw));
    } catch { /* ignore corrupt file */ }
  }
  return new Map();
}

function saveSessions(map: Map<string, TokenSet>) {
  writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(map), null, 2));
}

// sessionId (Bearer token) → Contentstack token set
const sessions = loadSessions();
// mcp-session-id → transport (for stateful MCP sessions)
const transports = new Map<string, StreamableHTTPServerTransport>();
// oauth state → pending (CSRF protection)
const oauthStates = new Set<string>();

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Home ─────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CS Remote MCP Server</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #222; }
        code { background: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        pre  { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
        .btn { display: inline-block; background: #5c6ac4; color: #fff; padding: 10px 24px;
               border-radius: 6px; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <h1>CS Remote MCP Server</h1>
      <p>A remote MCP server for <strong>Contentstack</strong> CMS.</p>
      <hr>
      <h2>Step 1 — Authorize</h2>
      <a class="btn" href="/oauth/authorize">Connect Contentstack Account</a>
      <h2>Step 2 — Use the MCP endpoint</h2>
      <p>After authorizing you'll receive a <strong>session token</strong>. Use it to connect any MCP client:</p>
      <pre>Endpoint : http://localhost:${PORT}/mcp
Auth     : Authorization: Bearer &lt;your-session-token&gt;</pre>
      <h2>Available tools (${14})</h2>
      <ul>
        <li><code>list_stacks</code> / <code>get_stack</code></li>
        <li><code>list_content_types</code> / <code>get_content_type</code></li>
        <li><code>list_entries</code> / <code>get_entry</code> / <code>create_entry</code> / <code>update_entry</code> / <code>publish_entry</code> / <code>delete_entry</code></li>
        <li><code>list_assets</code> / <code>get_asset</code></li>
        <li><code>list_environments</code> / <code>list_locales</code></li>
      </ul>
    </body>
    </html>
  `);
});

// ── OAuth flow ───────────────────────────────────────────────────────────────

app.get('/oauth/authorize', (_req, res) => {
  const state = randomUUID();
  oauthStates.add(state);
  // Clean up state after 10 min
  setTimeout(() => oauthStates.delete(state), 10 * 60 * 1000);
  res.redirect(oauth.getAuthorizationUrl(state));
});

app.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.status(400).send(`<h2>OAuth error: ${error}</h2>`);
    return;
  }

  if (!state || !oauthStates.has(state)) {
    res.status(400).send('<h2>Invalid OAuth state. Please try again.</h2>');
    return;
  }
  oauthStates.delete(state);

  if (!code) {
    res.status(400).send('<h2>Missing authorization code.</h2>');
    return;
  }

  try {
    const tokens = await oauth.exchangeCode(code);
    const sessionId = randomUUID();
    sessions.set(sessionId, tokens);
    saveSessions(sessions);

    res.send(`
      <!DOCTYPE html>
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
        <p>Use these settings in Claude Desktop or any MCP-compatible client:</p>
        <pre>{
  "mcpServers": {
    "contentstack": {
      "url": "http://localhost:${PORT}/mcp",
      "headers": {
        "Authorization": "Bearer ${sessionId}"
      }
    }
  }
}</pre>
        <p><a href="/">← Back to home</a></p>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.status(500).send(`<h2>Token exchange failed.</h2><pre>${err}</pre>`);
  }
});

// ── MCP endpoint ─────────────────────────────────────────────────────────────

function createMcpServer(tokens: TokenSet): McpServer {
  const server = new McpServer({
    name: 'cs-remote-mcp-server',
    version: '1.0.0',
  });

  const getClient = () => new ContentstackClient(tokens.access_token, CS_REGION, tokens.organization_uid);
  registerTools(server, getClient);
  return server;
}

function getSessionTokens(req: express.Request): TokenSet | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const sessionId = auth.slice(7);
  return sessions.get(sessionId) ?? null;
}

// POST /mcp — new requests and initialize
app.post('/mcp', async (req, res) => {
  const tokens = getSessionTokens(req);
  if (!tokens) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Visit http://localhost:' + PORT + '/oauth/authorize to get a session token',
    });
    return;
  }

  const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (mcpSessionId && transports.has(mcpSessionId)) {
    transport = transports.get(mcpSessionId)!;
  } else if (!mcpSessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
    };

    const server = createMcpServer(tokens);
    await server.connect(transport);
  } else {
    res.status(400).json({ error: 'Bad request: missing or invalid MCP session' });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// GET /mcp — SSE stream for ongoing session
app.get('/mcp', async (req, res) => {
  const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    res.status(400).json({ error: 'Invalid or missing mcp-session-id' });
    return;
  }
  await transports.get(mcpSessionId)!.handleRequest(req, res);
});

// DELETE /mcp — close session
app.delete('/mcp', async (req, res) => {
  const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    res.status(400).json({ error: 'Invalid or missing mcp-session-id' });
    return;
  }
  await transports.get(mcpSessionId)!.handleRequest(req, res);
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(Number(PORT), () => {
  console.log(`\nCS Remote MCP Server running`);
  console.log(`  Home:      http://localhost:${PORT}/`);
  console.log(`  Authorize: http://localhost:${PORT}/oauth/authorize`);
  console.log(`  MCP:       http://localhost:${PORT}/mcp\n`);
});
