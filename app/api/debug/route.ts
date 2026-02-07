import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: {
      OPENCLAW_API_URL: process.env.OPENCLAW_API_URL ? 'SET' : 'NOT SET',
      OPENCLAW_TOKEN: process.env.OPENCLAW_TOKEN ? 'SET' : 'NOT SET',
      LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'SET' : 'NOT SET',
    },
    timestamp: new Date().toISOString(),
  });
}
