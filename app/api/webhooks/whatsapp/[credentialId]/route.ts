import { NextRequest, NextResponse } from 'next/server';
import { credentialService } from '@/lib/services/credentialService';

interface RouteParams {
  params: Promise<{ credentialId: string }>;
}

// GET: Verification (hub.challenge)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { credentialId } = await params;
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = url.searchParams.get('hub.verify_token');

    if (!mode || !challenge || !verifyToken) {
      return NextResponse.json({ error: 'Missing verification params' }, { status: 400 });
    }

    // Load credential and compare verify token
    const credResp = await credentialService.getById('system', credentialId);
    if (!credResp.success || credResp.data?.platform !== 'whatsapp') {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const expected = (credResp.data as any).data?.webhookVerifyToken;
    if (verifyToken !== expected) {
      return NextResponse.json({ error: 'Verify token mismatch' }, { status: 403 });
    }

    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// POST: Event notifications
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { credentialId } = await params;
    const body = await request.json();

    // Optionally verify signature header: X-Hub-Signature-256 (not implemented here)

    // Update last used timestamp
    await credentialService.updateLastUsed('system', credentialId);

    // Normalize event structure
    const event = {
      platform: 'whatsapp',
      event: body?.entry?.[0]?.changes?.[0]?.value?.statuses ? 'message_status' : 'incoming_message',
      data: body,
      credentialId,
    } as const;

    // TODO: trigger workflows by event

    return NextResponse.json({ success: true, event: event.event });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 });
  }
}