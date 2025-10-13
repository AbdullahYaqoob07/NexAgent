import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { shopifyService } from '@/lib/services/shopifyService';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { shopDomain } = body;

    if (!shopDomain) {
      return NextResponse.json(
        { success: false, error: 'Shop domain is required' },
        { status: 400 }
      );
    }

    // Generate OAuth authorization URL
    const authUrl = shopifyService.generateAuthUrl(shopDomain, user.uid);

    return NextResponse.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Shopify auth initiation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Shopify OAuth'
      },
      { status: 500 }
    );
  }
}