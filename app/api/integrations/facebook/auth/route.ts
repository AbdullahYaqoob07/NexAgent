import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { metaService } from '@/lib/services/metaService';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const authUrl = metaService.generateAuthUrl('facebook', user.uid);
    return NextResponse.json({ success: true, data: { authUrl } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to start Facebook OAuth' }, { status: 500 });
  }
}
