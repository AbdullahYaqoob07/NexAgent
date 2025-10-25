import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthUser } from '@/lib/auth/serverAuth';
import { credentialService } from '@/lib/services/credentialService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/credentials/[id] - Get specific credential
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await credentialService.getById(user.uid, id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.error === 'Credential not found' ? 404 : 500 }
    );
  } catch (error) {
    console.error('Error fetching credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credential' },
      { status: 500 }
    );
  }
}

// DELETE /api/credentials/[id] - Delete credential
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await credentialService.delete(user.uid, id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.error === 'Credential not found' ? 404 : 500 }
    );
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}

// PUT /api/credentials/[id] - Update credential
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const result = await credentialService.update(user.uid, id, body);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.error === 'Credential not found' ? 404 : 500 }
    );
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update credential' },
      { status: 500 }
    );
  }
}