"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidebar } from "./WorkflowSidebar";
import WorkflowCanvas, { WorkflowCanvasRef } from "./WorkflowCanvas";
import { WorkflowAssistant } from "./WorkflowAssistant";
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
  const sidebarRef = useRef<{ openTriggersWithBlink: () => void }>(null);
  const canvasRef = useRef<WorkflowCanvasRef>(null);

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
      const workflow: Workflow = {
        id: workflowId || `workflow_${Date.now()}`,
        name: 'Current Workflow',
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
      
      const execution = await workflowManager.executeWorkflow(
        workflow,
        { demoInput: 'Hello from workflow editor!' },
        {
          timeout: 30000,
          retryCount: 2,
          errorHandling: 'stop'
        }
      );

      console.log('Workflow execution completed:', execution);
      
      // Save the workflow
      await workflowManager.saveWorkflow(workflow);
      
      // Navigate to execution results page
      console.log('Navigating to execution page:', `/workflows/execution/${execution.id}`);
      router.push(`/workflows/execution/${execution.id}`);
      
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
          isExecuting={isExecuting}
        />
        
        {/* Canvas */}
        <div className="flex-1 relative" data-tour-id="workflow-canvas">
          <WorkflowCanvas
            ref={canvasRef}
            selectedNode={selectedNode}
            onNodeSelect={setSelectedNode}
            onOpenTriggers={() => sidebarRef.current?.openTriggersWithBlink()}
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
    </div>
  );
}

export default WorkflowEditor;