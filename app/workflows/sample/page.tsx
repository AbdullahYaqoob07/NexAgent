'use client';

import { useState } from 'react';
import { workflowManager } from '@/lib/workflow/WorkflowManager';
import { Workflow, WorkflowExecution } from '@/lib/workflow/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, CheckCircle, XCircle, ExternalLink, Clock, Zap, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SampleWorkflowPage() {
  const router = useRouter();
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSampleWorkflow = (): Workflow => {
    return {
      id: `sample_workflow_${Date.now()}`,
      name: 'Sample Data Processing Workflow',
      description: 'A comprehensive workflow demonstrating various node types',
      nodes: [
        {
          id: 'node_1',
          type: 'json_parse',
          name: 'Parse Input Data',
          description: 'Parse the input JSON data',
          config: {
            jsonString: '{"name": "John Doe", "age": 30, "email": "john@example.com"}'
          },
          inputs: [
            { id: 'json_string', name: 'JSON String', type: 'string', required: true }
          ],
          outputs: [
            { id: 'parsed_data', name: 'Parsed Data', type: 'object', required: true }
          ],
          position: { x: 100, y: 100 },
          enabled: true,
          category: 'data' as any,
        },
        {
          id: 'node_2',
          type: 'if_logic',
          name: 'Check Age',
          description: 'Check if age is greater than 18',
          config: {
            operator: 'greater_than',
            field: 'age',
            value: 18
          },
          inputs: [
            { id: 'condition', name: 'Condition', type: 'boolean', required: true }
          ],
          outputs: [
            { id: 'result', name: 'Result', type: 'any', required: true }
          ],
          position: { x: 400, y: 100 },
          enabled: true,
          category: 'logic' as any,
        },
        {
          id: 'node_3',
          type: 'openai_completion',
          name: 'Generate Response',
          description: 'Generate a personalized response using AI',
          config: {
            prompt: 'Generate a personalized greeting for {{parsed_data.name}} who is {{parsed_data.age}} years old',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 200
          },
          inputs: [
            { id: 'prompt', name: 'Prompt', type: 'string', required: true }
          ],
          outputs: [
            { id: 'completion', name: 'Completion', type: 'string', required: true }
          ],
          position: { x: 700, y: 100 },
          enabled: true,
          category: 'ai_ml' as any,
        },
        {
          id: 'node_4',
          type: 'http_request_action',
          name: 'Send Notification',
          description: 'Send a notification via HTTP',
          config: {
            url: 'https://api.example.com/notify',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              message: '{{completion}}',
              user: '{{parsed_data.name}}'
            }
          },
          inputs: [
            { id: 'url', name: 'URL', type: 'string', required: true },
            { id: 'method', name: 'Method', type: 'string', required: false },
            { id: 'headers', name: 'Headers', type: 'object', required: false },
            { id: 'body', name: 'Body', type: 'object', required: false }
          ],
          outputs: [
            { id: 'response_data', name: 'Response Data', type: 'object', required: true }
          ],
          position: { x: 1000, y: 100 },
          enabled: true,
          category: 'action' as any,
        },
        {
          id: 'node_5',
          type: 'save_action',
          name: 'Save Result',
          description: 'Save the final result',
          config: {
            data: '{{response_data}}',
            key: 'workflow_result_{{timestamp}}',
            storageType: 'memory'
          },
          inputs: [
            { id: 'data', name: 'Data to Save', type: 'object', required: true }
          ],
          outputs: [
            { id: 'save_result', name: 'Save Result', type: 'object', required: true }
          ],
          position: { x: 1300, y: 100 },
          enabled: true,
          category: 'action' as any,
        }
      ],
      connections: [
        {
          id: 'conn_1',
          sourceNodeId: 'node_1',
          sourcePortId: 'parsed_data',
          targetNodeId: 'node_2',
          targetPortId: 'condition',
          enabled: true
        },
        {
          id: 'conn_2',
          sourceNodeId: 'node_1',
          sourcePortId: 'parsed_data',
          targetNodeId: 'node_3',
          targetPortId: 'prompt',
          enabled: true
        },
        {
          id: 'conn_3',
          sourceNodeId: 'node_3',
          sourcePortId: 'completion',
          targetNodeId: 'node_4',
          targetPortId: 'body',
          enabled: true
        },
        {
          id: 'conn_4',
          sourceNodeId: 'node_4',
          sourcePortId: 'response_data',
          targetNodeId: 'node_5',
          targetPortId: 'data',
          enabled: true
        }
      ],
      settings: {
        timeout: 300000,
        retryCount: 3,
        concurrency: 1,
        errorHandling: 'stop',
      },
      status: 'draft'
    };
  };

  const executeSampleWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);

      const workflow = createSampleWorkflow();
      
      // Execute workflow
      const result = await workflowManager.executeWorkflow(
        workflow,
        { 
          timestamp: new Date().toISOString(),
          demoInput: 'Sample workflow execution'
        },
        {
          timeout: 30000,
          retryCount: 2,
          errorHandling: 'stop'
        }
      );

      setExecution(result);

      // Save workflow
      await workflowManager.saveWorkflow(workflow);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute workflow');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Sample Workflow Execution</h1>
            <p className="text-white/70 text-lg mt-2">Demonstrates a complete workflow with multiple node types</p>
          </div>
        <div className="flex gap-3">
          <Button
            onClick={executeSampleWorkflow}
            disabled={loading}
            className="bg-gradient-to-r from-[#FF6900] to-[#FF8555] hover:from-[#E55D00] hover:to-[#E66A33] text-white border-0"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Execute Sample Workflow
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/workflows/editor')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Open Workflow Editor
          </Button>
        </div>
      </div>

      {/* Workflow Description */}
      <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Sample Workflow: Data Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-white/70">
              This sample workflow demonstrates a complete data processing pipeline with the following steps:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
              <li><strong className="text-white">Parse Input Data</strong> - Parse JSON input data</li>
              <li><strong className="text-white">Check Age</strong> - Conditional logic to check if age is greater than 18</li>
              <li><strong className="text-white">Generate Response</strong> - Use AI to generate a personalized response</li>
              <li><strong className="text-white">Send Notification</strong> - Send HTTP notification with the generated response</li>
              <li><strong className="text-white">Save Result</strong> - Save the final result to storage</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {execution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(execution.status)}
              Execution Results
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={execution.status === 'completed' ? 'default' : 'destructive'}>
                {execution.status}
              </Badge>
              <span className="text-sm text-gray-600">
                Duration: {execution.duration ? formatDuration(execution.duration) : 'N/A'}
              </span>
              <span className="text-sm text-gray-600">
                Tokens: {execution.metadata.tokensUsed}
              </span>
              <span className="text-sm text-gray-600">
                Cost: ${execution.metadata.cost.toFixed(4)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Execution Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-xs text-gray-600">
                      {execution.duration ? formatDuration(execution.duration) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Tokens Used</p>
                    <p className="text-xs text-gray-600">{execution.metadata.tokensUsed}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Cost</p>
                    <p className="text-xs text-gray-600">${execution.metadata.cost.toFixed(4)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Nodes Executed</p>
                    <p className="text-xs text-gray-600">{execution.nodeLogs.length}</p>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Execution Logs */}
              <div>
                <h4 className="font-medium mb-4">Execution Steps</h4>
                <div className="space-y-3">
                  {execution.nodeLogs.map((log, index) => (
                    <div key={log.nodeId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <h5 className="font-medium">{log.nodeName}</h5>
                          <Badge variant="outline" className="text-xs">
                            {log.nodeType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm text-gray-500">
                            {log.duration ? formatDuration(log.duration) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {log.error && (
                        <Alert variant="destructive" className="mt-2">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{log.error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="font-medium">Start Time:</span>
                          <p className="text-gray-600">
                            {new Date(log.startTime).toLocaleTimeString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">End Time:</span>
                          <p className="text-gray-600">
                            {log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Retry Count:</span>
                          <p className="text-gray-600">{log.retryCount}</p>
                        </div>
                        <div>
                          <span className="font-medium">Tokens Used:</span>
                          <p className="text-gray-600">{log.metadata.tokensUsed || 0}</p>
                        </div>
                      </div>

                      {log.input && (
                        <div className="mt-3">
                          <h6 className="font-medium text-sm mb-1">Input</h6>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.output && (
                        <div className="mt-3">
                          <h6 className="font-medium text-sm mb-1">Output</h6>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Output */}
              {execution.output && (
                <div>
                  <h4 className="font-medium mb-2">Final Output</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-64">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/workflows/execution/${execution.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Execution Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setExecution(null)}
                >
                  Clear Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
