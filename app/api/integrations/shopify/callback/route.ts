import { NextRequest, NextResponse } from 'next/server';
import { shopifyService, ShopifyOAuthParams } from '@/lib/services/shopifyService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: ShopifyOAuthParams = {
      shop: searchParams.get('shop') || '',
      code: searchParams.get('code') || undefined,
      state: searchParams.get('state') || undefined,
      hmac: searchParams.get('hmac') || undefined,
      timestamp: searchParams.get('timestamp') || undefined,
    };

    // Handle OAuth callback
    const result = await shopifyService.handleOAuthCallback(params);
    
    if (result.success) {
      // Redirect back to credentials page with success info
      const successUrl = new URL('/credentials', request.nextUrl.origin);
      successUrl.searchParams.set('connected', 'shopify');
      successUrl.searchParams.set('credentialId', result.credential!.id);
      successUrl.searchParams.set('shopName', result.credential!.metadata?.shopName || 'Unknown');
      
      return NextResponse.redirect(successUrl);
    } else {
      // Redirect back to credentials page with error info
      const errorUrl = new URL('/credentials', request.nextUrl.origin);
      errorUrl.searchParams.set('error', result.error || 'Unknown error');
      
      return NextResponse.redirect(errorUrl);
    }
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    
    const errorUrl = new URL('/integrations/shopify/error', request.nextUrl.origin);
    errorUrl.searchParams.set('error', 'OAuth callback failed');
    
    return NextResponse.redirect(errorUrl);
  }
}