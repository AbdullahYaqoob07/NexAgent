import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    // For testing purposes, we'll return the test workflow
    if (workflowId === 'test_workflow_123') {
      const testWorkflowPath = join(process.cwd(), 'test_variable_picker_workflow.json');
      const workflowData = JSON.parse(readFileSync(testWorkflowPath, 'utf8'));
      
      return NextResponse.json({
        success: true,
        workflow: workflowData
      });
    }

    // For other workflow IDs, return a basic structure
    return NextResponse.json({
      success: true,
      workflow: {
        id: workflowId,
        name: `Workflow ${workflowId}`,
        nodes: [],
        connections: []
      }
    });

  } catch (error) {
    console.error('Get workflow error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}