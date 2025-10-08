"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidebar } from "./WorkflowSidebar";
import WorkflowCanvas, { WorkflowCanvasRef } from "./WorkflowCanvas";
import { WorkflowAssistant } from "./WorkflowAssistant";
import ExecutionModal from "./ExecutionModal";
import { useTour, TourStep } from "@/hooks/useTour";
import { TourSpotlight } from "@/components/tour/TourSpotlight";
import { Workflow } from "@/lib/workflow/types";
import { workflowManager } from "@/lib/workflow/WorkflowManager";
import { getNodeMapping, convertCanvasNodeToWorkflowNode } from "@/lib/workflow/utils/NodeMapping";

interface WorkflowEditorProps {
  workflowId?: string;
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps = { workflowId: undefined }) {
  const router = useRouter();
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
  const sidebarRef = useRef<{ openTriggersWithBlink: () => void }>(null);
  const canvasRef = useRef<WorkflowCanvasRef>(null);
  const [activeTab, setActiveTab] = useState<'nexa' | 'executions'>('nexa');
  const [executionModalOpen, setExecutionModalOpen] = useState(false);
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [errorNodeIds, setErrorNodeIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'info' | 'error' }[]>([]);
  const addToast = (message: string, type: 'info' | 'error' = 'error') => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Workflow editor tour steps (2-4)
  const tourSteps: TourStep[] = [
    {
      id: "workflow-sidebar",
      title: "Node Library",
      content: "This sidebar contains all the available nodes you can use to build your workflow. You'll find triggers, actions, and conditions organized by category. Drag nodes from here onto the canvas to get started.",
      target: "[data-tour-id='workflow-sidebar']",
      placement: "right",
      action: "none"
    },
    {
      id: "workflow-canvas",
      title: "Workflow Canvas",
      content: "This is your workflow canvas where you'll build your automation flow. Drop nodes here from the sidebar and connect them to create a sequence of actions. You can drag nodes around and connect them with lines to define the flow.",
      target: "[data-tour-id='workflow-canvas']",
      placement: "top",
      action: "none"
    },
    {
      id: "workflow-assistant",
      title: "AI Assistant",
      content: "Your AI assistant is here to help! Ask questions about building workflows, get suggestions for nodes to use, or request help with complex automation logic. The assistant can guide you through creating powerful workflows.",
      target: "[data-tour-id='workflow-assistant']",
      placement: "left",
      action: "none"
    }
  ];

  const {
    isActive: isTourActive,
    isVisible: isTourVisible,
    currentStepData,
    targetElement,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    skipTour,
    completeTour
  } = useTour(tourSteps, {
    onComplete: () => {
      console.log('Workflow editor tour completed!');
    },
    onSkip: () => {
      console.log('Workflow editor tour skipped!');
    },
    localStorageKey: 'nexagent-workflow-editor-tour'
  });

  // Save current workflow without executing
  const saveCurrentWorkflow = async () => {
    try {
      if (!canvasRef.current) {
        addToast('Canvas not ready', 'error');
        return;
      }
      const workflowData = canvasRef.current.getWorkflowData();
      if (!workflowData) {
        addToast('Nothing to save yet', 'info');
        return;
      }

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

      await workflowManager.saveWorkflow(workflow);
      setCurrentWorkflowId(wfId);
      addToast('Workflow saved', 'info');
    } catch (e) {
      console.error('Failed to save workflow:', e);
      addToast('Failed to save workflow', 'error');
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

    try {
      // Get workflow data from canvas
      const workflowData = canvasRef.current.getWorkflowData();

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

      // Execute workflow using the engine directly
      console.log('Executing workflow with engine:', workflow);
      
      // Pre-activate first node to ensure visible feedback immediately
      try { setActiveNodeId(workflow.nodes[0]?.id || null); } catch {}
      
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
          },
          onStepComplete: () => {
            setActiveNodeId(null);
            try { canvasRef.current?.setExecutingNode(null); } catch {}
          },
          onStepFail: () => {
            setActiveNodeId(null);
            try { canvasRef.current?.setExecutingNode(null); } catch {}
          }
        }
      );

      console.log('Workflow execution completed:', execution);
      
      // Save the workflow
      await workflowManager.saveWorkflow(workflow);
      setCurrentWorkflowId(wfId);
      
      // Set last execution id; remain on canvas (no navigation)
      setActiveNodeId(null);
      setLastExecutionId(execution.id);
      
    } catch (error) {
      console.error('Workflow execution error:', error);
      setExecutionError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Left Sidebar - Nodes */}
      <div data-tour-id="workflow-sidebar">
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
          onExecute={executeWorkflow}
          onSave={saveCurrentWorkflow}
          isExecuting={isExecuting}
          workflowName={workflowName}
          onRenameWorkflow={setWorkflowName}
        />
        
        {/* Canvas */}
        <div className="flex-1 relative" data-tour-id="workflow-canvas">
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

          {/* Main canvas always visible */}
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
      </div>

      {/* Right Sidebar - AI Assistant */}
      {showAssistant && (
        <div data-tour-id="workflow-assistant">
          <WorkflowAssistant 
            onClose={() => setShowAssistant(false)}
            isMinimized={assistantMinimized}
            onToggleMinimize={() => setAssistantMinimized(!assistantMinimized)}
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

      {/* Tour Spotlight */}
      {isTourVisible && targetElement && currentStepData && (
        <TourSpotlight
          isVisible={isTourVisible}
          targetElement={targetElement}
          step={currentStepData}
          currentStep={currentStep}
          totalSteps={totalSteps}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onNext={nextStep}
          onPrevious={prevStep}
          onSkip={skipTour}
          onComplete={completeTour}
        />
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
