import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ContentstackClient, formatError } from './cs-client.js';

export function registerTools(server: McpServer, getClient: () => ContentstackClient) {
  const ok = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  });

  const fail = (error: unknown) => ({
    content: [{ type: 'text' as const, text: `Error: ${formatError(error)}` }],
    isError: true,
  });

  // ── Stacks ──────────────────────────────────────────────────────────────

  server.tool(
    'list_stacks',
    'List all stacks (projects) in your Contentstack organization',
    { organization_uid: z.string().optional().describe('Filter by organization UID') },
    async ({ organization_uid }) => {
      try {
        return ok(await getClient().listStacks(organization_uid));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_stack',
    'Get details of a specific stack',
    { stack_api_key: z.string().describe('The stack API key') },
    async ({ stack_api_key }) => {
      try {
        return ok(await getClient().getStack(stack_api_key));
      } catch (e) { return fail(e); }
    }
  );

  // ── Content Types ────────────────────────────────────────────────────────

  server.tool(
    'list_content_types',
    'List all content types in a stack',
    { stack_api_key: z.string().describe('The stack API key') },
    async ({ stack_api_key }) => {
      try {
        return ok(await getClient().listContentTypes(stack_api_key));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_content_type',
    'Get a specific content type by UID',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
    },
    async ({ stack_api_key, content_type_uid }) => {
      try {
        return ok(await getClient().getContentType(stack_api_key, content_type_uid));
      } catch (e) { return fail(e); }
    }
  );

  // ── Entries ──────────────────────────────────────────────────────────────

  server.tool(
    'list_entries',
    'List entries for a content type',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      limit: z.number().optional().describe('Max entries to return (default 100)'),
      skip: z.number().optional().describe('Number of entries to skip (for pagination)'),
      query: z.string().optional().describe('JSON query string to filter entries'),
    },
    async ({ stack_api_key, content_type_uid, limit, skip, query }) => {
      try {
        const params: Record<string, unknown> = {};
        if (limit !== undefined) params.limit = limit;
        if (skip !== undefined) params.skip = skip;
        if (query) params.query = query;
        return ok(await getClient().listEntries(stack_api_key, content_type_uid, params));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_entry',
    'Get a single entry by UID',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      entry_uid: z.string().describe('The entry UID'),
    },
    async ({ stack_api_key, content_type_uid, entry_uid }) => {
      try {
        return ok(await getClient().getEntry(stack_api_key, content_type_uid, entry_uid));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'create_entry',
    'Create a new entry in a content type',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      entry: z.record(z.unknown()).describe('The entry fields as a JSON object'),
    },
    async ({ stack_api_key, content_type_uid, entry }) => {
      try {
        return ok(await getClient().createEntry(stack_api_key, content_type_uid, entry));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'update_entry',
    'Update an existing entry',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      entry_uid: z.string().describe('The entry UID'),
      entry: z.record(z.unknown()).describe('The updated entry fields as a JSON object'),
    },
    async ({ stack_api_key, content_type_uid, entry_uid, entry }) => {
      try {
        return ok(await getClient().updateEntry(stack_api_key, content_type_uid, entry_uid, entry));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'publish_entry',
    'Publish an entry to one or more environments',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      entry_uid: z.string().describe('The entry UID'),
      environments: z.array(z.string()).describe('List of environment names to publish to'),
      locales: z.array(z.string()).describe('List of locale codes (e.g. ["en-us"])'),
    },
    async ({ stack_api_key, content_type_uid, entry_uid, environments, locales }) => {
      try {
        return ok(
          await getClient().publishEntry(stack_api_key, content_type_uid, entry_uid, environments, locales)
        );
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'delete_entry',
    'Delete an entry permanently',
    {
      stack_api_key: z.string().describe('The stack API key'),
      content_type_uid: z.string().describe('The content type UID'),
      entry_uid: z.string().describe('The entry UID'),
    },
    async ({ stack_api_key, content_type_uid, entry_uid }) => {
      try {
        return ok(await getClient().deleteEntry(stack_api_key, content_type_uid, entry_uid));
      } catch (e) { return fail(e); }
    }
  );

  // ── Assets ───────────────────────────────────────────────────────────────

  server.tool(
    'list_assets',
    'List all assets (files/images) in a stack',
    { stack_api_key: z.string().describe('The stack API key') },
    async ({ stack_api_key }) => {
      try {
        return ok(await getClient().listAssets(stack_api_key));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_asset',
    'Get details of a specific asset',
    {
      stack_api_key: z.string().describe('The stack API key'),
      asset_uid: z.string().describe('The asset UID'),
    },
    async ({ stack_api_key, asset_uid }) => {
      try {
        return ok(await getClient().getAsset(stack_api_key, asset_uid));
      } catch (e) { return fail(e); }
    }
  );

  // ── Environments & Locales ───────────────────────────────────────────────

  server.tool(
    'list_environments',
    'List all publishing environments in a stack',
    { stack_api_key: z.string().describe('The stack API key') },
    async ({ stack_api_key }) => {
      try {
        return ok(await getClient().listEnvironments(stack_api_key));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'list_locales',
    'List all languages/locales configured in a stack',
    { stack_api_key: z.string().describe('The stack API key') },
    async ({ stack_api_key }) => {
      try {
        return ok(await getClient().listLocales(stack_api_key));
      } catch (e) { return fail(e); }
    }
  );
}
