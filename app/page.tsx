export default function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  return (
    <>
      <style>{`
        body { font-family: system-ui, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #222; }
        code { background: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        pre  { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
        .btn { display: inline-block; background: #5c6ac4; color: #fff; padding: 10px 24px;
               border-radius: 6px; text-decoration: none; font-weight: 600; }
        li { margin-bottom: 4px; }
      `}</style>
      <h1>CS Remote MCP Server</h1>
      <p>A remote MCP server for <strong>Contentstack</strong> CMS.</p>
      <hr />
      <h2>Step 1 — Authorize</h2>
      <a className="btn" href="/api/oauth/authorize">Connect Contentstack Account</a>
      <h2>Step 2 — Use the MCP endpoint</h2>
      <p>After authorizing you will receive a <strong>session token</strong>. Use it to connect any MCP client:</p>
      <pre>{`Endpoint : ${baseUrl}/api/mcp\nAuth     : Authorization: Bearer <your-session-token>`}</pre>
      <h2>Available tools (14)</h2>
      <ul>
        <li><code>list_stacks</code> / <code>get_stack</code></li>
        <li><code>list_content_types</code> / <code>get_content_type</code></li>
        <li><code>list_entries</code> / <code>get_entry</code> / <code>create_entry</code> / <code>update_entry</code> / <code>publish_entry</code> / <code>delete_entry</code></li>
        <li><code>list_assets</code> / <code>get_asset</code></li>
        <li><code>list_environments</code> / <code>list_locales</code></li>
      </ul>
    </>
  );
}
