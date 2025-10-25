import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { credentialService } from '@/lib/services/credentialService';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { apiKey, organization, project } = body || {};
    if (!apiKey) return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });

    const createPayload = {
      platform: 'openai' as const,
      type: 'api_key' as const,
      status: 'active' as const,
      name: 'OpenAI API Key',
      description: 'OpenAI API credential',
      data: {
        apiKey,
        organization,
        project,
      },
      isActive: true,
    };

    const res = await credentialService.create(user.uid, createPayload as any);
    if (!res.success || !res.data) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to save credential' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { credentialId: (res.data as any).id } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save OpenAI credential' }, { status: 500 });
  }
}