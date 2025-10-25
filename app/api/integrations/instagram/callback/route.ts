import { NextRequest, NextResponse } from 'next/server';
import { metaService } from '@/lib/services/metaService';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const code = sp.get('code') || undefined;
    const state = sp.get('state') || undefined;

    const result = await metaService.handleOAuthCallback('instagram', { code, state });
    const redirect = new URL('/credentials', request.nextUrl.origin);

    if (result.success) {
      redirect.searchParams.set('connected', 'instagram');
      redirect.searchParams.set('credentialId', result.credentialId || '');
    } else {
      redirect.searchParams.set('error', result.error || 'Instagram OAuth failed');
    }

    return NextResponse.redirect(redirect);
  } catch (error) {
    const redirect = new URL('/credentials', request.nextUrl.origin);
    redirect.searchParams.set('error', 'Instagram OAuth error');
    return NextResponse.redirect(redirect);
  }
}
