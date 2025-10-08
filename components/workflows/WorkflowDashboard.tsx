"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Edit, 
  Trash2, 
  Copy, 
  Calendar,
  Clock,
  Activity,
  Folder,
  Grid3x3,
  List,
  SortAsc,
  SortDesc
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useTour, TourStep } from "@/hooks/useTour";
import { TourSpotlight } from "@/components/tour/TourSpotlight";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  lastRun: string | null;
  created: string;
  nodes: number;
  executions: number;
  category: string;
}

// Mock data for demonstration
const mockWorkflows: Workflow[] = [
  {
    id: "wf-001",
    name: "Customer Onboarding",
    description: "Automated welcome sequence for new customers",
    status: "active",
    lastRun: "2025-01-05T14:30:00Z",
    created: "2025-01-01T10:00:00Z",
    nodes: 8,
    executions: 1247,
    category: "Customer"
  },
  {
    id: "wf-002", 
    name: "Lead Qualification",
    description: "Score and route leads based on engagement",
    status: "active",
    lastRun: "2025-01-05T16:15:00Z", 
    created: "2024-12-15T09:30:00Z",
    nodes: 12,
    executions: 892,
    category: "Sales"
  },
  {
    id: "wf-003",
    name: "Invoice Processing",
    description: "Automatic invoice generation and sending",
    status: "paused",
    lastRun: "2025-01-04T11:20:00Z",
    created: "2024-11-20T14:15:00Z", 
    nodes: 6,
    executions: 543,
    category: "Finance"
  },
  {
    id: "wf-004",
    name: "Social Media Monitoring", 
    description: "Track mentions and respond to comments",
    status: "draft",
    lastRun: null,
    created: "2025-01-05T08:45:00Z",
    nodes: 4,
    executions: 0,
    category: "Marketing"
  }
];

export function WorkflowDashboard() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "created" | "executions">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const categories = ["all", ...Array.from(new Set(workflows.map(w => w.category)))];

  const filteredWorkflows = workflows
    .filter(workflow => {
      const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || workflow.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created":
          aValue = new Date(a.created).getTime();
          bValue = new Date(b.created).getTime();
          break;
        case "executions":
          aValue = a.executions;
          bValue = b.executions;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getStatusColor = (status: Workflow["status"]) => {
    switch (status) {
      case "active": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "paused": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "draft": return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatLastRun = (dateString: string | null) => {
    if (!dateString) return "Never";
    const now = new Date();
    const runDate = new Date(dateString);
    const diffMs = now.getTime() - runDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateString);
  };

  const handleCreateWorkflow = () => {
    // If tour is active, complete dashboard tour and prepare for editor tour
    if (isTourActive) {
      completeTour();
      // Clear the editor tour localStorage so it shows on next page
      try {
        localStorage.removeItem('nexagent-workflow-editor-tour');
      } catch {}
    }
    router.push("/workflows/new");
  };

  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/workflows/${workflowId}`);
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const handleDuplicateWorkflow = (workflow: Workflow) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      status: "draft",
      lastRun: null,
      created: new Date().toISOString(),
      executions: 0
    };
    setWorkflows(prev => [...prev, newWorkflow]);
  };

  // Tour configuration - only dashboard step
  const tourSteps: TourStep[] = [
    {
      id: "new-workflow-button",
      title: "Create Your First Workflow",
      content: "Welcome to NexAgent! This is where you'll create and manage your automated workflows. Click the 'New Workflow' button to get started building your first automation.",
      target: "[data-tour-id='new-workflow-button']",
      placement: "bottom",
      action: "click",
      allowClickThrough: true
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
      console.log('Dashboard tour completed!');
    },
    onSkip: () => {
      console.log('Dashboard tour skipped!');
    },
    localStorageKey: 'nexagent-combined-tour'
  });

  return (
    <DashboardLayout>
      <div className="p-8 lg:p-12 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">Workflows</h1>
            <p className="text-white/70 text-xl">Create and manage your automated workflows</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreateWorkflow}
              size="lg"
              className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-8 gap-3"
              data-tour-id="new-workflow-button"
            >
              <Plus className="w-5 h-5" />
              New Workflow
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              placeholder="Search workflows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/50 h-10 focus:border-[#FF6900]"
            />
          </div>
            
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/5 border border-white/20 text-white rounded-md px-3 py-2 h-10 focus:border-[#FF6900]"
          >
            {categories.map(category => (
              <option key={category} value={category} className="bg-black">
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as "name" | "created" | "executions");
              setSortOrder(order as "asc" | "desc");
            }}
            className="bg-white/5 border border-white/20 text-white rounded-md px-3 py-2 h-10 focus:border-[#FF6900]"
          >
            <option value="created-desc" className="bg-black">Newest First</option>
            <option value="created-asc" className="bg-black">Oldest First</option>
            <option value="name-asc" className="bg-black">Name A-Z</option>
            <option value="name-desc" className="bg-black">Name Z-A</option>
            <option value="executions-desc" className="bg-black">Most Executions</option>
            <option value="executions-asc" className="bg-black">Least Executions</option>
          </select>

          <div className="flex rounded-md border border-white/20 bg-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No workflows found</h3>
            <p className="text-white/70 mb-8">
              {searchTerm || selectedCategory !== "all" 
                ? "Try adjusting your search or filters"
                : "Get started by creating your first workflow"
              }
            </p>
            {!searchTerm && selectedCategory === "all" && (
            <Button
              onClick={handleCreateWorkflow}
              className="bg-[#FF6900] hover:bg-[#E55D00] text-white px-6 gap-2"
              data-tour-id="new-workflow-button"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === "grid" ? 
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
            "space-y-4"
          }>
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-colors backdrop-blur-xl ${
                  viewMode === "list" ? "p-6" : "p-4"
                }`}
              >
                {viewMode === "grid" ? (
                  // Grid Card View
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{workflow.name}</h3>
                        <p className="text-sm text-white/70 line-clamp-2">{workflow.description}</p>
                      </div>
                      <div className="relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/50 hover:text-white p-1 h-8 w-8"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        <div className="absolute right-0 top-8 hidden group-hover:block bg-black/60 backdrop-blur-xl border border-white/20 rounded-md py-1 z-10 min-w-[140px]">
                          <button
                            onClick={() => handleEditWorkflow(workflow.id)}
                            className="w-full px-3 py-1 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateWorkflow(workflow)}
                            className="w-full px-3 py-1 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Copy className="w-3 h-3" /> Duplicate
                          </button>
                          <button
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                            className="w-full px-3 py-1 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                      <span className="text-xs text-white/50">{workflow.category}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                      <span>{workflow.nodes} nodes</span>
                      <span>{workflow.executions} runs</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        Last run: {formatLastRun(workflow.lastRun)}
                      </span>
                      <Button
                        onClick={() => handleEditWorkflow(workflow.id)}
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white h-8 px-3"
                      >
                        Open
                      </Button>
                    </div>
                  </>
                ) : (
                  // List View
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1">{workflow.name}</h3>
                        <p className="text-sm text-white/70">{workflow.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-white/50">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(workflow.status)}`}>
                          {workflow.status}
                        </span>
                        <span>{workflow.category}</span>
                        <span>{workflow.nodes} nodes</span>
                        <span>{workflow.executions} runs</span>
                        <span>{formatLastRun(workflow.lastRun)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEditWorkflow(workflow.id)}
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white h-8 px-3"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/50 hover:text-white p-1 h-8 w-8"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
    </DashboardLayout>
  );
}
