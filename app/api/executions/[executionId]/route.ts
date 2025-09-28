/**
 * Execution Details API
 * 
 * GET /api/executions/[executionId]
 * 
 * Fetches detailed execution information including steps, logs, and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/workflow/WorkflowManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await  params;
    
    if (!executionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Execution ID is required',
          code: 'MISSING_EXECUTION_ID'
        },
        { status: 400 }
      );
    }

    // Get execution details from workflow manager
    const execution = workflowManager.getExecution(executionId);
    
    if (!execution) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Execution not found',
          code: 'EXECUTION_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'EXECUTION_FETCH_ERROR'
      },
      { status: 500 }
    );
  }
}
