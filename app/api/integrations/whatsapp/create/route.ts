import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { credentialService } from '@/lib/services/credentialService';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      businessAccountId,
      phoneNumberId,
      token,
      webhookVerifyToken,
      defaultTemplateLanguage,
      displayName,
      phoneNumber,
    } = body || {};

    if (!businessAccountId || !phoneNumberId || !token || !webhookVerifyToken) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const createPayload = {
      name: displayName || 'WhatsApp Account',
      description: `WA BABA:${businessAccountId} PNID:${phoneNumberId}`,
      platform: 'whatsapp' as const,
      type: 'api_key' as const,
      status: 'active' as const,
      data: {
        businessAccountId,
        phoneNumberId,
        token,
        defaultTemplateLanguage: defaultTemplateLanguage || 'en_US',
        webhookVerifyToken,
      },
      metadata: {
        displayName,
        phoneNumber,
      },
      isActive: true,
    };

    const res = await credentialService.create(user.uid, createPayload as any);
    if (!res.success || !res.data) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to save credential' }, { status: 500 });
    }

    // Provide webhook endpoint to register at Meta app settings
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp/${res.data.id}`;

    return NextResponse.json({ success: true, data: { credentialId: (res.data as any).id, webhookUrl } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create WhatsApp credential' }, { status: 500 });
  }
}