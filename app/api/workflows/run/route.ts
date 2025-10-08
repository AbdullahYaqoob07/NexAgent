import { NextRequest, NextResponse } from 'next/server';
import { workflowManager } from '@/lib/workflow/WorkflowManager';
import { Workflow, ExecutionContext } from '@/lib/workflow/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflow, input = {}, options = {} } = body;

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow definition is required' },
        { status: 400 }
      );
    }

    // Validate workflow structure
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow must have at least one node' },
        { status: 400 }
      );
    }

    // Execute the workflow
    const execution = await workflowManager.executeWorkflow(
      workflow as Workflow,
      input as ExecutionContext,
      options
    );

    // Save the execution
    await workflowManager.saveWorkflow(workflow as Workflow);

    return NextResponse.json({
      success: execution.status === 'completed',
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      executionTime: execution.duration,
      tokensUsed: execution.metadata.tokensUsed,
      cost: execution.metadata.cost,
      nodeLogs: execution.nodeLogs,
      output: execution.output,
      error: execution.error
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}