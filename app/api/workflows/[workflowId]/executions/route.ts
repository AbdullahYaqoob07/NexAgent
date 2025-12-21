import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/workflow/WorkflowManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    // Get executions for this workflow
    const executions = await workflowManager.listExecutions(workflowId);

    // Sort by most recent first
    executions.sort((a, b) => b.startTime - a.startTime);

    return NextResponse.json({
      success: true,
      executions
    });

  } catch (error) {
    console.error('Get workflow executions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}