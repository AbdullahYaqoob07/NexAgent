import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/workflow/WorkflowManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    // Get execution details
    const execution = await workflowManager.getExecution(executionId);

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution
    });

  } catch (error) {
    console.error('Get execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
