"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidebar } from "./WorkflowSidebar";
import WorkflowCanvas, { WorkflowCanvasRef } from "./WorkflowCanvas";
import { WorkflowAssistant } from "./WorkflowAssistant";
import ExecutionModal from "./ExecutionModal";
// Removed tour components
import { Workflow } from "@/lib/workflow/types";
import { workflowManager } from "@/lib/workflow/WorkflowManager";
import { getNodeMapping, convertCanvasNodeToWorkflowNode } from "@/lib/workflow/utils/NodeMapping";
import { Terminal, X } from "lucide-react";
interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps = { workflowId: undefined }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [activeTab, setActiveTab] = useState<'nexa' | 'executions'>('nexa');
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [errorNodeIds, setErrorNodeIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'info' | 'error' }[]>([]);
  const [showOutputTerminal, setShowOutputTerminal] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [terminalHeight, setTerminalHeight] = useState(256); // Default height: 256px
  const [isDragging, setIsDragging] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<{scheduled: boolean; status: string | null}>({scheduled: false, status: null});
  const [outputTab, setOutputTab] = useState<'output' | 'network'>('output');
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
            const execTime = new Date(lastExec.timestamp);
            const timeStr = execTime.toLocaleTimeString();
            
            // Add execution start message if not already shown
            const execStartMsg = `[${timeStr}] Scheduled execution started`;
            setExecutionOutput(prev => {
              // Check if we already logged this execution (use timestamp to avoid duplicates)
              const execTimestamp = execTime.toISOString();
              const alreadyLogged = prev.some(msg => msg.includes(execTimestamp.substring(0, 19)));
              if (!alreadyLogged && prev.length < 100) { // Limit to prevent memory issues
                return [...prev, execStartMsg];
              }
              return prev;
            });
            
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
                const nodeMsg = `[${timeStr}] ${log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳'} ${log.nodeName || log.nodeId}: ${log.status}`;
                setExecutionOutput(prev => {
                  const execTimestamp = execTime.toISOString().substring(0, 19);
                  if (!prev.some(msg => msg.includes(log.nodeId) && msg.includes(execTimestamp)) && prev.length < 100) {
                    return [...prev, nodeMsg];
                  }
                  return prev;
                });
                
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
                    setNetworkRequests(prev => [...prev.slice(-49), networkReq]); // Keep last 50
                  }
                }
              });
            }
            
            // Add completion or error message
            if (lastExec.status === 'completed') {
              const completeMsg = `[${timeStr}] ✅ Execution completed (${lastExec.execution_time_ms}ms)`;
              setExecutionOutput(prev => {
                const execTimestamp = execTime.toISOString().substring(0, 19);
                if (!prev.some(msg => msg.includes('Execution completed') && msg.includes(execTimestamp)) && prev.length < 100) {
                  return [...prev, completeMsg];
                }
                return prev;
              });
            } else if (lastExec.error) {
              const errorMsg = `[${timeStr}] ❌ Execution failed: ${lastExec.error}`;
              setExecutionOutput(prev => {
                const execTimestamp = execTime.toISOString().substring(0, 19);
                if (!prev.some(msg => msg.includes('Execution failed') && msg.includes(execTimestamp)) && prev.length < 100) {
                  return [...prev, errorMsg];
                }
                return prev;
              });
            }
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
        return nodeType === 'Schedule' || nodeType === 'ScheduleTriggerNode';
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
    if (!canvasRef.current) {
      setExecutionError('Canvas not ready');
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    setExecutionOutput([]); // Clear previous output
    setShowOutputTerminal(true); // Show terminal on execute

    try {
      // Get workflow data from canvas
      const workflowData = canvasRef.current.getWorkflowData();
      
      // Validate workflow before execution
      try {
        const { validateWorkflow, formatValidationErrors } = await import('@/lib/workflow/utils/validateWorkflow');
        const validationErrors = validateWorkflow(workflowData);
        
        if (validationErrors.length > 0) {
          const errorMessage = formatValidationErrors(validationErrors);
          setExecutionError(errorMessage);
          
          // Highlight error nodes
          const errorNodeIds = validationErrors.map(e => e.nodeId).filter(id => id && id !== 'workflow');
          setErrorNodeIds(errorNodeIds);
          try { canvasRef.current?.setErrorNodes?.(errorNodeIds); } catch {}
          
          addToast('Please fix configuration errors before executing', 'error');
          setIsExecuting(false);
          return;
        }
      } catch (validationError) {
        // If validation itself fails, show a user-friendly error
        const errorMsg = validationError instanceof Error 
          ? `Validation error: ${validationError.message}` 
          : 'Failed to validate workflow. Please check that all nodes are properly configured.';
        setExecutionError(errorMsg);
        addToast(errorMsg, 'error');
        setIsExecuting(false);
        return;
      }

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
        // Check if this is a Schedule node
        const isSchedule = nodeType === 'Schedule' || nodeType === 'ScheduleTriggerNode' ||
          (getNodeMapping(nodeType)?.engineType === 'ScheduleTriggerNode' || 
           getNodeMapping(nodeType)?.sidebarType === 'Schedule');
        
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
        // Direct type check
        if (nodeType === 'Schedule' || nodeType === 'ScheduleTriggerNode') {
          return true;
        }
        // Check via node mapping
        const mapping = getNodeMapping(nodeType);
        if (mapping && (mapping.engineType === 'ScheduleTriggerNode' || mapping.sidebarType === 'Schedule')) {
          return true;
        }
        return false;
      });

      // Save the workflow first (required for backend execution)
      await workflowManager.saveWorkflow(workflow);
      // Use the workflow ID after saving (it might have been updated by the backend)
      const savedWorkflowId = workflow.id;
      setCurrentWorkflowId(savedWorkflowId);

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
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Workflow scheduled successfully!`]);
            if (result.summary?.next_run) {
              // Convert to local timezone for display
              const nextRunDate = new Date(result.summary.next_run);
              setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Next run: ${nextRunDate.toLocaleString()} (your local time)`]);
            }
            
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
      
      try {
        // Add execution start message to output
        setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting workflow execution via backend...`]);
        
        // Pre-activate first node to ensure visible feedback immediately
        try { setActiveNodeId(workflow.nodes[0]?.id || null); } catch {}
        // Minimal delay to ensure UI update is visible
        await new Promise(resolve => setTimeout(resolve, 50));
        
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
              if (log?.nodeType === 'HTTP Request' || log?.nodeType === 'HttpNode' || log?.nodeType === 'HTTP Request Action') {
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
        
        // Process node logs from backend execution to update UI with simulated real-time feedback
        if (execution.nodeLogs && execution.nodeLogs.length > 0) {
          // Simple approach: Just iterate through nodes in order and simulate execution
          const workflowNodeIds = workflow.nodes.map(n => n.id);
          
          for (let i = 0; i < workflowNodeIds.length; i++) {
            const nodeId = workflowNodeIds[i];
            const node = workflowNodes.find(n => n.id === nodeId);
            const nodeType = node?.type || 'Unknown';
            const nodeName = node?.name || nodeId;
            
            // Update active node visualization
            setActiveNodeId(nodeId);
            try { canvasRef.current?.setExecutingNode(nodeId); } catch {}
            
            // Add step start message to output
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing node: ${nodeName}`]);
            
            // For delay nodes, simulate the delay
            if (nodeType === 'Delay' || nodeType === 'DelayNode') {
              // Simulate the actual 3-second delay
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              // Minimal delay for other nodes to make transitions visible but not slow
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Add step complete message to output
            setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Completed node: ${nodeName}`]);
            
            // For HTTP nodes, add mock network request data for demonstration
            if (nodeType === 'HTTP Request' || nodeType === 'HttpNode' || nodeType === 'HTTP Request Action') {
              const mockNetworkReq = {
                id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                timestamp: new Date().toISOString(),
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/posts',
                status: 200,
                statusText: 'OK',
                duration: Math.floor(Math.random() * 200) + 100, // 100-300ms
                headers: {},
                responseHeaders: {
                  'content-type': 'application/json; charset=utf-8',
                  'content-length': '1234'
                },
                requestBody: '',
                responseBody: '[{"id": 1, "title": "Sample post"}, ...]',
                nodeId: nodeId,
                nodeName: nodeName
              };
              setNetworkRequests(prev => [...prev.slice(-49), mockNetworkReq]);
            }
            
            // Minimal delay after completion to make transitions visible
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // Clear active node after execution
          setActiveNodeId(null);
          try { canvasRef.current?.setExecutingNode(null); } catch {}
        }
        
        console.log('Workflow execution completed:', execution);
        
        // Add completion message to output
        setExecutionOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Workflow execution completed successfully.`]);
        
        // Set last execution id; remain on canvas (no navigation)
        setActiveNodeId(null);
        setLastExecutionId(execution.id);
      } catch (error) {
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
      <WorkflowSidebar 
        ref={sidebarRef}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        canvasNodeCount={canvasNodeCount}
      />
      
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
          onSave={saveCurrentWorkflow}
          workflowName={workflowName}
          onRenameWorkflow={setWorkflowName}
        />
        
        {/* Canvas */}
        <div className="flex-1 relative flex flex-col">
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
                if (lastExecutionId) setExecutionModalOpen(true);
              }}
            >
              Executions
            </button>
          </div>

          {/* Layout chooser button (top-right) */}
          <div className="absolute top-3 right-4 z-30">
            <LayoutChooser onChoose={(layout) => canvasRef.current?.applyLayout(layout)} />
          </div>

          {/* Main canvas area */}
          <div className="flex-1 relative">
            <WorkflowCanvas
              ref={canvasRef}
              selectedNode={selectedNode}
              onNodeSelect={setSelectedNode}
              onOpenTriggers={() => sidebarRef.current?.openTriggersWithBlink()}
              onNodeCountChange={setCanvasNodeCount}
              executingNodeId={activeNodeId}
              errorNodeIds={errorNodeIds}
            />
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
                      if (outputTab === 'output') {
                        setExecutionOutput([]);
                      } else {
                        setNetworkRequests([]);
                      }
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
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>      </div>

      {/* Right Sidebar - AI Assistant */}
      {showAssistant && (
        <WorkflowAssistant 
          onClose={() => setShowAssistant(false)}
          isMinimized={assistantMinimized}
          onToggleMinimize={() => setAssistantMinimized(!assistantMinimized)}
        />
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

      {/* Tour removed */}
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
