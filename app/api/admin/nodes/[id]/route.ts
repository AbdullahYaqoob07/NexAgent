import { NextRequest, NextResponse } from 'next/server';
import { nodeDefinitionsService } from '@/lib/firestore';
import { NodeDefinitionSchema } from '@/lib/schemas/node';
import { auth } from '@/lib/auth-server';
import { z } from 'zod';

// GET /api/admin/nodes/[id] - Get specific node definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await nodeDefinitionsService.getById(id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching node:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch node' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/nodes/[id] - Update node definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Update the node
    const result = await nodeDefinitionsService.update(id, body);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Node not found' ? 404 : 400 }
      );
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error updating node:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/nodes/[id] - Delete node definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete the node
    const result = await nodeDefinitionsService.delete(id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/nodes/[id]/status - Toggle node active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { isActive } = await request.json();

    // Update only the active status
    const result = await nodeDefinitionsService.updateStatus(id, isActive);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error updating node status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update node status' },
      { status: 500 }
    );
  }
}