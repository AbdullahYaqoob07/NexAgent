import { NextRequest, NextResponse } from 'next/server';
import { shopifyService } from '@/lib/services/shopifyService';
// TODO: import { workflowService } from '@/lib/services/workflowService';

// Next.js 15 (Turbopack) expects route context params to be a Promise that must be awaited.
// See: type RouteHandlerConfig in Next.js validator.
interface RouteParams {
  params: Promise<{
    credentialId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { credentialId } = await params;
    
    // Handle the webhook
    const result = await shopifyService.handleWebhook(credentialId, request);
    
    if (!result.success) {
      console.error('Webhook handling failed:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // TODO: Find workflows that should be triggered by this event
    // const workflows = await workflowService.findWorkflowsByTrigger({
    //   platform: 'shopify',
    //   event: result.event!.event,
    //   credentialId,
    // });

    // TODO: Execute matching workflows
    // const executionResults = [];
    // for (const workflow of workflows) {
    //   try {
    //     const execution = await workflowService.executeWorkflow(
    //       workflow.id,
    //       result.event!.data,
    //       {
    //         trigger: {
    //           type: 'webhook',
    //           platform: 'shopify',
    //           event: result.event!.event,
    //           credentialId,
    //         },
    //       }
    //     );
    //     executionResults.push(execution);
    //   } catch (error) {
    //     console.error(`Failed to execute workflow ${workflow.id}:`, error);
    //   }
    // }

    console.log(`Processed Shopify webhook: ${result.event!.event}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      event: result.event!.event,
      data: result.event!.data,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
