/**
 * Demo script to test the Advanced Workflow Engine
 * Shows different execution scenarios like n8n, Zapier, Make.com
 */

import { AdvancedWorkflowEngine } from '../engine/AdvancedWorkflowEngine';
import { Workflow, WorkflowNode, WorkflowConnection, NodeCategory } from '../types';

// Helper to create a demo workflow
function createDemoWorkflow(scenario: 'sequential' | 'parallel' | 'conditional' | 'complex'): Workflow {
  const baseWorkflow: Workflow = {
    id: `demo_${scenario}_${Date.now()}`,
    name: `Demo ${scenario} Workflow`,
    description: `Testing ${scenario} execution pattern`,
    nodes: [],
    connections: [],
    settings: {
      timeout: 30000,
      retryCount: 2,
      errorHandling: 'stop',
      concurrency: 5
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  switch (scenario) {
    case 'sequential':
      // Simple sequential flow: Trigger -> HTTP -> Transform -> Email
      baseWorkflow.nodes = [
        {
          id: 'trigger_1',
          type: 'On Clicking Execute',
          name: 'Manual Trigger',
          category: NodeCategory.TRIGGER,
          position: { x: 100, y: 200 },
          config: {},
          inputs: [],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'http_1',
          type: 'HTTP Request',
          name: 'Fetch Data',
          category: NodeCategory.ACTION,
          position: { x: 300, y: 200 },
          config: { url: 'https://api.example.com/data', method: 'GET' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'transform_1',
          type: 'Transform',
          name: 'Process Data',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 200 },
          config: { operation: 'map' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'email_1',
          type: 'Email',
          name: 'Send Results',
          category: NodeCategory.ACTION,
          position: { x: 700, y: 200 },
          config: { to: 'user@example.com', subject: 'Workflow Results' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        }
      ];
      baseWorkflow.connections = [
        { id: 'conn_1', sourceNodeId: 'trigger_1', sourcePortId: 'output', targetNodeId: 'http_1', targetPortId: 'input', enabled: true },
        { id: 'conn_2', sourceNodeId: 'http_1', sourcePortId: 'output', targetNodeId: 'transform_1', targetPortId: 'input', enabled: true },
        { id: 'conn_3', sourceNodeId: 'transform_1', sourcePortId: 'output', targetNodeId: 'email_1', targetPortId: 'input', enabled: true }
      ];
      break;

    case 'parallel':
      // Parallel execution with fork: Trigger -> Fork -> [Branch1: HTTP->Email, Branch2: Database->Slack]
      baseWorkflow.nodes = [
        {
          id: 'trigger_1',
          type: 'On Clicking Execute',
          name: 'Start',
          category: NodeCategory.TRIGGER,
          position: { x: 100, y: 300 },
          config: {},
          inputs: [],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'fork_1',
          type: 'Double',
          name: 'Split Flow',
          category: NodeCategory.LOGIC,
          position: { x: 300, y: 300 },
          config: { outputCount: 2 },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [
            { id: 'output_1', name: 'Output 1', type: 'any', required: true },
            { id: 'output_2', name: 'Output 2', type: 'any', required: true }
          ],
          enabled: true
        },
        // Branch 1
        {
          id: 'http_1',
          type: 'HTTP Request',
          name: 'API Call',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 200 },
          config: { url: 'https://api.example.com/branch1' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'email_1',
          type: 'Email',
          name: 'Send Email',
          category: NodeCategory.ACTION,
          position: { x: 700, y: 200 },
          config: { to: 'branch1@example.com' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        // Branch 2
        {
          id: 'database_1',
          type: 'Database',
          name: 'Query DB',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 400 },
          config: { query: 'SELECT * FROM users' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'slack_1',
          type: 'Slack',
          name: 'Notify Slack',
          category: NodeCategory.ACTION,
          position: { x: 700, y: 400 },
          config: { channel: '#notifications' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        }
      ];
      baseWorkflow.connections = [
        { id: 'conn_1', sourceNodeId: 'trigger_1', sourcePortId: 'output', targetNodeId: 'fork_1', targetPortId: 'input', enabled: true },
        // Branch 1 connections
        { id: 'conn_2', sourceNodeId: 'fork_1', sourcePortId: 'output_1', targetNodeId: 'http_1', targetPortId: 'input', enabled: true },
        { id: 'conn_3', sourceNodeId: 'http_1', sourcePortId: 'output', targetNodeId: 'email_1', targetPortId: 'input', enabled: true },
        // Branch 2 connections
        { id: 'conn_4', sourceNodeId: 'fork_1', sourcePortId: 'output_2', targetNodeId: 'database_1', targetPortId: 'input', enabled: true },
        { id: 'conn_5', sourceNodeId: 'database_1', sourcePortId: 'output', targetNodeId: 'slack_1', targetPortId: 'input', enabled: true }
      ];
      break;

    case 'conditional':
      // Conditional flow: Trigger -> If -> [True: Email, False: Slack]
      baseWorkflow.nodes = [
        {
          id: 'trigger_1',
          type: 'On Clicking Execute',
          name: 'Start',
          category: NodeCategory.TRIGGER,
          position: { x: 100, y: 300 },
          config: {},
          inputs: [],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'if_1',
          type: 'If',
          name: 'Check Condition',
          category: NodeCategory.LOGIC,
          position: { x: 300, y: 300 },
          config: { condition: '{{input.value}} > 10' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [
            { id: 'true', name: 'True', type: 'any', required: true },
            { id: 'false', name: 'False', type: 'any', required: true }
          ],
          enabled: true
        },
        {
          id: 'email_1',
          type: 'Email',
          name: 'High Value Alert',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 200 },
          config: { to: 'alerts@example.com', subject: 'High Value' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'slack_1',
          type: 'Slack',
          name: 'Normal Notification',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 400 },
          config: { channel: '#general' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        }
      ];
      baseWorkflow.connections = [
        { id: 'conn_1', sourceNodeId: 'trigger_1', sourcePortId: 'output', targetNodeId: 'if_1', targetPortId: 'input', enabled: true },
        { id: 'conn_2', sourceNodeId: 'if_1', sourcePortId: 'true', targetNodeId: 'email_1', targetPortId: 'input', enabled: true },
        { id: 'conn_3', sourceNodeId: 'if_1', sourcePortId: 'false', targetNodeId: 'slack_1', targetPortId: 'input', enabled: true }
      ];
      break;

    case 'complex':
      // Complex workflow with multiple patterns
      baseWorkflow.nodes = [
        {
          id: 'trigger_1',
          type: 'Schedule',
          name: 'Daily Schedule',
          category: NodeCategory.TRIGGER,
          position: { x: 50, y: 300 },
          config: { cron: '0 9 * * *' },
          inputs: [],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'http_1',
          type: 'HTTP Request',
          name: 'Fetch Orders',
          category: NodeCategory.ACTION,
          position: { x: 200, y: 300 },
          config: { url: 'https://api.example.com/orders' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'fork_1',
          type: 'Triple',
          name: 'Process Orders',
          category: NodeCategory.LOGIC,
          position: { x: 350, y: 300 },
          config: { outputCount: 3 },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [
            { id: 'output_1', name: 'Output 1', type: 'any', required: true },
            { id: 'output_2', name: 'Output 2', type: 'any', required: true },
            { id: 'output_3', name: 'Output 3', type: 'any', required: true }
          ],
          enabled: true
        },
        // Branch 1: Analytics
        {
          id: 'transform_1',
          type: 'Transform',
          name: 'Calculate Metrics',
          category: NodeCategory.ACTION,
          position: { x: 500, y: 150 },
          config: { operation: 'aggregate' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'database_1',
          type: 'Database',
          name: 'Store Analytics',
          category: NodeCategory.ACTION,
          position: { x: 650, y: 150 },
          config: { query: 'INSERT INTO analytics' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        // Branch 2: Notifications
        {
          id: 'if_1',
          type: 'If',
          name: 'Check Threshold',
          category: NodeCategory.LOGIC,
          position: { x: 500, y: 300 },
          config: { condition: 'orders.length > 100' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [
            { id: 'true', name: 'True', type: 'any', required: true },
            { id: 'false', name: 'False', type: 'any', required: true }
          ],
          enabled: true
        },
        {
          id: 'email_1',
          type: 'Email',
          name: 'Alert Management',
          category: NodeCategory.ACTION,
          position: { x: 650, y: 250 },
          config: { to: 'management@example.com' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'slack_1',
          type: 'Slack',
          name: 'Team Update',
          category: NodeCategory.ACTION,
          position: { x: 650, y: 350 },
          config: { channel: '#team' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        // Branch 3: Reporting
        {
          id: 'openai_1',
          type: 'OpenAI',
          name: 'Generate Report',
          category: NodeCategory.AI_ML,
          position: { x: 500, y: 450 },
          config: { prompt: 'Summarize order data' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        },
        {
          id: 'save_1',
          type: 'Save',
          name: 'Save Report',
          category: NodeCategory.ACTION,
          position: { x: 650, y: 450 },
          config: { location: 'reports/' },
          inputs: [{ id: 'input', name: 'Input', type: 'any', required: true }],
          outputs: [{ id: 'output', name: 'Output', type: 'any', required: true }],
          enabled: true
        }
      ];
      baseWorkflow.connections = [
        { id: 'conn_1', sourceNodeId: 'trigger_1', sourcePortId: 'output', targetNodeId: 'http_1', targetPortId: 'input', enabled: true },
        { id: 'conn_2', sourceNodeId: 'http_1', sourcePortId: 'output', targetNodeId: 'fork_1', targetPortId: 'input', enabled: true },
        // Branch 1
        { id: 'conn_3', sourceNodeId: 'fork_1', sourcePortId: 'output_1', targetNodeId: 'transform_1', targetPortId: 'input', enabled: true },
        { id: 'conn_4', sourceNodeId: 'transform_1', sourcePortId: 'output', targetNodeId: 'database_1', targetPortId: 'input', enabled: true },
        // Branch 2
        { id: 'conn_5', sourceNodeId: 'fork_1', sourcePortId: 'output_2', targetNodeId: 'if_1', targetPortId: 'input', enabled: true },
        { id: 'conn_6', sourceNodeId: 'if_1', sourcePortId: 'true', targetNodeId: 'email_1', targetPortId: 'input', enabled: true },
        { id: 'conn_7', sourceNodeId: 'if_1', sourcePortId: 'false', targetNodeId: 'slack_1', targetPortId: 'input', enabled: true },
        // Branch 3
        { id: 'conn_8', sourceNodeId: 'fork_1', sourcePortId: 'output_3', targetNodeId: 'openai_1', targetPortId: 'input', enabled: true },
        { id: 'conn_9', sourceNodeId: 'openai_1', sourcePortId: 'output', targetNodeId: 'save_1', targetPortId: 'input', enabled: true }
      ];
      break;
  }

  return baseWorkflow;
}

// Run demo
async function runDemo() {
  const engine = new AdvancedWorkflowEngine();

  console.log('\n===========================================');
  console.log('🎯 NexAgent Advanced Workflow Engine Demo');
  console.log('===========================================\n');

  const scenarios: Array<'sequential' | 'parallel' | 'conditional' | 'complex'> = [
    'sequential',
    'parallel',
    'conditional',
    'complex'
  ];

  for (const scenario of scenarios) {
    console.log(`\n\n📌 Testing ${scenario.toUpperCase()} Workflow`);
    console.log('─'.repeat(50));

    const workflow = createDemoWorkflow(scenario);
    
    try {
      const execution = await engine.execute(workflow, 
        { value: 15, timestamp: Date.now() },
        {
          retryCount: 2,
          errorHandling: 'continue',
          onStepStart: (log) => {
            console.log(`  ▶️ Starting: ${log.nodeName}`);
          },
          onStepComplete: (log) => {
            console.log(`  ✅ Completed: ${log.nodeName} (${log.duration}ms)`);
          },
          onStepFail: (log) => {
            console.log(`  ❌ Failed: ${log.nodeName} - ${log.error}`);
          }
        }
      );

      console.log(`\n📊 Execution Summary:`);
      console.log(`  Status: ${execution.status}`);
      console.log(`  Duration: ${execution.duration}ms`);
      console.log(`  Nodes Executed: ${execution.nodeLogs.length}`);
      console.log(`  Success Rate: ${(execution.nodeLogs.filter(l => l.status === 'completed').length / execution.nodeLogs.length * 100).toFixed(1)}%`);

    } catch (error) {
      console.error(`\n❌ Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Clear state for next test
    engine.clearState();
  }

  console.log('\n\n===========================================');
  console.log('✨ Demo Complete!');
  console.log('===========================================\n');
}

// Export for testing
export { createDemoWorkflow, runDemo };

// Run demo if called directly
if (typeof window === 'undefined' && require.main === module) {
  runDemo().catch(console.error);
}