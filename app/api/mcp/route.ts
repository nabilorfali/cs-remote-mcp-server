import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { transports, createMcpServer } from '@/lib/mcp-server';
import { decryptTokenSet } from '@/lib/crypto';
import type { TokenSet } from '@/lib/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getTokens(req: NextRequest): TokenSet | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return decryptTokenSet(auth.slice(7));
}

function unauthorized(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`;
  return NextResponse.json(
    { error: 'unauthorized', error_description: 'Valid Bearer token required' },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer realm="${base}", error="invalid_token"`,
        'Link': `<${base}/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"`,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const tokens = getTokens(req);
  if (!tokens) return unauthorized(req);

  const body = await req.json();
  const mcpSessionId = req.headers.get('mcp-session-id') ?? undefined;
  let transport: StreamableHTTPServerTransport;

  if (mcpSessionId && transports.has(mcpSessionId)) {
    transport = transports.get(mcpSessionId)!;
  } else if (!mcpSessionId && isInitializeRequest(body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => { transports.set(id, transport); },
    });
    transport.onclose = () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
    };
    const server = createMcpServer(tokens);
    await server.connect(transport);
  } else {
    return NextResponse.json({ error: 'Bad request: missing or invalid MCP session' }, { status: 400 });
  }

  // Convert Next.js request to Node-compatible and handle
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const nodeReq = {
    method: 'POST',
    headers: Object.fromEntries(req.headers.entries()),
    body,
  };

  const nodeRes = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    getHeader(k: string) { return this.headers[k]; },
    writeHead(status: number, headers?: Record<string, string>) {
      this.statusCode = status;
      if (headers) Object.assign(this.headers, headers);
    },
    write(chunk: unknown) {
      const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk as Uint8Array;
      writer.write(bytes);
    },
    end(chunk?: unknown) {
      if (chunk) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk as Uint8Array;
        writer.write(bytes);
      }
      writer.close();
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await transport.handleRequest(nodeReq as any, nodeRes as any, body);

  return new NextResponse(readable, {
    status: nodeRes.statusCode,
    headers: { ...nodeRes.headers, 'Content-Type': nodeRes.headers['Content-Type'] ?? 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const mcpSessionId = req.headers.get('mcp-session-id') ?? undefined;
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    return NextResponse.json({ error: 'Invalid or missing mcp-session-id' }, { status: 400 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const transport = transports.get(mcpSessionId)!;

  const nodeReq = { method: 'GET', headers: Object.fromEntries(req.headers.entries()) };
  const nodeRes = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) { this.headers[k] = v; },
    getHeader(k: string) { return this.headers[k]; },
    writeHead(status: number, headers?: Record<string, string>) {
      this.statusCode = status;
      if (headers) Object.assign(this.headers, headers);
    },
    write(chunk: unknown) {
      const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk as Uint8Array;
      writer.write(bytes);
    },
    end(chunk?: unknown) {
      if (chunk) {
        const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk as Uint8Array;
        writer.write(bytes);
      }
      writer.close();
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await transport.handleRequest(nodeReq as any, nodeRes as any);

  return new NextResponse(readable, {
    status: nodeRes.statusCode,
    headers: { ...nodeRes.headers, 'Content-Type': nodeRes.headers['Content-Type'] ?? 'text/event-stream' },
  });
}

export async function DELETE(req: NextRequest) {
  const mcpSessionId = req.headers.get('mcp-session-id') ?? undefined;
  if (!mcpSessionId || !transports.has(mcpSessionId)) {
    return NextResponse.json({ error: 'Invalid or missing mcp-session-id' }, { status: 400 });
  }
  const transport = transports.get(mcpSessionId)!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await transport.handleRequest({ method: 'DELETE', headers: {} } as any, { end: () => {} } as any);
  transports.delete(mcpSessionId);
  return NextResponse.json({ ok: true });
}
