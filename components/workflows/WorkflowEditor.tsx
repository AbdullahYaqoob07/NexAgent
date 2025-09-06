"use client";

import { useState, useRef } from "react";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowAssistant } from "./WorkflowAssistant";
import { useTour, TourStep } from "@/hooks/useTour";
import { TourSpotlight } from "@/components/tour/TourSpotlight";

export function WorkflowEditor() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const sidebarRef = useRef<{ openTriggersWithBlink: () => void }>(null);

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
        />
        
        {/* Canvas */}
        <div className="flex-1 relative" data-tour-id="workflow-canvas">
          <WorkflowCanvas
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
