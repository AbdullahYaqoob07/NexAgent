import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { credentialService } from '@/lib/services/credentialService';
import { CreateCredentialSchema } from '@/lib/schemas/credential';

// GET /api/credentials - Get all credentials for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;

    const result = await credentialService.getByUserId(user.uid, platform);
    
    if (result.success) {
      // Don't expose sensitive data in list view
      const sanitizedCredentials = result.data?.map(credential => ({
        ...credential,
        data: {
          ...credential.data,
          // Remove sensitive fields for list view
          accessToken: undefined,
          apiKey: undefined,
          refreshToken: undefined,
          secret: undefined,
        },
      }));

      return NextResponse.json({
        success: true,
        data: sanitizedCredentials,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

// POST /api/credentials - Create a new credential
export async function POST(request: NextRequest) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = CreateCredentialSchema.parse(body);
    
    const result = await credentialService.create(user.uid, validatedData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating credential:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid credential data', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create credential' },
      { status: 500 }
    );
  }
}