import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ContentstackClient } from './cs-client';
import { registerTools } from './tools';
import type { TokenSet } from './oauth';

export { StreamableHTTPServerTransport };

// mcp-session-id → transport
export const transports = new Map<string, StreamableHTTPServerTransport>();

export function createMcpServer(tokens: TokenSet): McpServer {
  const region = process.env.CS_REGION ?? 'us';
  const server = new McpServer({ name: 'cs-remote-mcp-server', version: '1.0.0' });
  const getClient = () => new ContentstackClient(tokens.access_token, region, tokens.organization_uid);
  registerTools(server, getClient);
  return server;
}
