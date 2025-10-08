'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WorkflowExecution, NodeExecutionLog } from '@/lib/workflow/types';
import { workflowManager } from '@/lib/workflow/WorkflowManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  ExternalLink,
  Calendar,
  Timer,
  Zap,
  DollarSign
} from 'lucide-react';

export default function ExecutionPage({ params }: { params: Promise<{ executionId: string }> }) {
  const [executionId, setExecutionId] = useState<string>('');
  
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Await params to get executionId
  useEffect(() => {
    const getExecutionId = async () => {
      const resolvedParams = await params;
      setExecutionId(resolvedParams.executionId);
    };
    getExecutionId();
  }, [params]);

  useEffect(() => {
    if (executionId) {
      loadExecution();
    }
  }, [executionId]);

  const loadExecution = async () => {
    try {
      setLoading(true);
      
      // Try to load from API first (for server-side execution)
      try {
        const response = await fetch(`/api/workflows/execution/${executionId}`);
        if (response.ok) {
      const data = await response.json();
          if (data.success && data.execution) {
            setExecution(data.execution);
            return;
          }
        }
      } catch (apiError) {
        console.log('API load failed, trying local storage:', apiError);
      }
      
      // Fallback to local storage
      const exec = await workflowManager.getExecution(executionId);
      if (exec) {
        setExecution(exec);
      } else {
        setError('Execution not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'running':
        return <Play className="h-4 w-4 text-blue-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <Clock className="h-4 w-4 text-white/70" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
          return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
          return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'running':
          return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'pending':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
          return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
          return 'bg-white/10 text-white/70 border-white/20';
      }
    };

    return (
      <Badge className={`flex items-center gap-1 border ${getStatusStyle(status)}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6900] mx-auto mb-4"></div>
          <p className="text-white/70">Loading execution details...</p>
              </div>
            </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Execution Not Found</h1>
          <p className="text-white/70">The requested execution could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Workflow Execution</h1>
            <p className="text-white/70">Execution ID: {execution.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(execution.status)}
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadExecution}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

      {/* Execution Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Status</CardTitle>
            {getStatusIcon(execution.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Duration</CardTitle>
            <Timer className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {execution.duration ? formatDuration(execution.duration) : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {execution.metadata.tokensUsed.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${execution.metadata.cost.toFixed(4)}
            </div>
          </CardContent>
        </Card>
                </div>

      {/* Execution Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Info */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-[#FF6900]" />
              Execution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-white">Workflow ID:</span>
                <p className="text-white/70 font-mono text-xs">{execution.workflowId}</p>
              </div>
              <div>
                <span className="font-medium text-white">Started:</span>
                <p className="text-white/70">{formatTimestamp(execution.startTime)}</p>
                </div>
              <div>
                <span className="font-medium text-white">Ended:</span>
                <p className="text-white/70">
                  {execution.endTime ? formatTimestamp(execution.endTime) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="font-medium text-white">Duration:</span>
                <p className="text-white/70">
                  {execution.duration ? formatDuration(execution.duration) : 'N/A'}
                </p>
              </div>
            </div>
            
            {execution.error && (
              <Alert className="bg-red-500/20 border-red-500/30 text-red-400">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {execution.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Input/Output */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Input/Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-white">Input</h4>
                <pre className="bg-white/5 border border-white/10 p-3 rounded text-xs overflow-auto max-h-32 text-white/80">
                  {JSON.stringify(execution.input, null, 2)}
                </pre>
                  </div>
              {execution.output && (
                <div>
                  <h4 className="font-medium mb-2 text-white">Output</h4>
                  <pre className="bg-white/5 border border-white/10 p-3 rounded text-xs overflow-auto max-h-32 text-white/80">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </div>

      {/* Node Execution Logs */}
      <Card className="bg-black/40 backdrop-blur-xl border border-white/10">
              <CardHeader>
          <CardTitle className="text-white">Node Execution Logs</CardTitle>
          <p className="text-sm text-white/70">
            {execution.nodeLogs.length} node(s) executed
          </p>
              </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {execution.nodeLogs.map((log, index) => (
              <div key={log.nodeId} className="border border-white/10 rounded-lg p-4 bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/70">#{index + 1}</span>
                    <h4 className="font-medium text-white">{log.nodeName}</h4>
                    <Badge className="text-xs bg-white/10 text-white/80 border-white/20">
                      {log.nodeType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.status)}
                    <span className="text-sm text-white/70">
                      {log.duration ? formatDuration(log.duration) : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {log.error && (
                  <Alert className="mt-2 bg-red-500/20 border-red-500/30 text-red-400">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{log.error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium text-white">Start Time:</span>
                    <p className="text-white/70">{formatTimestamp(log.startTime)}</p>
                  </div>
                    <div>
                    <span className="font-medium text-white">End Time:</span>
                    <p className="text-white/70">
                      {log.endTime ? formatTimestamp(log.endTime) : 'N/A'}
                    </p>
                    </div>
                  <div>
                    <span className="font-medium text-white">Retry Count:</span>
                    <p className="text-white/70">{log.retryCount}</p>
                          </div>
                          <div>
                    <span className="font-medium text-white">Tokens Used:</span>
                    <p className="text-white/70">{log.metadata.tokensUsed || 0}</p>
                        </div>
                      </div>
                      
                {log.input && (
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-1 text-white">Input</h5>
                    <pre className="bg-white/5 border border-white/10 p-2 rounded text-xs overflow-auto max-h-20 text-white/80">
                      {JSON.stringify(log.input, null, 2)}
                                </pre>
                              </div>
                            )}

                {log.output && (
                  <div className="mt-3">
                    <h5 className="font-medium text-sm mb-1 text-white">Output</h5>
                    <pre className="bg-white/5 border border-white/10 p-2 rounded text-xs overflow-auto max-h-20 text-white/80">
                      {JSON.stringify(log.output, null, 2)}
                              </pre>
                            </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
      </div>
    </div>
  );
}