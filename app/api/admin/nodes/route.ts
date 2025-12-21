import { NextRequest, NextResponse } from 'next/server';
import { nodeDefinitionsService } from '@/lib/firestore';
import { NodeDefinitionSchema } from '@/lib/schemas/node';
import { auth } from '@/lib/auth-server';
import { seedAllNodes } from '@/lib/admin/seed-nodes';
import { z } from 'zod';

// GET /api/admin/nodes - List all node definitions
export async function GET(request: NextRequest) {
  try {
    // For now, allow access without authentication for development/testing
    // TODO: Re-enable authentication in production
    // const session = await auth();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const isActive = url.searchParams.get('active');
    const search = url.searchParams.get('search');
    
    const where: any = {};
    
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } }
      ];
    }

    const result = await nodeDefinitionsService.getAll({
      category: category || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
      search: search || undefined
    });

    // Auto-seed default nodes if database is empty
    if (result.success && result.data.length === 0) {
      try {
        await seedAllNodes();
        
        // Fetch again after seeding
        const seededResult = await nodeDefinitionsService.getAll({
          category: category || undefined,
          isActive: isActive !== null ? isActive === 'true' : undefined,
          search: search || undefined
        });
        
        console.log(`🌱 After seeding, found ${seededResult.data?.length || 0} nodes`);
        
        if (seededResult.success) {
          return NextResponse.json({
            success: true,
            nodes: seededResult.data,
            total: seededResult.total,
            seeded: true // Flag to indicate seeding occurred
          });
        }
      } catch (seedError) {
        console.error('❌ Error auto-seeding nodes:', seedError);
        console.error('❌ Seed error stack:', seedError instanceof Error ? seedError.stack : 'No stack');
        // Continue with empty result if seeding fails
      }
    }

    // Format response to match what the sidebar expects
    if (result.success) {
      return NextResponse.json({
        success: true,
        nodes: result.data,
        total: result.total
      });
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching nodes:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch nodes',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/nodes - Create new node definition
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (implement your admin check here)
    
    const body = await request.json();
    
    // Add creator info
    body.createdBy = session.user.id;
    
    // Validate the node definition
    const validatedNode = NodeDefinitionSchema.parse(body);
    
    // Create the node definition
    const result = await nodeDefinitionsService.create(validatedNode);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    console.error('Error creating node:', error);
    
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
      { success: false, error: 'Failed to create node' },
      { status: 500 }
    );
  }
}