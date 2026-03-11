"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidebar } from "./WorkflowSidebar";
import WorkflowCanvas, { WorkflowCanvasRef } from "./WorkflowCanvas";
import { WorkflowAssistant } from "./WorkflowAssistant";
import ExecutionModal from "./ExecutionModal";
import { WorkflowWalkthrough } from "./WorkflowWalkthrough";
// Removed tour components
import { Workflow, WorkflowExecution } from "@/lib/workflow/types";
import { workflowManager } from "@/lib/workflow/WorkflowManager";
import { getNodeMapping, convertCanvasNodeToWorkflowNode } from "@/lib/workflow/utils/NodeMapping";
import { getNodeDefinitionByType } from "@/lib/workflow/NodeDefinitions";
import { marketplaceService } from "@/lib/api/services/marketplaceService";
import { useAuth } from "@/lib/AuthContext";
import { Terminal, X, Download, AlertCircle, Store, Check, CheckCircle, XCircle, Clock, Play, Timer, Zap, Activity, ChevronDown, ChevronRight, RotateCcw, BarChart3, DollarSign } from "lucide-react";
interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps = { workflowId: undefined }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [canvasNodeCount, setCanvasNodeCount] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState<string>('Untitled Workflow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(workflowId || null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const sidebarRef = useRef<{ openTriggersWithBlink: () => void }>(null);
  const canvasRef = useRef<WorkflowCanvasRef>(null);
  const sidebarElementRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLDivElement>(null);
  const assistantElementRef = useRef<HTMLDivElement>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [activeTab, setActiveTab] = useState<'nexa' | 'executions'>('nexa');
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [errorNodeIds, setErrorNodeIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'info' | 'error' }[]>([]);
  // Snapshot used for undo after chatbot applies a workflow patch
  const [pendingPatch, setPendingPatch] = useState<{ snapshot: ReturnType<WorkflowCanvasRef['getWorkflowData']>; label: string } | null>(null);
  const [showOutputTerminal, setShowOutputTerminal] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [terminalHeight, setTerminalHeight] = useState(256); // Default height: 256px
  const [isDragging, setIsDragging] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<{scheduled: boolean; status: string | null}>({scheduled: false, status: null});
  const [outputTab, setOutputTab] = useState<'output' | 'network' | 'chat'>('output');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIncludeSecrets, setExportIncludeSecrets] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({ name: '', description: '', category: 'Automation', plan: 'free' as 'free' | 'paid', price: '' });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  // Publish eligibility: true only after a clean execution, cleared on any canvas change
  const [canPublish, setCanPublish] = useState(false);
  const lastSuccessSnapshotRef = useRef<string | null>(null);
  const [lastNodeOutputs, setLastNodeOutputs] = useState<Record<string, Record<string, any>>>({});
  // Executions analytics tab state
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [executionHistoryLoading, setExecutionHistoryLoading] = useState(false);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  // Chat tab state
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: 'user' | 'assistant'; content: string; time: string }[]
  >([]);
  const [chatInput, setChatInput] = useState('');
  const chatSessionId = useRef(`session_${Date.now()}`);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [networkRequests, setNetworkRequests] = useState<Array<{
    id: string;
    timestamp: string;
    method: string;
    url: string;
    status: number;
    statusText: string;
    duration: number;
    headers: Record<string, string>;
    responseHeaders: Record<string, string>;
    requestBody?: any;
    responseBody?: any;
    nodeId?: string;
    nodeName?: string;
  }>>([]);
  
  // Webhook listening mode state
  const [isWebhookListening, setIsWebhookListening] = useState(false);
  const webhookPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webhookSinceMs = useRef<number>(0);
  const webhookWorkflowId = useRef<string | null>(null);

  // Track last scheduler execution shown in terminal (raw ISO string from backend)
  const lastShownScheduledExecRef = useRef<string | null>(null);

  // Stop webhook listening (clears poll interval)
  const stopWebhookListening = useCallback(() => {
    if (webhookPollRef.current) {
      clearInterval(webhookPollRef.current);
      webhookPollRef.current = null;
    }
    setIsWebhookListening(false);
    setIsExecuting(false);
    const ts = new Date().toLocaleTimeString();
    setExecutionOutput(prev => [...prev, `[${ts}] ⏹ Webhook listener stopped.`]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webhookPollRef.current) clearInterval(webhookPollRef.current);
    };
  }, []);

  // Draggable terminal handlers
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !terminalRef.current) return;
    
    // Calculate new height based on mouse position
    const containerRect = terminalRef.current.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    
    // Limit height between 100px and 500px
    if (newHeight >= 100 && newHeight <= 500) {
      setTerminalHeight(newHeight);
    }
  }, [isDragging]);

  const stopDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDrag);
    }

    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [isDragging, onDrag, stopDrag]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (outputTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, outputTab]);

  const loadExecutionHistory = useCallback(async () => {
    const wfId = currentWorkflowId || workflowId;
    if (!wfId) return;
    setExecutionHistoryLoading(true);
    try {
      const execs = await workflowManager.listExecutions(wfId);
      setExecutionHistory(execs.sort((a, b) => b.startTime - a.startTime));
    } catch {
      // silently fail — history will be empty
    } finally {
      setExecutionHistoryLoading(false);
    }
  }, [currentWorkflowId, workflowId]);

  const addToast = (message: string, type: 'info' | 'error' = 'error') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Check scheduler status for this workflow
  useEffect(() => {
    const checkSchedulerStatus = async () => {
      if (!currentWorkflowId) return;
      
      try {
        const apiClient = (await import('@/lib/api/client')).default;
        const response = await apiClient.get(`/api/v1/workflows/${currentWorkflowId}/scheduler/status`);
        
        if (response.data) {
          setSchedulerStatus({scheduled: response.data.scheduled, status: response.data.status});
          
          // Show execution logs from scheduled runs
          if (response.data.last_execution && response.data.last_execution.timestamp) {
            const lastExec = response.data.last_execution;
            const rawTimestamp = lastExec.timestamp; // raw ISO string from backend

            // Skip if we've already displayed this execution
            if (rawTimestamp === lastShownScheduledExecRef.current) {
              // Already shown — do nothing
            } else {
            lastShownScheduledExecRef.current = rawTimestamp;
            const execTime = new Date(rawTimestamp);
            const timeStr = execTime.toLocaleTimeString();

            // Add execution start message
            const execStartMsg = `[${timeStr}] Scheduled execution started`;
            setExecutionOutput(prev => prev.length < 200 ? [...prev, execStartMsg] : prev);
            
            // Add node execution logs and track HTTP requests
            if (lastExec.node_logs && Array.isArray(lastExec.node_logs)) {
              // Find currently executing node (status: running or pending)
              const executingNode = lastExec.node_logs.find((log: any) => 
                log.status === 'running' || log.status === 'pending'
              );
              
              // Update active node for loading indicator
              if (executingNode) {
                setActiveNodeId(executingNode.nodeId);
                try { canvasRef.current?.setExecutingNode(executingNode.nodeId); } catch {}
              } else {
                // No executing node, clear indicator
                setActiveNodeId(null);
                try { canvasRef.current?.setExecutingNode(null); } catch {}
              }
              
              lastExec.node_logs.forEach((log: any) => {
                const isSuccess = log.status === 'success' || log.status === 'completed';
                const isFailed = log.status === 'failed' || log.status === 'error';
                const nodeEmoji = isSuccess ? '✅' : isFailed ? '❌' : '⏳';
                const nodeMsg = `[${timeStr}] ${nodeEmoji} ${log.nodeName || log.nodeId}: ${log.status}`;
                setExecutionOutput(prev => prev.length < 200 ? [...prev, nodeMsg] : prev);

                // Show Logger node message in terminal
                if (log.nodeType === 'Logger' && log.output?.message) {
                  const level = (log.output.level || 'info').toUpperCase();
                  setExecutionOutput(prev => prev.length < 200
                    ? [...prev, `[${timeStr}] 📝 [${level}] ${log.output.message}`]
                    : prev);
                }
                // Show IfCondition result
                if (log.nodeType === 'IfCondition' && log.output?.branch !== undefined) {
                  const br = log.output.branch;
                  setExecutionOutput(prev => prev.length < 200
                    ? [...prev, `[${timeStr}] 🔀 Branch: ${br === 'true' ? '✅' : '❌'} ${String(br).toUpperCase()}`]
                    : prev);
                }
                // Show HttpRequest result
                if ((log.nodeType === 'HttpRequest' || log.nodeType === 'HTTP Request') && log.output?.status_code !== undefined) {
                  const sc = log.output.status_code;
                  setExecutionOutput(prev => prev.length < 200
                    ? [...prev, `[${timeStr}] 🌐 ${log.output.ok ? '✅' : '⚠️'} HTTP ${sc}`]
                    : prev);
                }

                // Track HTTP requests for Network tab
                if (log.nodeType === 'HTTP Request' || log.nodeType === 'HttpNode' || log.nodeType === 'HTTP Request Action') {
                  const output = log.output || {};
                  if (output.status || output.url) {
                    const networkReq = {
                      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                      timestamp: log.startedAt || execTime.toISOString(),
                      method: output.method || 'GET',
                      url: output.url || log.nodeName || 'Unknown URL',
                      status: output.status || 0,
                      statusText: output.statusText || 'Unknown',
                      duration: log.executionTimeMs || 0,
                      headers: output.requestHeaders || {},
                      responseHeaders: output.headers || {},
                      requestBody: output.requestBody,
                      responseBody: output.data,
                      nodeId: log.nodeId,
                      nodeName: log.nodeName
                    };
                    setNetworkRequests(prev => [...prev.slice(-49), networkReq]);
                  }
                }
              });
            }

            // Add completion or error message
            if (lastExec.status === 'completed' || lastExec.status === 'success') {
              const completeMsg = `[${timeStr}] ✅ Execution completed (${lastExec.execution_time_ms}ms)`;
              setExecutionOutput(prev => prev.length < 200 ? [...prev, completeMsg] : prev);
            } else if (lastExec.error) {
              const errorMsg = `[${timeStr}] ❌ Execution failed: ${lastExec.error}`;
              setExecutionOutput(prev => prev.length < 200 ? [...prev, errorMsg] : prev);
            }
            } // end else (new execution)
          }
        }
      } catch (error) {
        // Silently fail - scheduler might not be running
        console.log('Scheduler status check failed:', error);
      }
    };
    
    checkSchedulerStatus();
    // Check every 5 seconds
    const interval = setInterval(checkSchedulerStatus, 5000);
    return () => clearInterval(interval);
  }, [currentWorkflowId]);

  // Check for Schedule nodes when canvas changes
  useEffect(() => {
    const checkForScheduleNode = () => {
      if (!canvasRef.current) return;
      
      const workflowData = canvasRef.current.getWorkflowData();
      if (!workflowData || !workflowData.nodes) return;
      
      const hasScheduleNode = workflowData.nodes.some((n: any) => {
        const nodeType = n.type || n.data?.type || '';
        return getNodeMapping(nodeType)?.nodeType === 'schedule_trigger';
      });
      
      // If no schedule node but scheduler is running, stop it
      if (!hasScheduleNode && schedulerStatus.scheduled) {
        setSchedulerStatus({scheduled: false, status: null});
      }
    };
    
    // Check when canvas node count changes
    if (canvasNodeCount > 0) {
      checkForScheduleNode();
    }
  }, [canvasNodeCount, schedulerStatus.scheduled]);

  // Check if walkthrough should be shown (first time on /workflows/new)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const walkthroughShown = localStorage.getItem('workflow-walkthrough-shown');
    if (!walkthroughShown && !workflowId) {
      // Only show on new workflow page, not when editing existing
      setTimeout(() => {
        setShowWalkthrough(true);
      }, 500); // Small delay to ensure components are rendered
    }
  }, [workflowId]);

  // Tour disabled for now

  // Tour removed for now

  // Load workflow on mount if ID is provided
  useEffect(() => {
    const loadWorkflow = async () => {
      // Get workflow ID from URL params or props
      const urlWorkflowId = searchParams?.get('id');
      const wfId = urlWorkflowId || workflowId || currentWorkflowId;
      
      if (!wfId || !canvasRef.current) {
        return;
      }

      setIsLoadingWorkflow(true);
      try {
        console.log('🔄 Loading workflow:', wfId);
        const workflow = await workflowManager.loadWorkflow(wfId);
        
        if (workflow) {
          console.log('✅ Workflow loaded:', workflow);
          setWorkflowName(workflow.name || 'Untitled Workflow');
          setCurrentWorkflowId(workflow.id);
          
          // Convert workflow nodes to canvas format
          const canvasNodes = workflow.nodes.map((node: any) => ({
            id: node.id,
            type: node.type,
            name: node.name,
            x: node.position?.x || 100,
            y: node.position?.y || 100,
            config: node.config || {},
            data: {
              type: node.type,
              name: node.name,
              config: node.config || {}
            }
          }));
          
          // Convert workflow connections to canvas format
          const canvasConnections = workflow.connections.map((conn: any) => ({
            id: conn.id,
            from: conn.sourceNodeId,
            to: conn.targetNodeId,
            fromPoint: conn.sourcePortId || 'output',
            toPoint: conn.targetPortId || 'input',
            condition: conn.condition
          }));
          
          // Load into canvas
          canvasRef.current.loadWorkflow({
            nodes: canvasNodes,
            connections: canvasConnections
          });
          
          addToast(`Workflow "${workflow.name}" loaded`, 'info');
        } else {
          console.warn('⚠️ Workflow not found:', wfId);
        }
      } catch (error) {
        console.error('❌ Failed to load workflow:', error);
        addToast('Failed to load workflow', 'error');
      } finally {
        setIsLoadingWorkflow(false);
      }
    };

    loadWorkflow();
  }, [searchParams, workflowId]); // Load when URL params or workflowId prop changes

  // Save current workflow without executing
  const saveCurrentWorkflow = async () => {
    try {
      console.log('💾 Starting workflow save...');
      
      if (!canvasRef.current) {
        addToast('Canvas not ready', 'error');
        return;
      }
      const workflowData = canvasRef.current.getWorkflowData();
      if (!workflowData) {
        addToast('Nothing to save yet', 'info');
        return;
      }

      console.log('📊 Canvas data:', { 
        nodeCount: workflowData.nodes.length, 
        connectionCount: workflowData.connections.length 
      });

      const nodesArr = workflowData.nodes;
      const workflowNodes = nodesArr.map((canvasNode: any) => {
        const nodeType = canvasNode.type || canvasNode.data?.type || 'Unknown';
        const nodeMapping = getNodeMapping(nodeType);
        if (!nodeMapping) {
          return {
            id: canvasNode.id,
            type: nodeType,
            category: 'action' as any,
            name: canvasNode.name || canvasNode.data?.name || nodeType,
            description: `Node: ${nodeType}`,
            position: { x: canvasNode.x || 0, y: canvasNode.y || 0 },
            config: canvasNode.config || canvasNode.data?.config || {},
            inputs: [],
            outputs: [],
            version: '1.0.0',
            enabled: true,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return convertCanvasNodeToWorkflowNode(canvasNode, nodeMapping);
      });

      const now = new Date().toISOString();
      const wfId = currentWorkflowId || workflowId || `workflow_${Date.now()}`;
      const workflow: Workflow = {
        id: wfId,
        name: workflowName || 'Untitled Workflow',
        description: 'Workflow saved from editor',
        nodes: workflowNodes,
        connections: workflowData.connections.map((conn: any) => ({
          id: conn.id,
          sourceNodeId: conn.from,
          sourcePortId: conn.fromPoint || 'output',
          targetNodeId: conn.to,
          targetPortId: conn.toPoint || 'input',
          condition: conn.condition,
          type: 'default' as any,
          enabled: true
        })),
        settings: {
          timeout: 300000,
          retryCount: 3,
          concurrency: 1,
          errorHandling: 'stop'
        },
        createdAt: now,
        updatedAt: now,
        version: '1.0.0'
      };

      console.log('📤 Saving workflow:', {
        id: wfId,
        name: workflow.name,
        nodeCount: workflow.nodes.length,
        connectionCount: workflow.connections.length
      });

      await workflowManager.saveWorkflow(workflow);
      setCurrentWorkflowId(wfId);
      console.log('✅ Workflow saved successfully!');
      addToast('Workflow saved successfully!', 'info');
    } catch (e: any) {
      console.error('❌ Failed to save workflow:', e);
      console.error('Error details:', {
        message: e.message,
        stack: e.stack,
        response: e.response?.data
      });
      addToast(`Failed to save: ${e.message || 'Unknown error'}`, 'error');
    }
  };

  // Open export modal
  const handleExport = useCallback(() => {
    if (!canvasRef.current) { addToast('Canvas not ready', 'error'); return; }
    const workflowData = canvasRef.current.getWorkflowData();
    if (!workflowData || workflowData.nodes.length === 0) { addToast('No nodes to export', 'info'); return; }
    setShowExportModal(true);
  }, []);

  // Perform the actual export after modal confirmation
  const performExport = useCallback((includeSecrets: boolean) => {
    if (!canvasRef.current) return;
    const workflowData = canvasRef.current.getWorkflowData();
    if (!workflowData) return;

    const isSecretField = (nodeType: string, fieldName: string): boolean => {
      if (fieldName === 'credentials_json') return true;
      const def = getNodeDefinitionByType(nodeType);
      if (!def) return false;
      const field = def.fields.find((f) => f.name === fieldName);
      return field?.type === 'password';
    };

    const exportJson = {
      id: currentWorkflowId || `workflow_${Date.now()}`,
      name: workflowName || 'Untitled Workflow',
      nodes: workflowData.nodes.map((n: any) => {
        const nodeType = n.type || n.data?.type || '';
        const rawConfig: Record<string, any> = n.config || n.data?.config || {};
        const sanitizedConfig: Record<string, any> = {};
        for (const [key, val] of Object.entries(rawConfig)) {
          if (!includeSecrets && isSecretField(nodeType, key)) {
            sanitizedConfig[key] = `<YOUR_${key.toUpperCase()}>`;
          } else {
            sanitizedConfig[key] = val;
          }
        }
        return {
          id: n.id,
          type: nodeType,
          name: n.name || n.data?.name || nodeType,
          config: sanitizedConfig,
          position: { x: n.x || 0, y: n.y || 0 },
        };
      }),
      connections: workflowData.connections.map((c: any) => ({
        id: c.id,
        from: c.from,
        to: c.to,
        condition: c.condition ?? null,
      })),
    };

    const blob = new Blob([JSON.stringify(exportJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(workflowName || 'workflow').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    addToast('Workflow exported', 'info');
  }, [currentWorkflowId, workflowName]);

  // Open publish modal (pre-fill name from workflow)
  const handlePublish = useCallback(() => {
    if (!canvasRef.current) { addToast('Canvas not ready', 'error'); return; }
    const workflowData = canvasRef.current.getWorkflowData();
    if (!workflowData || workflowData.nodes.length === 0) { addToast('No nodes to publish', 'info'); return; }
    setPublishForm(f => ({ ...f, name: workflowName || '', description: '' }));
    setPublishSuccess(false);
    setShowPublishModal(true);
  }, [workflowName]);

  // Perform the publish — always strips secrets
  const performPublish = useCallback(async () => {
    if (!publishForm.name.trim()) { addToast('Please enter a name', 'error'); return; }
    if (!publishForm.description.trim()) { addToast('Please enter a description', 'error'); return; }
    if (publishForm.plan === 'paid' && (!publishForm.price || isNaN(Number(publishForm.price)) || Number(publishForm.price) <= 0)) {
      addToast('Please enter a valid price', 'error'); return;
    }
    if (!canvasRef.current) return;
    const workflowData = canvasRef.current.getWorkflowData();
    if (!workflowData) return;

    setIsPublishing(true);
    try {
      const isSecretField = (nodeType: string, fieldName: string): boolean => {
        if (fieldName === 'credentials_json') return true;
        const def = getNodeDefinitionByType(nodeType);
        if (!def) return false;
        return def.fields.find((f) => f.name === fieldName)?.type === 'password';
      };

      const sanitizedNodes = workflowData.nodes.map((n: any) => {
        const nodeType = n.type || n.data?.type || '';
        const rawConfig: Record<string, any> = n.config || n.data?.config || {};
        const sanitizedConfig: Record<string, any> = {};
        for (const [key, val] of Object.entries(rawConfig)) {
          sanitizedConfig[key] = isSecretField(nodeType, key) ? `<YOUR_${key.toUpperCase()}>` : val;
        }
        return { id: n.id, type: nodeType, name: n.name || n.data?.name || nodeType, config: sanitizedConfig, position: { x: n.x || 0, y: n.y || 0 } };
      });

      const workflowJson = {
        id: currentWorkflowId || `workflow_${Date.now()}`,
        name: publishForm.name.trim(),
        nodes: sanitizedNodes,
        connections: workflowData.connections.map((c: any) => ({ id: c.id, from: c.from, to: c.to, condition: c.condition ?? null })),
      };

      await marketplaceService.publishNexa({
        authorId: authUser?.uid || 'anonymous',
        authorName: authUser?.displayName || authUser?.email || 'Anonymous',
        name: publishForm.name.trim(),
        description: publishForm.description.trim(),
        category: publishForm.category,
        pricingModel: publishForm.plan,
        price: publishForm.plan === 'paid' ? Number(publishForm.price) : 0,
        workflowData: workflowJson,
      });

      setPublishSuccess(true);
    } catch (err: any) {
      addToast(`Publish failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  }, [publishForm, authUser, currentWorkflowId]);

  // Import workflow from a JSON file
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          const nodes: any[] = json.nodes || [];
          const connections: any[] = json.connections || [];

          const canvasNodes = nodes.map((n: any) => ({
            id: n.id,
            type: n.type,
            name: n.name || n.type,
            x: n.position?.x ?? 100,
            y: n.position?.y ?? 100,
            config: n.config || {},
            data: { type: n.type, name: n.name || n.type, config: n.config || {} },
          }));

          const canvasConnections = connections.map((c: any) => ({
            id: c.id || `conn_${Math.random().toString(36).slice(2)}`,
            from: c.from || c.sourceNodeId,
            to: c.to || c.targetNodeId,
            fromPoint: c.fromPoint || c.sourcePortId || 'output',
            toPoint: c.toPoint || c.targetPortId || 'input',
            condition: c.condition ?? null,
          }));

          if (!canvasRef.current) {
            addToast('Canvas not ready', 'error');
            return;
          }
          canvasRef.current.loadWorkflow({ nodes: canvasNodes, connections: canvasConnections });
          if (json.name) setWorkflowName(json.name);
          if (json.id) setCurrentWorkflowId(json.id);
          addToast(`Workflow "${json.name || 'Untitled'}" imported`, 'info');
        } catch {
          addToast('Invalid JSON file', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Poll for canvas changes and clear canPublish if anything changed since last clean run
  useEffect(() => {
    if (!canPublish) return;
    const interval = setInterval(() => {
      if (!canvasRef.current || !lastSuccessSnapshotRef.current) return;
      const current = JSON.stringify(canvasRef.current.getWorkflowData());
      if (current !== lastSuccessSnapshotRef.current) {
        setCanPublish(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [canPublish]);

  // Stop scheduler function
  const stopScheduler = async () => {
    if (!currentWorkflowId) {
      addToast('No workflow ID found', 'error');
      return;
    }

    try {
      const apiClient = (await import('@/lib/api/client')).default;
      const response = await apiClient.post(`/api/v1/workflows/${currentWorkflowId}/scheduler/stop`);

      if (response.data?.success) {
        setSchedulerStatus({scheduled: false, status: null});
        addToast('Scheduler stopped successfully', 'info');
      } else {
        addToast(response.data?.message || 'Failed to stop scheduler', 'error');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to stop scheduler';
      addToast(errorMessage, 'error');
      console.error('Stop scheduler error:', error);
    }
  };

  // Execute workflow function
  const executeWorkflow = async () => {
    // If webhook listener is running, stop it instead
    if (isWebhookListening) {
      stopWebhookListening();
      return;
    }

    if (!canvasRef.current) {
      setExecutionError('Canvas not ready');
      return;
    }

    // Track whether we entered webhook listening mode so the finally block
    // doesn't prematurely call setIsExecuting(false)
    let _webhookMode = false;

    setIsExecuting(true);
    setExecutionError(null);
    setExecutionOutput([]); // Clear previous output
    setShowOutputTerminal(true); // Show terminal on execute
    setCanPublish(false); // Clear publish eligibility at start of every run
    lastSuccessSnapshotRef.current = null;

    try {
      // Get workflow data from canvas
      const workflowData = canvasRef.current.getWorkflowData();
      
      // ─── WORKFLOW EXECUTION ───
      // Canvas data is minimal (just nodes + connections) - backend will validate
      // the full v2 schema after retrieving from Firestore.

      // Validation: ensure proper connections
      const nodesArr = workflowData.nodes;
      const conns = workflowData.connections;

      // Node helpers
      const byId = new Map(nodesArr.map(n => [n.id, n] as const));
      const outMap = new Map<string, string[]>();
      const inMap = new Map<string, string[]>();
      nodesArr.forEach(n => { outMap.set(n.id, []); inMap.set(n.id, []); });
      conns.forEach(c => {
        if (outMap.has(c.from)) outMap.get(c.from)!.push(c.to);
        if (inMap.has(c.to)) inMap.get(c.to)!.push(c.from);
      });

      // Identify trigger nodes by category from mapping
      const triggers = nodesArr.filter(n => {
        const m = getNodeMapping(n.type);
        return m?.category === 'trigger';
      });

      // Must have at least one trigger
      if (triggers.length === 0) {
        const allIds = nodesArr.map(n => n.id);
        setErrorNodeIds(allIds);
        try { canvasRef.current?.setErrorNodes?.(allIds); } catch {}
        addToast('Add at least one Trigger to start execution.', 'error');
        try { canvasRef.current?.setExecutingNode(null); } catch {}
        return;
      }

      // Graph traversal (forward) from all triggers to find reachable nodes
      const visited = new Set<string>();
      const stack: string[] = triggers.map(t => t.id);
      while (stack.length) {
        const id = stack.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        (outMap.get(id) || []).forEach(nid => { if (!visited.has(nid)) stack.push(nid); });
      }

      // Unreachable nodes (not from any trigger)
      const unreachable = nodesArr.filter(n => !visited.has(n.id));

      // Isolated nodes (no in and no out)
      const isolated = nodesArr.filter(n => (outMap.get(n.id)?.length || 0) === 0 && (inMap.get(n.id)?.length || 0) === 0);

      // Triggers with no outgoing (warn only)
      const emptyTriggers = triggers.filter(t => (outMap.get(t.id)?.length || 0) === 0);
      if (emptyTriggers.length > 0) {
        addToast(`${emptyTriggers.length} trigger(s) have no outgoing connections.`, 'info');
      }

      // Check fork nodes - they should have connections from each output port
      const forkNodes = nodesArr.filter(n => {
        const m = getNodeMapping(n.type);
        return m?.category === 'fork';
      });
      
      const incompleteForkNodes = [];
      for (const forkNode of forkNodes) {
        const forkConnections = conns.filter(c => c.from === forkNode.id);
        
        // Get expected output count for this fork type
        let expectedOutputs = 2;
        if (forkNode.type === 'Double') expectedOutputs = 2;
        else if (forkNode.type === 'Triple') expectedOutputs = 3;
        else if (forkNode.type === 'Quadra') expectedOutputs = 4;
        else if (forkNode.type === 'Custom') {
          // Check if node has config with outputCount
          expectedOutputs = (forkNode as any).config?.outputCount || 2;
        }
        
        // Check if we have connections from each required output port
        const outputPorts = new Set();
        forkConnections.forEach(conn => {
          if (conn.fromPoint && conn.fromPoint.startsWith('output_')) {
            outputPorts.add(conn.fromPoint);
          }
        });
        
        // For fork nodes, we need at least 2 connections total, ideally from different ports
        if (forkConnections.length < 2) {
          incompleteForkNodes.push(forkNode);
        }
      }
      
      if (incompleteForkNodes.length > 0) {
        const forkIds = incompleteForkNodes.map(n => n.id);
        setErrorNodeIds(forkIds);
        try { canvasRef.current?.setErrorNodes?.(forkIds); } catch {}
        addToast('Fork nodes must have at least 2 outgoing connections to create parallel branches.', 'error');
        try { canvasRef.current?.setExecutingNode(null); } catch {}
        return;
      }

      // Block execution if unreachable or isolated exist
      const errorIds = Array.from(new Set([...unreachable.map(n => n.id), ...isolated.map(n => n.id)]));
      if (errorIds.length > 0) {
        setErrorNodeIds(errorIds);
        try { canvasRef.current?.setErrorNodes?.(errorIds); } catch {}
        addToast('Some nodes are not connected to any Trigger. Connect the highlighted nodes.', 'error');
        try { canvasRef.current?.setExecutingNode(null); } catch {}
        return;
      }

      // Clear any previous errors
      setErrorNodeIds([]);

      if (!workflowData || workflowData.nodes.length === 0) {
        setExecutionError('No workflow nodes found. Please add some nodes to execute.');
        return;
      }

      // ── ChatInput interception ──────────────────────────────────────────────
      // If the workflow has a ChatInput node, don't run through immediately with
      // an empty message — open the Chat tab so the user can type their input.
      const hasChatInput = workflowData.nodes.some(
        (n: any) => (n.type || n.data?.type || '') === 'ChatInput'
      );
      if (hasChatInput) {
        setIsExecuting(false);
        setOutputTab('chat');
        // Add a welcome message only on the first open
        if (chatMessages.length === 0) {
          const now = new Date().toLocaleTimeString();
          setChatMessages([{
            id: `sys_${Date.now()}`,
            role: 'assistant',
            content: 'Workflow ready. Type a message below to start.',
            time: now,
          }]);
        }
        setTimeout(() => chatInputRef.current?.focus(), 100);
        return;
      }

      // Convert canvas nodes to workflow nodes using node mapping
      const workflowNodes = workflowData.nodes.map((canvasNode: any) => {
        // Ensure we have a valid type
        const nodeType = canvasNode.type || canvasNode.data?.type || 'Unknown';
        
        const nodeMapping = getNodeMapping(nodeType);
        
        if (!nodeMapping) {
          // Fallback to basic node structure
          return {
            id: canvasNode.id,
            type: nodeType, // Use the determined type
            category: 'action' as any,
            name: canvasNode.name || canvasNode.data?.name || nodeType,
            description: `Node: ${nodeType}`,
            position: { x: canvasNode.x || 0, y: canvasNode.y || 0 },
            config: canvasNode.config || canvasNode.data?.config || {},
            inputs: [],
            outputs: [],
            version: '1.0.0',
            enabled: true,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        
        return convertCanvasNodeToWorkflowNode(canvasNode, nodeMapping);
      });

      // Create workflow definition
      const now = new Date().toISOString();
      const wfId = currentWorkflowId || workflowId || `workflow_${Date.now()}`;
      const workflow: Workflow = {
        id: wfId,
        name: workflowName || 'Untitled Workflow',
        description: 'Workflow created in editor',
        nodes: workflowNodes,
        connections: workflowData.connections.map((conn: any) => ({
          id: conn.id,
          sourceNodeId: conn.from,
          sourcePortId: conn.fromPoint || 'output',
          targetNodeId: conn.to,
          targetPortId: conn.toPoint || 'input',
          condition: conn.condition,
          type: 'default' as any,
          enabled: true
        })),
        settings: {
          timeout: 300000,
          retryCount: 3,
          concurrency: 1,
          errorHandling: 'stop'
        },
        createdAt: now,
        updatedAt: now,
        version: '1.0.0'
      };

      // Check if this is a scheduled workflow BEFORE execution
      // Also ensure Schedule nodes have timezone set to user's local timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      workflow.nodes = workflow.nodes.map((n: any) => {
        const nodeType = n.type || n.sidebarType || '';
        // Check if this is a Schedule node (nodeType alias map now handles 'Scheduling' → 'Schedule')
        const isSchedule = nodeType === 'Schedule' || nodeType === 'ScheduleTriggerNode' || nodeType === 'ScheduleEvent' || nodeType === 'Scheduling' ||
          getNodeMapping(nodeType)?.nodeType === 'schedule_trigger';

        if (isSchedule && n.config) {
          // Always update timezone to user's local timezone (even if already set)
          // This ensures we use local timezone instead of UTC
          const oldTimezone = n.config.timezone;
          n.config.timezone = userTimezone;
          if (oldTimezone !== userTimezone) {
            console.log(`Updated Schedule node timezone from ${oldTimezone} to ${userTimezone}`);
          }
        }
        return n;
      });
      
      const hasScheduleNode = workflow.nodes.some((n: any) => {
        const nodeType = n.type || n.sidebarType || '';
        return getNodeMapping(nodeType)?.nodeType === 'schedule_trigger';
      });

      const hasWebhookNode = workflow.nodes.some((n: any) => {
        const nodeType = n.type || n.sidebarType || '';
        return getNodeMapping(nodeType)?.nodeType === 'http_webhook';
      });

      // Save the workflow first (required for backend execution)
      await workflowManager.saveWorkflow(workflow);
      // Use the workflow ID after saving (it might have been updated by the backend)
      const savedWorkflowId = workflow.id;
      setCurrentWorkflowId(savedWorkflowId);

      // If it has a Webhook trigger, enter persistent listening mode
      if (hasWebhookNode && savedWorkflowId) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('3000', '8000') : 'http://localhost:8000';
        const webhookUrl = `${baseUrl}/api/v1/workflows/${savedWorkflowId}/webhook`;
        const now = new Date().toLocaleTimeString();

        setExecutionOutput(prev => [
          ...prev,
          `[${now}] 🔗 Webhook URL: POST ${webhookUrl}`,
          `[${now}] 💡 curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"key":"value"}'`,
          `[${now}] 👂 Listening for incoming webhook requests... (click Execute again to stop)`,
        ]);

        // Enter listening state — keep isExecuting=true so Execute becomes a Stop button
        _webhookMode = true;
        webhookSinceMs.current = Date.now();
        webhookWorkflowId.current = savedWorkflowId;
        setIsWebhookListening(true);

        const { default: apiClient } = await import('@/lib/api/client');

        // Poll backend every 3 seconds for new webhook executions
        webhookPollRef.current = setInterval(async () => {
          try {
            const res = await apiClient.get(
              `/api/v1/workflows/${savedWorkflowId}/webhook/results`,
              { params: { since_ms: webhookSinceMs.current } }
            );
            const { results } = res.data as { results: any[] };
            if (results && results.length > 0) {
              // Update since_ms to latest received
              webhookSinceMs.current = Math.max(...results.map((r: any) => r.received_at_ms));
              results.forEach((r: any) => {
                const t = new Date(r.received_at_ms).toLocaleTimeString();
                const method = r.request?.method || 'POST';
                const body = r.request?.body ? JSON.stringify(r.request.body).slice(0, 120) : '{}';
                setExecutionOutput(prev => [
                  ...prev,
                  `[${t}] ⚡ Webhook hit! ${method} — body: ${body}`,
                  ...(r.node_logs || []).map((log: any) =>
                    `[${t}]   └─ ${log.nodeType || log.nodeId}: ${log.status}${log.error ? ` — ${log.error}` : ''}`
                  ),
                  `[${t}]   Execution ${r.execution_id?.slice(0, 8)} — ${r.execution_time_ms ?? '?'}ms`,
                ]);
              });
            }
          } catch {
            // Silently ignore poll errors
          }
        }, 3000);

        // Don't fall through to normal execution
        return;
      }

      // If it's a scheduled workflow, use backend API instead of local engine
      if (hasScheduleNode) {
        try {
          // Use authService to get token properly
          const { authService } = await import('@/lib/auth');
          
          // Check if user is authenticated first
          if (!authService.isAuthenticated()) {
            addToast('Authentication required. Please sign in.', 'error');
            setIsExecuting(false);
            return;
          }
          
          const token = await authService.getUserToken();
          if (!token) {
            addToast('Failed to get authentication token. Please sign in again.', 'error');
            setIsExecuting(false);
            return;
          }

          setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting scheduled workflow...`]);
          
          // Use apiClient instead of fetch for better error handling
          const apiClient = (await import('@/lib/api/client')).default;
          
          try {
            // Use the saved workflow ID (might be different from wfId if backend generated new ID)
            const executeWorkflowId = savedWorkflowId || wfId;
            const response = await apiClient.post(`/api/v1/workflows/${executeWorkflowId}/execute`, {
              input: { demoInput: 'Hello from workflow editor!' },
              config: {}
            });

            const result = response.data;
          
          if (result.status === 'scheduled') {
            const ts = new Date().toLocaleTimeString();
            const nextRunLines: string[] = [];
            if (result.summary?.next_run) {
              const nextRunDate = new Date(result.summary.next_run);
              nextRunLines.push(`[${ts}] Next run: ${nextRunDate.toLocaleString()} (your local time)`);
            }
            setExecutionOutput(prev => [
              ...prev,
              `[${ts}] 🕐 Scheduler started successfully!`,
              ...nextRunLines,
              `[${ts}] 🟥 Click "Stop Scheduler" in the toolbar above to stop the scheduler.`,
            ]);

            // Update scheduler status
            setSchedulerStatus({scheduled: true, status: 'running'});
            addToast('Scheduled workflow started successfully', 'info');
          } else {
            // Fallback to normal execution if scheduling failed
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Scheduling failed, executing once...`]);
            const execution = await workflowManager.executeWorkflow(workflow, { demoInput: 'Hello from workflow editor!' });
            setLastExecutionId(execution.id);
          }
          } catch (apiError: any) {
            // Handle API client errors
            console.error('Scheduled workflow API error:', apiError);
            console.error('Full error details:', {
              message: apiError.message,
              response: apiError.response,
              code: apiError.code,
              originalError: apiError.originalError
            });
            
            let errorMessage = 'Failed to start scheduled workflow';
            
            // Check for network/connection errors first
            if (apiError.code === 'ECONNREFUSED' || 
                apiError.message?.includes('Failed to fetch') || 
                apiError.message === 'Network error. Please check your connection.' ||
                apiError.error === 'NETWORK_ERROR') {
              errorMessage = 'Cannot connect to backend server. Please ensure the backend is running on ' + (process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000');
            } else if (apiError.response?.data?.detail) {
              errorMessage = apiError.response.data.detail;
            } else if (apiError.response?.data?.message) {
              errorMessage = apiError.response.data.message;
            } else if (apiError.message && apiError.message !== 'Network error. Please check your connection.') {
              errorMessage = apiError.message;
            }
            
            setExecutionError(errorMessage);
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${errorMessage}`]);
            addToast(errorMessage, 'error');
          }
        } catch (error) {
          console.error('Scheduled workflow execution error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to start scheduled workflow';
          setExecutionError(errorMessage);
          setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${errorMessage}`]);
          addToast(errorMessage, 'error');
        } finally {
          setIsExecuting(false);
          setActiveNodeId(null);
        }
        return; // Exit early for scheduled workflows
      }

      // Execute workflow using the backend API (LangGraph engine)
      console.log('Executing workflow with backend API:', workflow);

      // Wave flag must live outside the try so the catch block can stop it too
      const _wave = { running: true };

      try {
        // Add execution start message to output
        setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting workflow execution via backend...`]);

        // ── Canvas wave animation ─────────────────────────────────────────────
        // Cycles through every node (~500 ms each) so the canvas shows activity
        // while we await the backend. Replaced by the accurate per-node replay
        // once the response arrives.
        ;(async () => {
          let i = 0;
          while (_wave.running && workflow.nodes.length > 0) {
            const nodeId = workflow.nodes[i % workflow.nodes.length]?.id;
            setActiveNodeId(nodeId || null);
            try { canvasRef.current?.setExecutingNode(nodeId || null); } catch {}
            await new Promise(r => setTimeout(r, 500));
            i++;
          }
          setActiveNodeId(null);
          try { canvasRef.current?.setExecutingNode(null); } catch {}
        })();
        // ─────────────────────────────────────────────────────────────────────

        const execution = await workflowManager.executeWorkflow(
          workflow,
          { demoInput: 'Hello from workflow editor!' },
          {
            timeout: 30000,
            retryCount: 2,
            errorHandling: 'stop',
            onStepStart: (log) => {
              setActiveNodeId(log.nodeId || null);
              try { canvasRef.current?.setExecutingNode(log.nodeId || null); } catch {}
              // Add step start message to output
              if (log.nodeId) {
                const node = workflowNodes.find(n => n.id === log.nodeId);
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing node: ${node?.name || log.nodeId}`]);
              }
            },
            onStepComplete: (log) => {
              setActiveNodeId(null);
              try { canvasRef.current?.setExecutingNode(null); } catch {}
              // Add step complete message to output
              if (log?.nodeId) {
                const node = workflowNodes.find(n => n.id === log.nodeId);
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Completed node: ${node?.name || log.nodeId}`]);
              }
              
              // Track HTTP requests for Network tab (manual executions)
              if ((log as any)?.nodeType === 'HTTP Request' || (log as any)?.nodeType === 'HttpNode' || (log as any)?.nodeType === 'HTTP Request Action') {
                const output = log.output || {};
                if (output.status || output.url) {
                  const networkReq = {
                    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    timestamp: log.startTime ? new Date(log.startTime).toISOString() : new Date().toISOString(),
                    method: output.method || 'GET',
                    url: output.url || log.nodeName || 'Unknown URL',
                    status: output.status || 0,
                    statusText: output.statusText || 'Unknown',
                    duration: log.duration || log.metadata?.executionTime || 0,
                    headers: output.requestHeaders || {},
                    responseHeaders: output.headers || {},
                    requestBody: output.requestBody,
                    responseBody: output.data,
                    nodeId: log.nodeId,
                    nodeName: log.nodeName
                  };
                  setNetworkRequests(prev => [...prev.slice(-49), networkReq]); // Keep last 50
                }
              }
            },
            onStepFail: (log) => {
              setActiveNodeId(null);
              try { canvasRef.current?.setExecutingNode(null); } catch {}
              // Add error message to output
              setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${log?.error || 'Unknown error'}`]);
            }
          }
        );
        
        // Stop the wave and let its last step settle before the accurate replay
        _wave.running = false;
        await new Promise(r => setTimeout(r, 550));

        // Store node outputs so variable picker can show actual values
        if (execution.nodeLogs && execution.nodeLogs.length > 0) {
          const outputMap: Record<string, Record<string, any>> = {};
          for (const log of execution.nodeLogs) {
            const nid = log.nodeId || (log as any).node_id;
            if (nid && log.output) outputMap[nid] = log.output;
          }
          setLastNodeOutputs(outputMap);
        }

        // Replay node execution in order using actual backend timing
        if (execution.nodeLogs && execution.nodeLogs.length > 0) {
          for (const log of execution.nodeLogs) {
            const nodeId = log.nodeId || (log as any).node_id;
            const node = workflowNodes.find(n => n.id === nodeId);
            const nodeType = node?.type || log.nodeType || 'Unknown';
            const nodeName = node?.name || log.nodeName || nodeId;

            // Light up the node
            setActiveNodeId(nodeId || null);
            try { canvasRef.current?.setExecutingNode(nodeId || null); } catch {}
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ▶ ${nodeName}`]);

            // Hold the loader for the actual execution duration so the UX matches reality.
            // Min 300ms so every node is visibly highlighted; cap at 5s so long delays
            // don't force an equally long UI replay after the fact.
            const actualMs: number = (log as any).executionTimeMs ?? log.duration ?? 0;
            const displayMs = Math.min(Math.max(actualMs, 300), 5000);
            await new Promise(resolve => setTimeout(resolve, displayMs));

            // Mark done
            if (log.status === 'completed' || (log as any).status === 'success') {
              setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✅ ${nodeName} (${Math.round(actualMs)}ms)`]);
              // Show Logger node message in terminal
              if ((nodeType === 'Logger' || log.nodeType === 'Logger') && log.output?.message) {
                const level = (log.output.level || 'info').toUpperCase();
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 📝 [${level}] ${log.output.message}`]);
              }
              // Show IfCondition result
              if ((nodeType === 'IfCondition' || nodeType === 'Conditional') && log.output?.branch !== undefined) {
                const branch = log.output.branch;
                const emoji = branch === 'true' ? '✅' : '❌';
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔀 Branch: ${emoji} ${branch.toUpperCase()} (${log.output.left} ${log.output.operator} ${log.output.right})`]);
              }
              // Show DataFormatter result
              if ((nodeType === 'DataFormatter' || nodeType === 'String Manipulation') && log.output?.formatted !== undefined) {
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔧 Formatted: "${log.output.formatted}" (${log.output.operation})`]);
              }
              // Show Loop progress
              if (nodeType === 'Loop' && log.output?.total !== undefined) {
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔁 Loop: ${log.output.total} items`]);
              }
              // Show HttpRequest result
              if ((nodeType === 'HttpRequest' || nodeType === 'HTTP Request' || nodeType === 'HTTPRequest') && log.output?.status_code !== undefined) {
                const sc = log.output.status_code;
                const ok = log.output.ok ? '✅' : '⚠️';
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🌐 ${ok} HTTP ${sc} — ${String(log.output.response_text ?? '').slice(0, 80)}`]);
              }
              // Show ChatInput result
              if (nodeType === 'ChatInput' && log.output?.message !== undefined) {
                const msg = String(log.output.message).slice(0, 80);
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 💬 Chat: "${msg}"`]);
              }
              // Show Webhook trigger
              if (nodeType === 'Webhook' && log.output?.triggered_at !== undefined) {
                setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🔗 Webhook triggered (${log.output.method ?? 'POST'})`]);
              }
            } else if (log.status === 'failed') {
              setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${nodeName}: ${log.error || 'failed'}`]);
            }

            // HTTP network tab tracking (unchanged)
            if ((nodeType === 'HTTP Request' || nodeType === 'HttpNode' || nodeType === 'HTTP Request Action') && log.output) {
              const output = log.output;
              if (output.status || output.url) {
                const networkReq = {
                  id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  timestamp: (log as any).startedAt ?? new Date().toISOString(),
                  method: output.method || 'GET',
                  url: output.url || 'Unknown URL',
                  status: output.status || 0,
                  statusText: output.statusText || 'Unknown',
                  duration: actualMs,
                  headers: output.requestHeaders || {},
                  responseHeaders: output.headers || {},
                  requestBody: output.requestBody,
                  responseBody: output.data,
                  nodeId: nodeId,
                  nodeName: nodeName
                };
                setNetworkRequests(prev => [...prev.slice(-49), networkReq]);
              }
            }

            // Brief gap between nodes
            await new Promise(resolve => setTimeout(resolve, 150));
          }

          // All nodes done — clear the running indicator
          setActiveNodeId(null);
          try { canvasRef.current?.setExecutingNode(null); } catch {}
        }
        
        console.log('Workflow execution completed:', execution);
        
        // Add completion message to output
        if (execution.status === 'completed') {
          setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Workflow execution completed successfully.`]);
          // Snapshot the canvas state so any subsequent change will clear canPublish
          if (canvasRef.current) {
            lastSuccessSnapshotRef.current = JSON.stringify(canvasRef.current.getWorkflowData());
            setCanPublish(true);
          }
        } else {
          const errMsg = execution.error || 'Workflow failed — check node logs above for details.';
          setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Workflow execution failed: ${errMsg}`]);
        }
        
        // Set last execution id; remain on canvas (no navigation)
        setActiveNodeId(null);
        setLastExecutionId(execution.id);
        // Refresh execution history if already on Executions tab
        if (activeTab === 'executions') loadExecutionHistory();
      } catch (error) {
        _wave.running = false;
        console.error('Workflow execution error:', error);
        setExecutionError(error instanceof Error ? error.message : 'Unknown error occurred');
        // Add error message to output
        setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown error occurred'}`]);
        throw error; // Re-throw to be caught by the outer try/catch
      }
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      setExecutionError(error instanceof Error ? error.message : 'Unknown error occurred');
      // Add error message to output
      setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown error occurred'}`]);
    } finally {
      // Don't reset executing state if we entered webhook listening mode
      if (!_webhookMode) {
        setIsExecuting(false);
      }
    }
  };

  // ── Chat tab: insert variable pattern at textarea cursor ──────────────────
  const insertVariable = (pattern: string) => {
    if (!chatInputRef.current) {
      setChatInput(prev => prev + pattern);
      setShowVariablePicker(false);
      return;
    }
    const ta = chatInputRef.current;
    const start = ta.selectionStart ?? chatInput.length;
    const end = ta.selectionEnd ?? chatInput.length;
    const newVal = chatInput.slice(0, start) + pattern + chatInput.slice(end);
    setChatInput(newVal);
    setShowVariablePicker(false);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + pattern.length, start + pattern.length);
    }, 0);
  };

  // ── Chat tab: send message ────────────────────────────────────────────────
  const sendChatMessage = async () => {
    const userText = chatInput.trim();
    if (!userText || isExecuting || !canvasRef.current) return;

    const now = new Date().toLocaleTimeString();
    setChatMessages(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', content: userText, time: now }]);
    setChatInput('');
    setShowVariablePicker(false);
    setShowOutputTerminal(true);

    setIsExecuting(true);
    try {
      const workflowData = canvasRef.current.getWorkflowData();
      if (!workflowData || workflowData.nodes.length === 0) throw new Error('No nodes on canvas');

      const workflowNodes = workflowData.nodes.map((canvasNode: any) => {
        const nodeType = canvasNode.type || canvasNode.data?.type || 'Unknown';
        const nodeMapping = getNodeMapping(nodeType);
        const base = nodeMapping
          ? convertCanvasNodeToWorkflowNode(canvasNode, nodeMapping)
          : {
              id: canvasNode.id, type: nodeType, name: canvasNode.name || nodeType,
              config: canvasNode.config || {}, inputs: [], outputs: [], version: '1.0.0',
              enabled: true, tags: [], position: { x: canvasNode.x || 0, y: canvasNode.y || 0 },
              category: 'action' as any, description: '',
              createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
        if (nodeType === 'ChatInput') {
          return { ...base, config: { ...base.config, message: userText, session_id: chatSessionId.current } };
        }
        return base;
      });

      console.log('[Chat] Canvas nodes being sent:', workflowNodes.map(n => ({ id: n.id, type: n.type, config: n.config })));

      const wfId = currentWorkflowId || workflowId || `workflow_${Date.now()}`;
      const chatWorkflow: Workflow = {
        id: wfId,
        name: workflowName || 'Untitled Workflow',
        description: 'Workflow created in editor',
        nodes: workflowNodes,
        connections: workflowData.connections.map((conn: any) => ({
          id: conn.id,
          sourceNodeId: conn.from,
          sourcePortId: conn.fromPoint || 'output',
          targetNodeId: conn.to,
          targetPortId: conn.toPoint || 'input',
          condition: conn.condition,
          type: 'default' as any,
          enabled: true,
        })),
        settings: { timeout: 300000, retryCount: 3, concurrency: 1, errorHandling: 'stop' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await workflowManager.saveWorkflow(chatWorkflow);

      const execution = await workflowManager.executeWorkflow(
        chatWorkflow,
        { message: userText, session_id: chatSessionId.current },
        { timeout: 30000, errorHandling: 'stop' }
      );

      // Store node outputs for variable picker
      if (execution.nodeLogs?.length) {
        const outputMap: Record<string, Record<string, any>> = {};
        for (const log of execution.nodeLogs) {
          const nid = log.nodeId || (log as any).node_id;
          if (nid && log.output) outputMap[nid] = log.output;
        }
        setLastNodeOutputs(outputMap);
      }

      // Extract bot response: AI nodes first, then Logger nodes, then final output
      // Skip values with unresolved templates or resolver error markers
      const hasUnresolved = (s: string) => /\{\{\$/.test(s) || /\[missing:/.test(s);
      let botContent = '';
      for (const log of (execution.nodeLogs || [])) {
        if ((log.nodeType === 'ClaudeAI' || log.nodeType === 'OpenAI') && log.output?.response) {
          botContent = log.output.response;
          break;
        }
      }
      if (!botContent) {
        for (const log of (execution.nodeLogs || [])) {
          if (log.nodeType === 'Logger' && log.output?.message) {
            const msg = String(log.output.message);
            if (!hasUnresolved(msg)) {
              botContent += (botContent ? '\n' : '') + msg;
            }
          }
        }
      }
      // If Logger output had unresolved templates, fall back to ChatInput echo
      if (!botContent) {
        for (const log of (execution.nodeLogs || [])) {
          if (log.nodeType === 'ChatInput' && log.output?.message) {
            botContent = `[echo] ${log.output.message}`;
            break;
          }
        }
      }
      if (!botContent && execution.output) {
        const fo = execution.output;
        const foStr = typeof fo === 'string' ? fo : JSON.stringify(fo, null, 2);
        if (!hasUnresolved(foStr)) botContent = foStr;
      }

      const ts = new Date().toLocaleTimeString();
      setChatMessages(prev => [...prev, {
        id: `a_${Date.now()}`, role: 'assistant', content: botContent || '(no output)', time: ts,
      }]);
    } catch (err: any) {
      const ts = new Date().toLocaleTimeString();
      setChatMessages(prev => [...prev, {
        id: `a_${Date.now()}`, role: 'assistant',
        content: `Error: ${err.message || 'Execution failed'}`, time: ts,
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Loading Overlay */}
      {isLoadingWorkflow && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6900]"></div>
            <p className="text-white text-lg">Loading workflow...</p>
          </div>
        </div>
      )}
      
      {/* Left Sidebar - Nodes */}
      <div ref={sidebarElementRef}>
        <WorkflowSidebar 
          ref={sidebarRef}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          canvasNodeCount={canvasNodeCount}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <WorkflowToolbar
          showAssistant={showAssistant}
          onToggleAssistant={() => setShowAssistant(!showAssistant)}
          assistantMinimized={assistantMinimized}
          onExecute={schedulerStatus.scheduled && schedulerStatus.status === 'running' ? stopScheduler : executeWorkflow}
          isExecuting={isExecuting}
          isScheduled={schedulerStatus.scheduled && schedulerStatus.status === 'running'}
          isWebhookListening={isWebhookListening}
          onSave={saveCurrentWorkflow}
          onExport={handleExport}
          onImport={handleImport}
          onPublish={canPublish ? handlePublish : undefined}
          canPublish={canPublish}
          workflowName={workflowName}
          onRenameWorkflow={setWorkflowName}
        />
        
        {/* Canvas */}
        <div ref={canvasElementRef} className="flex-1 relative flex flex-col">
          {/* Tabs bar on top-left over canvas */}
          <div className="absolute top-3 left-4 z-30 bg-black/60 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden flex">
            <button
              className={`px-4 py-2 text-sm ${activeTab === 'nexa' ? 'bg-[#FF6900] text-white' : 'text-white/80 hover:bg-white/5'}`}
              onClick={() => setActiveTab('nexa')}
            >
              Nexa
            </button>
            <button
              className={`px-4 py-2 text-sm border-l border-zinc-800 ${activeTab === 'executions' ? 'bg-[#FF6900] text-white' : 'text-white/80 hover:bg-white/5'}`}
              onClick={() => {
                setActiveTab('executions');
                loadExecutionHistory();
              }}
            >
              Executions
            </button>
          </div>

          {/* Layout chooser button (top-right) — only on Nexa tab */}
          {activeTab === 'nexa' && (
            <div className="absolute top-3 right-4 z-30">
              <LayoutChooser onChoose={(layout) => canvasRef.current?.applyLayout(layout)} />
            </div>
          )}

          {/* Main canvas area */}
          <div className="flex-1 relative">
            {/* Canvas — hidden (not unmounted) when on Executions tab to preserve state */}
            <div className={activeTab === 'nexa' ? 'absolute inset-0' : 'absolute inset-0 pointer-events-none opacity-0'}>
              <WorkflowCanvas
                ref={canvasRef}
                selectedNode={selectedNode}
                onNodeSelect={setSelectedNode}
                onOpenTriggers={() => sidebarRef.current?.openTriggersWithBlink()}
                onNodeCountChange={setCanvasNodeCount}
                executingNodeId={activeNodeId}
                errorNodeIds={errorNodeIds}
                lastNodeOutputs={lastNodeOutputs}
              />
            </div>

            {/* Executions Analytics Panel */}
            {activeTab === 'executions' && (
              <div
                className="absolute inset-0 bg-zinc-950 overflow-y-auto p-6 space-y-6"
                style={{ paddingBottom: showOutputTerminal ? terminalHeight + 24 : 80 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF6900]/10 border border-[#FF6900]/20 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-[#FF6900]" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold">Execution History</h2>
                      <p className="text-zinc-500 text-xs">Analytics for <span className="text-zinc-300">{workflowName}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={loadExecutionHistory}
                    disabled={executionHistoryLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${executionHistoryLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* Summary stats */}
                {executionHistory.length > 0 && (() => {
                  const total = executionHistory.length;
                  const succeeded = executionHistory.filter(e => e.status === 'completed').length;
                  const failed = executionHistory.filter(e => e.status === 'failed').length;
                  const avgDur = executionHistory.reduce((s, e) => s + (e.duration || 0), 0) / total;
                  const totalTokens = executionHistory.reduce((s, e) => s + (e.metadata?.tokensUsed || 0), 0);
                  const fmtMs = (ms: number) => ms < 1000 ? `${Math.round(ms)}ms` : ms < 60000 ? `${(ms/1000).toFixed(1)}s` : `${(ms/60000).toFixed(1)}m`;
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Runs', value: String(total), icon: <Activity className="w-4 h-4 text-[#FF6900]" />, sub: 'all time' },
                        { label: 'Success Rate', value: `${Math.round((succeeded/total)*100)}%`, icon: <CheckCircle className="w-4 h-4 text-green-400" />, sub: `${succeeded} succeeded` },
                        { label: 'Avg Duration', value: fmtMs(avgDur), icon: <Timer className="w-4 h-4 text-blue-400" />, sub: `${failed} failed` },
                        { label: 'Total Tokens', value: totalTokens.toLocaleString(), icon: <Zap className="w-4 h-4 text-yellow-400" />, sub: 'tokens used' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-zinc-500 text-xs mb-1">{stat.label}</div>
                            <div className="text-white text-xl font-bold">{stat.value}</div>
                            <div className="text-zinc-600 text-xs mt-0.5">{stat.sub}</div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">{stat.icon}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Loading state */}
                {executionHistoryLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-[#FF6900]/30 border-t-[#FF6900] animate-spin" />
                      <p className="text-zinc-500 text-sm">Loading execution history...</p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!executionHistoryLoading && executionHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Activity className="w-7 h-7 text-zinc-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-400 font-medium">No executions yet</p>
                      <p className="text-zinc-600 text-sm mt-1">Run this workflow to see execution analytics here</p>
                    </div>
                  </div>
                )}

                {/* Execution list */}
                {!executionHistoryLoading && executionHistory.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Run History</h3>
                    {executionHistory.map((exec) => {
                      const isSelected = selectedExecutionId === exec.id;
                      const fmtMs = (ms?: number) => !ms && ms !== 0 ? 'N/A' : ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms/1000).toFixed(1)}s` : `${(ms/60000).toFixed(1)}m`;
                      const statusColor = exec.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/5'
                        : exec.status === 'failed' ? 'text-red-400 border-red-500/30 bg-red-500/5'
                        : exec.status === 'running' ? 'text-blue-400 border-blue-500/30 bg-blue-500/5'
                        : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5';
                      const StatusIcon = exec.status === 'completed' ? CheckCircle : exec.status === 'failed' ? XCircle : exec.status === 'running' ? Play : Clock;
                      return (
                        <div key={exec.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                          {/* Execution header row */}
                          <button
                            onClick={() => setSelectedExecutionId(isSelected ? null : exec.id)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors text-left"
                          >
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${statusColor}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span className="capitalize">{exec.status}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-mono">{exec.id.slice(0, 16)}…</div>
                              <div className="text-zinc-500 text-xs">{new Date(exec.startTime).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-400 shrink-0">
                              <div className="flex items-center gap-1"><Timer className="w-3 h-3" />{fmtMs(exec.duration)}</div>
                              <div className="flex items-center gap-1"><Zap className="w-3 h-3" />{exec.metadata?.tokensUsed || 0} tok</div>
                              <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${(exec.metadata?.cost || 0).toFixed(4)}</div>
                              <div className="text-zinc-500">{exec.nodeLogs.length} nodes</div>
                            </div>
                            {isSelected ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                          </button>

                          {/* Expanded node timeline */}
                          {isSelected && (
                            <div className="border-t border-zinc-800 p-4 space-y-2">
                              <h4 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">Node Timeline</h4>
                              {exec.nodeLogs.length === 0 && <p className="text-zinc-600 text-sm">No node logs recorded.</p>}
                              {exec.nodeLogs.map((log, idx) => {
                                const nodeKey = `${exec.id}_${log.nodeId}`;
                                const nodeExpanded = expandedNodeIds.has(nodeKey);
                                const nodeStatus = log.status === 'completed' || (log.status as string) === 'success'
                                  ? 'completed' : log.status === 'failed' || (log.status as string) === 'error' ? 'failed' : log.status;
                                const NodeIcon = nodeStatus === 'completed' ? CheckCircle : nodeStatus === 'failed' ? XCircle : nodeStatus === 'running' ? Play : Clock;
                                const nodeColor = nodeStatus === 'completed' ? 'text-green-400' : nodeStatus === 'failed' ? 'text-red-400' : nodeStatus === 'running' ? 'text-blue-400' : 'text-yellow-400';
                                return (
                                  <div key={`${log.nodeId}-${idx}`} className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                                    <button
                                      onClick={() => setExpandedNodeIds(prev => {
                                        const next = new Set(prev);
                                        next.has(nodeKey) ? next.delete(nodeKey) : next.add(nodeKey);
                                        return next;
                                      })}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
                                    >
                                      <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">#{idx+1}</span>
                                      <NodeIcon className={`w-3.5 h-3.5 shrink-0 ${nodeColor}`} />
                                      <span className="text-white text-sm font-medium flex-1 truncate">{log.nodeName}</span>
                                      <span className="text-zinc-600 text-xs border border-zinc-700 rounded px-1.5 py-0.5 shrink-0">{log.nodeType}</span>
                                      <span className="text-zinc-500 text-xs shrink-0">{fmtMs(log.duration)}</span>
                                      {log.output || log.error
                                        ? (nodeExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />)
                                        : <span className="w-3.5 h-3.5 shrink-0" />
                                      }
                                    </button>
                                    {nodeExpanded && (
                                      <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2">
                                        {log.error && (
                                          <div className="text-red-300 text-xs bg-red-950/40 border border-red-500/20 rounded p-2">{log.error}</div>
                                        )}
                                        {log.output && (
                                          <div>
                                            <div className="text-zinc-500 text-xs mb-1">Output</div>
                                            <pre className="bg-black/60 border border-zinc-800 rounded p-2 text-zinc-300 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                                              {JSON.stringify(log.output, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                        {log.input && (
                                          <div>
                                            <div className="text-zinc-500 text-xs mb-1">Input</div>
                                            <pre className="bg-black/60 border border-zinc-800 rounded p-2 text-zinc-300 text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-words">
                                              {JSON.stringify(log.input, null, 2)}
                                            </pre>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Execution error */}
                              {exec.error && (
                                <div className="mt-2 text-red-300 text-xs bg-red-950/40 border border-red-500/20 rounded-lg p-3">
                                  <span className="font-medium">Execution error:</span> {exec.error}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Output Terminal Button - fixed at bottom center */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
            <button
              onClick={() => setShowOutputTerminal(!showOutputTerminal)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-xl hover:bg-zinc-800/80 transition-all duration-200 text-white/90 hover:text-white shadow-lg"
            >
              <Terminal className="w-4 h-4" />
              <span className="text-sm font-medium">Output</span>
              {executionOutput.length > 0 && (
                <span className="bg-[#FF6900] text-white text-xs rounded-full px-2 py-0.5">
                  {executionOutput.length}
                </span>
              )}
            </button>
          </div>

          {/* Output Terminal Panel - slides up from bottom */}
          {showOutputTerminal && (
            <div 
              ref={terminalRef}
              className="absolute bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-700 transition-all duration-300 ease-in-out"
              style={{ maxHeight: `${terminalHeight}px` }}
            >
              <div 
                className="flex items-center justify-between p-3 border-b border-zinc-700 cursor-row-resize"
                onMouseDown={startDrag}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#FF6900]" />
                  {/* Tabs */}
                  <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => setOutputTab('output')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        outputTab === 'output' 
                          ? 'bg-[#FF6900] text-white' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Output
                    </button>
                    <button
                      onClick={() => setOutputTab('network')}
                      className={`px-3 py-1 text-xs rounded transition-colors relative ${
                        outputTab === 'network'
                          ? 'bg-[#FF6900] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Network
                      {networkRequests.length > 0 && (
                        <span className="ml-1.5 bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded-full">
                          {networkRequests.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setOutputTab('chat')}
                      className={`px-3 py-1 text-xs rounded transition-colors relative ${
                        outputTab === 'chat'
                          ? 'bg-[#FF6900] text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Chat
                      {chatMessages.filter(m => m.role === 'user').length > 0 && (
                        <span className="ml-1.5 bg-zinc-700 text-zinc-300 text-[10px] px-1.5 py-0.5 rounded-full">
                          {chatMessages.filter(m => m.role === 'user').length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Draggable handle indicator */}
                  <div className="flex flex-col items-center justify-center w-6 h-6 text-zinc-500 hover:text-zinc-300">
                    <div className="w-4 h-0.5 bg-current rounded mb-0.5"></div>
                    <div className="w-4 h-0.5 bg-current rounded"></div>
                  </div>
                  <button
                    onClick={() => {
                      if (outputTab === 'output') setExecutionOutput([]);
                      else if (outputTab === 'network') setNetworkRequests([]);
                      else setChatMessages([]);
                    }}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowOutputTerminal(false)}
                    className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto bg-zinc-900" style={{ height: `${terminalHeight - 48}px` }}>
                {outputTab === 'output' ? (
                  <div className="p-3 font-mono text-xs">
                    {executionOutput.length > 0 ? (
                      <div className="space-y-1">
                        {executionOutput.map((line, index) => (
                          <div key={index} className="text-zinc-300">
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-500 italic">
                        No output yet. Click "Execute" to run the workflow.
                      </div>
                    )}
                  </div>
                ) : outputTab === 'network' ? (
                  <div className="p-3">
                    {networkRequests.length > 0 ? (
                      <div className="space-y-2">
                        {networkRequests.map((req) => (
                          <div key={req.id} className="border border-zinc-700 rounded-lg p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  req.status >= 200 && req.status < 300 ? 'bg-green-500/20 text-green-400' :
                                  req.status >= 300 && req.status < 400 ? 'bg-yellow-500/20 text-yellow-400' :
                                  req.status >= 400 ? 'bg-red-500/20 text-red-400' :
                                  'bg-zinc-500/20 text-zinc-400'
                                }`}>
                                  {req.status || 'Pending'}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">{req.method}</span>
                                <span className="text-xs text-white font-mono truncate max-w-md">{req.url}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-400">
                                <span>{req.duration}ms</span>
                                <span>{new Date(req.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                            {req.nodeName && (
                              <div className="text-xs text-zinc-500 mb-2">
                                Node: {req.nodeName}
                              </div>
                            )}
                            <details className="text-xs">
                              <summary className="cursor-pointer text-zinc-400 hover:text-white mb-1">
                                Details
                              </summary>
                              <div className="mt-2 space-y-2 pl-4">
                                {Object.keys(req.headers).length > 0 && (
                                  <div>
                                    <div className="text-zinc-400 mb-1">Request Headers:</div>
                                    <pre className="bg-zinc-900 p-2 rounded text-zinc-300 overflow-x-auto">
                                      {JSON.stringify(req.headers, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {Object.keys(req.responseHeaders).length > 0 && (
                                  <div>
                                    <div className="text-zinc-400 mb-1">Response Headers:</div>
                                    <pre className="bg-zinc-900 p-2 rounded text-zinc-300 overflow-x-auto">
                                      {JSON.stringify(req.responseHeaders, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {req.requestBody && (
                                  <div>
                                    <div className="text-zinc-400 mb-1">Request Body:</div>
                                    <pre className="bg-zinc-900 p-2 rounded text-zinc-300 overflow-x-auto max-h-32">
                                      {typeof req.requestBody === 'string' ? req.requestBody : JSON.stringify(req.requestBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {req.responseBody && (
                                  <div>
                                    <div className="text-zinc-400 mb-1">Response Body:</div>
                                    <pre className="bg-zinc-900 p-2 rounded text-zinc-300 overflow-x-auto max-h-32">
                                      {typeof req.responseBody === 'string' ? req.responseBody : JSON.stringify(req.responseBody, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-500 italic text-center py-8">
                        No HTTP requests yet. HTTP Request nodes will appear here.
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Chat Tab ─────────────────────────────────────────── */
                  <div className="flex flex-col" style={{ height: `${terminalHeight - 48}px` }}>
                    {/* Message list */}
                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
                          <span className="text-2xl">💬</span>
                          <p className="text-zinc-400 text-sm">No messages yet.</p>
                          <p className="text-zinc-600 text-xs">
                            Add a ChatInput node to your workflow, then type below to chat.
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                                msg.role === 'user'
                                  ? 'bg-[#FF6900]/20 border border-[#FF6900]/30 text-white rounded-tr-sm'
                                  : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-tl-sm'
                              }`}>
                                {msg.role === 'assistant' && <span className="mr-1">🤖</span>}
                                {msg.content}
                              </div>
                              <span className="text-[10px] text-zinc-600">{msg.time}</span>
                            </div>
                          </div>
                        ))
                      )}
                      {isExecuting && outputTab === 'chat' && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-zinc-400 flex items-center gap-2">
                            <span>🤖</span>
                            <span className="animate-pulse">Thinking...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variable picker popover */}
                    {showVariablePicker && (
                      <div className="mx-3 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-xl">
                        <div className="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-zinc-700 uppercase tracking-wider">
                          Insert Variable
                        </div>
                        <div className="max-h-40 overflow-y-auto p-2 space-y-0.5">
                          {/* Node output variables from last run */}
                          {Object.entries(lastNodeOutputs).flatMap(([nodeId, outputs]) =>
                            Object.keys(outputs).map((key) => ({
                              pattern: `{{$node.${nodeId}.${key}}}`,
                              preview: String(outputs[key]).slice(0, 40),
                              label: `${nodeId} · ${key}`,
                            }))
                          ).map((item) => (
                            <button
                              key={item.pattern}
                              onClick={() => insertVariable(item.pattern)}
                              className="w-full text-left px-2 py-1 rounded hover:bg-zinc-700 transition-colors group"
                            >
                              <span className="text-[11px] text-[#FF6900] font-mono">{item.pattern}</span>
                              {item.preview && (
                                <span className="ml-2 text-[10px] text-zinc-500 group-hover:text-zinc-400 truncate">
                                  = &quot;{item.preview}&quot;
                                </span>
                              )}
                            </button>
                          ))}
                          {/* Quick patterns */}
                          <div className="pt-1 border-t border-zinc-700 mt-1">
                            <div className="text-[10px] text-zinc-600 px-2 pb-1">Quick patterns</div>
                            {[
                              '{{$trigger.input_data.message}}',
                              '{{$vars.varName}}',
                              '{{$trigger.input_data.session_id}}',
                            ].map((p) => (
                              <button
                                key={p}
                                onClick={() => insertVariable(p)}
                                className="w-full text-left px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
                              >
                                <span className="text-[11px] text-zinc-400 font-mono">{p}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input area */}
                    <div className="border-t border-zinc-700 p-2 flex items-end gap-2">
                      <button
                        onClick={() => setShowVariablePicker(!showVariablePicker)}
                        title="Insert variable"
                        className={`shrink-0 px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                          showVariablePicker
                            ? 'bg-[#FF6900]/20 text-[#FF6900] border border-[#FF6900]/40'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                        }`}
                      >
                        {'{ }'}
                      </button>
                      <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                        rows={2}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-[#FF6900]/50 transition-colors"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={isExecuting || !chatInput.trim()}
                        className="shrink-0 px-3 py-2 bg-[#FF6900] text-white rounded-lg text-sm font-medium hover:bg-[#FF6900]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>      </div>

      {/* Right Sidebar - AI Assistant */}
      {showAssistant && (
        <div ref={assistantElementRef}>
          <WorkflowAssistant 
            onClose={() => setShowAssistant(false)}
            isMinimized={assistantMinimized}
            onToggleMinimize={() => setAssistantMinimized(!assistantMinimized)}
            getCurrentCanvasState={() => canvasRef.current?.getWorkflowData() || null}
            onApplyWorkflowPatch={(patchObj) => {
              if (!canvasRef.current || !patchObj) return;

              // Snapshot current canvas so user can undo
              const snapshot = canvasRef.current.getWorkflowData();

              const rawNodes: any[] = patchObj.nodes || [];
              const rawConns: any[] = patchObj.connections || [];

              // Build a topological level map so nodes flow left → right
              const inDegree: Record<string, number> = {};
              const outEdges: Record<string, string[]> = {};
              rawNodes.forEach((n: any) => { inDegree[n.id] = 0; outEdges[n.id] = []; });
              rawConns.forEach((c: any) => {
                if (c.to in inDegree) inDegree[c.to]++;
                if (c.from in outEdges) outEdges[c.from].push(c.to);
              });

              // BFS level assignment
              const levels: Record<string, number> = {};
              const queue: string[] = rawNodes
                .filter((n: any) => inDegree[n.id] === 0)
                .map((n: any) => n.id);
              queue.forEach(id => { levels[id] = 0; });
              let qi = 0;
              while (qi < queue.length) {
                const cur = queue[qi++];
                (outEdges[cur] || []).forEach(next => {
                  levels[next] = Math.max(levels[next] ?? 0, (levels[cur] ?? 0) + 1);
                  if (!queue.includes(next)) queue.push(next);
                });
              }
              rawNodes.forEach((n: any) => { if (!(n.id in levels)) levels[n.id] = 0; });

              // Group by level for y-stacking
              const byLevel: Record<number, string[]> = {};
              rawNodes.forEach((n: any) => {
                const l = levels[n.id] ?? 0;
                if (!byLevel[l]) byLevel[l] = [];
                byLevel[l].push(n.id);
              });

              const H_GAP = 160;
              const V_GAP = 120;
              const START_X = 80;
              const START_Y = 80;
              const positions: Record<string, { x: number; y: number }> = {};
              Object.entries(byLevel).forEach(([lvl, ids]) => {
                const col = parseInt(lvl);
                ids.forEach((id, idx) => {
                  positions[id] = { x: START_X + col * H_GAP, y: START_Y + idx * V_GAP };
                });
              });

              // Remap chatbot IDs (n1, node1, etc.) → canvas format (node_<timestamp>)
              const idMap: Record<string, string> = {};
              rawNodes.forEach((n: any) => {
                idMap[n.id] = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              });

              // Rewrite any {{$node.oldId.field}} references inside config strings
              const remapConfig = (cfg: any): any => {
                if (typeof cfg === 'string') {
                  return cfg.replace(/\{\{\$node\.([^.}]+)\./g, (_: string, oldId: string) => {
                    const newId = idMap[oldId];
                    return newId ? `{{$node.${newId}.` : `{{$node.${oldId}.`;
                  });
                }
                if (Array.isArray(cfg)) return cfg.map(remapConfig);
                if (cfg && typeof cfg === 'object') {
                  const out: any = {};
                  for (const k of Object.keys(cfg)) out[k] = remapConfig(cfg[k]);
                  return out;
                }
                return cfg;
              };

              const nodes = rawNodes.map((n: any, i: number) => ({
                id: idMap[n.id] ?? n.id,
                type: n.type,
                name: n.name || n.type,
                x: positions[n.id]?.x ?? START_X + i * H_GAP,
                y: positions[n.id]?.y ?? START_Y,
                config: remapConfig(n.config || {}),
              }));

              const connections = rawConns.map((c: any, i: number) => ({
                id: c.id || `conn_${i}_${Date.now()}`,
                from: idMap[c.from] ?? c.from,
                to: idMap[c.to] ?? c.to,
                fromPoint: 'output',
                toPoint: 'input' as const,
                ...(c.condition != null && { condition: c.condition as 'true' | 'false' }),
              }));

              canvasRef.current.loadWorkflow({ nodes, connections });

              // Show keep/undo bar
              const label = `${rawNodes.length} node${rawNodes.length !== 1 ? 's' : ''} added by Assistant`;
              setPendingPatch({ snapshot, label });
            }}
          />
        </div>
      )}
      
      {/* Error Display */}
      {executionError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Execution Failed</h3>
                <button
                  onClick={() => setExecutionError(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                <h4 className="font-medium mb-2">Error Details:</h4>
                <p className="text-sm">{executionError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6900]/10 border border-[#FF6900]/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-[#FF6900]" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">Export Workflow</h2>
                <p className="text-zinc-400 text-xs">Download as JSON — can be re-imported later</p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Workflow name</span>
                <span className="text-white font-medium">{workflowName || 'Untitled Workflow'}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Format</span>
                <span className="text-white font-medium">NexAgent JSON v1</span>
              </div>
            </div>

            {/* Secret keys toggle */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Include secret keys</p>
                  <p className="text-zinc-400 text-xs mt-0.5">API keys, passwords, service account JSON</p>
                </div>
                <button
                  onClick={() => setExportIncludeSecrets(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${exportIncludeSecrets ? 'bg-[#FF6900]' : 'bg-zinc-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${exportIncludeSecrets ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {!exportIncludeSecrets && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-400/80">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Secret fields will be replaced with placeholders like <code className="bg-zinc-700 px-1 rounded">&lt;YOUR_API_KEY&gt;</code>. Fill them in after importing.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 h-9 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performExport(exportIncludeSecrets)}
                className="flex-1 h-9 rounded-xl bg-[#FF6900] hover:bg-[#E55D00] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish to Marketplace Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            {publishSuccess ? (
              /* Success state */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <h2 className="text-white font-semibold text-lg">Published Successfully!</h2>
                <p className="text-zinc-400 text-sm">Your workflow is now live in the NexAgent Marketplace.</p>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="w-full h-9 rounded-xl bg-[#FF6900] hover:bg-[#E55D00] text-white text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6900]/10 border border-[#FF6900]/20 flex items-center justify-center">
                    <Store className="w-5 h-5 text-[#FF6900]" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-base">Publish to Marketplace</h2>
                    <p className="text-zinc-400 text-xs">Secret keys are never included in published workflows</p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Workflow Name <span className="text-red-400">*</span></label>
                  <input
                    value={publishForm.name}
                    onChange={(e) => setPublishForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Email Outreach Automator"
                    className="w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Description <span className="text-red-400">*</span></label>
                  <textarea
                    value={publishForm.description}
                    onChange={(e) => setPublishForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe what this workflow does and how it helps..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900] resize-none"
                  />
                </div>

                {/* Category + Plan row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Category</label>
                    <select
                      value={publishForm.category}
                      onChange={(e) => setPublishForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-[#FF6900]"
                    >
                      {['Automation', 'AI & ML', 'Data Processing', 'Communication', 'E-commerce', 'Finance', 'Productivity', 'Other'].map(c => (
                        <option key={c} value={c} className="bg-zinc-900">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Pricing Plan</label>
                    <div className="flex gap-2">
                      {(['free', 'paid'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setPublishForm(f => ({ ...f, plan: p }))}
                          className={`flex-1 h-9 rounded-lg text-sm font-medium border transition-colors capitalize ${
                            publishForm.plan === p
                              ? 'bg-[#FF6900] border-[#FF6900] text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price field (only when paid) */}
                {publishForm.plan === 'paid' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Price (USD) <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0.99"
                        step="0.01"
                        value={publishForm.price}
                        onChange={(e) => setPublishForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="9.99"
                        className="w-full h-9 pl-7 pr-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6900]"
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="flex-1 h-9 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={performPublish}
                    disabled={isPublishing}
                    className="flex-1 h-9 rounded-xl bg-[#FF6900] hover:bg-[#E55D00] disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {isPublishing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Store className="w-4 h-4" />
                    )}
                    {isPublishing ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tour removed */}

      {/* Assistant keep/undo bar */}
      {pendingPatch && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl bg-zinc-900 border border-zinc-700 text-sm text-white">
          <span className="text-zinc-300">✦ {pendingPatch.label}</span>
          <button
            onClick={() => setPendingPatch(null)}
            className="px-3 py-1.5 rounded-lg bg-[#FF6900] hover:bg-[#FF6900]/80 text-white font-medium transition-colors"
          >
            Keep
          </button>
          <button
            onClick={() => {
              if (canvasRef.current && pendingPatch) {
                canvasRef.current.loadWorkflow(pendingPatch.snapshot);
              }
              setPendingPatch(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      {/* Toasts (top-right) */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-xl shadow-xl text-sm border ${t.type === 'error' ? 'bg-black/80 border-red-500/40 text-red-300' : 'bg-black/80 border-white/20 text-white/90'}`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Executions Modal */}
      <ExecutionModal
        executionId={lastExecutionId}
        open={executionModalOpen}
        onClose={() => { setExecutionModalOpen(false); setActiveTab('nexa'); }}
      />

      {/* Walkthrough */}
      {showWalkthrough && sidebarElementRef.current && canvasElementRef.current && assistantElementRef.current && (
        <WorkflowWalkthrough
          steps={[
            {
              id: 'sidebar',
              title: 'Node Library',
              description: 'Browse and drag workflow nodes from the sidebar. Start with a Trigger node to begin your automation workflow.',
              targetRef: sidebarElementRef,
            },
            {
              id: 'canvas',
              title: 'Workflow Canvas',
              description: 'Build your workflow by connecting nodes on the canvas. Drag nodes here and connect them to create your automation flow.',
              targetRef: canvasElementRef,
            },
            {
              id: 'assistant',
              title: 'AI Assistant',
              description: 'Get help from the AI assistant to design workflows, troubleshoot issues, and optimize your automation logic.',
              targetRef: assistantElementRef,
            },
          ]}
          onComplete={() => {
            setShowWalkthrough(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workflow-walkthrough-shown', 'true');
            }
          }}
          onSkip={() => {
            setShowWalkthrough(false);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workflow-walkthrough-shown', 'true');
            }
          }}
        />
      )}
    </div>
  );
}

function LayoutChooser({ onChoose }: { onChoose: (l: 'serpentine' | 'row' | 'column' | 'radial') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-black/60 text-white/90 hover:bg-white/5"
        title="Choose layout"
      >
        <span className="w-2 h-2 rounded-full bg-[#FF6900]" />
        Layout
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl p-3 grid grid-cols-2 gap-3 z-50">
          {[
            { key: 'serpentine', label: 'Serpentine' },
            { key: 'row', label: 'Left → Right' },
            { key: 'column', label: 'Top ↓ Down' },
            { key: 'radial', label: 'Radial' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onChoose(opt.key as any); setOpen(false); }}
              className="h-20 rounded-lg border border-white/10 hover:border-[#FF6900] hover:bg-white/5 text-white/80 text-xs flex flex-col items-center justify-center gap-2"
            >
              <div className="w-14 h-10 bg-white/5 rounded relative overflow-hidden">
                {/* Simple illustration blocks */}
                {opt.key === 'serpentine' && (
                  <div className="absolute inset-1 grid grid-cols-4 gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="bg-white/20 rounded-sm" />
                    ))}
                  </div>
                )}
                {opt.key === 'row' && (
                  <div className="absolute inset-1 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (<div key={i} className="flex-1 h-2 bg-white/20 rounded" />))}
                  </div>
                )}
                {opt.key === 'column' && (
                  <div className="absolute inset-1 flex flex-col justify-center gap-1">
                    {[...Array(5)].map((_, i) => (<div key={i} className="h-2 bg-white/20 rounded" />))}
                  </div>
                )}
                {opt.key === 'radial' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border border-white/30" />
                  </div>
                )}
              </div>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkflowEditor;
