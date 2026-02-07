import { NextResponse } from 'next/server';
import * as line from '@line/bot-sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const openclawUrl = process.env.OPENCLAW_API_URL || '';
const openclawToken = process.env.OPENCLAW_TOKEN || '';

const client = new line.messagingApi.MessagingApiClient({ channelAccessToken });

function getSessionKey(event: any): string {
  const source = event?.source ?? {};
  const userId = source.userId ?? 'anon';
  const groupId = source.groupId ?? '';
  const roomId = source.roomId ?? '';
  return `line:${groupId || roomId || 'dm'}:${userId}`;
}

async function callOpenClaw(message: string, sessionKey: string): Promise<string> {
  console.log('=== OpenClaw Request ===');
  console.log('URL:', openclawUrl || 'NOT SET');
  console.log('Token:', openclawToken ? 'SET' : 'NOT SET');

  if (!openclawUrl) return '⚠️ OPENCLAW_API_URL未設定';
  if (!openclawToken) return '⚠️ OPENCLAW_TOKEN未設定';

  try {
    const res = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openclawToken}`,
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{ role: 'user', content: message }],
        stream: false,
        user: sessionKey,
      }),
    });

    console.log('Status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Error:', text.substring(0, 200));
      return `接続エラー: ${res.status}`;
    }

    const data = await res.json();
    return (data?.choices?.[0]?.message?.content || '...').slice(0, 5000);
  } catch (e: any) {
    console.error('Fetch error:', e.message);
    return `エラー: ${e.message}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    if (events.length === 0) {
      return NextResponse.json({ status: 'ok' });
    }

    await Promise.all(
      events.map(async (event: any) => {
        if (event.type !== 'message' || event.message?.type !== 'text') return;
        if (!event.replyToken) return;

        const reply = await callOpenClaw(event.message.text, getSessionKey(event));
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: reply }],
        });
      })
    );

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
