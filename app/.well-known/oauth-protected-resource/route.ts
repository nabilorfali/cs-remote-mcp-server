import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const base = `https://${req.headers.get('host')}`;

  return NextResponse.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
  });
}
