import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const room = req.nextUrl.searchParams.get('room') || 'skillbridge-interview-room';
    const username = req.nextUrl.searchParams.get('username') || `candidate-${Math.random().toString(36).substring(2, 7)}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: 'LiveKit server credentials are not configured in environment variables.' },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: username,
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: wsUrl,
      room,
      username,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate token';
    console.error('[LiveKit Token Error]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
