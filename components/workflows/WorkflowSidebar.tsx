"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight,
  Search,
  Database,
  Globe,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Zap,
  Filter,
  GitBranch,
  Code,
  Bot,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NodeCategory {
  name: string;
  icon: React.ReactNode;
  nodes: Array<{
    name: string;
    description: string;
    icon: React.ReactNode;
  }>;
}

const nodeCategories: NodeCategory[] = [
  {
    name: "Triggers",
    icon: <Zap className="w-4 h-4" />,
    nodes: [
      { name: "HTTP Request", description: "Trigger workflow via HTTP", icon: <Globe className="w-4 h-4" /> },
      { name: "Schedule", description: "Time-based triggers", icon: <Calendar className="w-4 h-4" /> },
      { name: "Webhook", description: "Receive webhook data", icon: <GitBranch className="w-4 h-4" /> },
      { name: "File Watch", description: "Monitor file changes", icon: <FileText className="w-4 h-4" /> },
    ]
  },
  {
    name: "Actions",
    icon: <Settings className="w-4 h-4" />,
    nodes: [
      { name: "HTTP Request", description: "Make API calls", icon: <Globe className="w-4 h-4" /> },
      { name: "Database", description: "Query databases", icon: <Database className="w-4 h-4" /> },
      { name: "Email", description: "Send emails", icon: <Mail className="w-4 h-4" /> },
      { name: "Slack", description: "Send messages", icon: <MessageSquare className="w-4 h-4" /> },
    ]
  },
  {
    name: "Logic",
    icon: <GitBranch className="w-4 h-4" />,
    nodes: [
      { name: "If", description: "Conditional logic", icon: <GitBranch className="w-4 h-4" /> },
      { name: "Switch", description: "Multiple conditions", icon: <Filter className="w-4 h-4" /> },
      { name: "Loop", description: "Iterate data", icon: <Code className="w-4 h-4" /> },
      { name: "Merge", description: "Combine data", icon: <Users className="w-4 h-4" /> },
    ]
  },
  {
    name: "AI/ML",
    icon: <Bot className="w-4 h-4" />,
    nodes: [
      { name: "OpenAI", description: "AI completions", icon: <Bot className="w-4 h-4" /> },
      { name: "Text Analysis", description: "Analyze text", icon: <FileText className="w-4 h-4" /> },
      { name: "Image Processing", description: "Process images", icon: <Zap className="w-4 h-4" /> },
      { name: "Data Transform", description: "Transform data", icon: <Code className="w-4 h-4" /> },
    ]
  }
];

interface WorkflowSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface WorkflowSidebarHandle {
  openTriggersWithBlink: () => void;
}

const WorkflowSidebar = forwardRef<WorkflowSidebarHandle, WorkflowSidebarProps>(function WorkflowSidebar({ collapsed, onToggleCollapse }, ref) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Triggers"]);
  const [isBlinking, setIsBlinking] = useState(false);

  // Add CSS animation keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blinkBorder {
        0%, 100% { 
          border-color: #27272a; 
          box-shadow: none;
        }
        50% { 
          border-color: #FF6900; 
          box-shadow: 0 0 8px rgba(255, 105, 0, 0.5);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Expose function to parent via ref
  useImperativeHandle(ref, () => ({
    openTriggersWithBlink: () => {
      // Open Triggers if not already open
      if (!expandedCategories.includes("Triggers")) {
        setExpandedCategories(["Triggers"]);
      }
      
      // Start blinking animation for 3-4 blinks
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 2000); // Stop after 2 seconds (3-4 blinks at 0.5s each)
    }
  }));

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName)
        ? [] // Close if already open
        : [categoryName] // Open only this category, close others
    );
  };

  const handleNodeDragStart = (event: React.DragEvent, nodeName: string) => {
    console.log('Starting drag for:', nodeName);
    
    event.dataTransfer.setData("application/reactflow", nodeName);
    event.dataTransfer.setData("text/plain", nodeName);
    event.dataTransfer.effectAllowed = "move";
    
    // Add visual feedback safely
    const target = event.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = '0.5';
      setTimeout(() => {
        if (target) {
          target.style.opacity = '1';
        }
      }, 100);
    }
  };

  return (
    <div className={`bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ${
      collapsed ? "w-12" : "w-60"
    }`}>
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        {!collapsed && (
          <span className="text-sm font-medium text-white">Nodes</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 h-8 w-8"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {!collapsed && (
        <>
          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-zinc-900 border-zinc-700 text-white placeholder-zinc-400 h-8 text-xs"
              />
            </div>
          </div>

          {/* Node Categories */}
          <div className="flex-1 overflow-y-auto">
            {nodeCategories.map((category) => (
              <div 
                key={category.name} 
                className={`border-b border-zinc-800 ${
                  category.name === "Triggers" && isBlinking ? "border-2 border-[#FF6900] rounded-lg animate-blink-border" : ""
                }`}
                style={{
                  animation: category.name === "Triggers" && isBlinking ? "blinkBorder 0.5s ease-in-out 4" : "none"
                }}
              >
                <button
                  onClick={() => toggleCategory(category.name)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-white">
                    {category.icon}
                    <span className="truncate">{category.name}</span>
                  </div>
                  <ChevronRight 
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      expandedCategories.includes(category.name) ? "rotate-90" : ""
                    }`} 
                  />
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ease-out ${
                  expandedCategories.includes(category.name) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="pb-2 pt-1">
                    {category.nodes
                      .filter(node => 
                        searchTerm === "" || 
                        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        node.description.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((node, index) => (
                        <div
                          key={node.name}
                          draggable
                          onDragStart={(e) => handleNodeDragStart(e, node.name)}
                          className="mx-3 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 cursor-move hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 mb-2 group"
                          style={{
                            transitionDelay: expandedCategories.includes(category.name) ? `${index * 50}ms` : '0ms'
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {node.icon}
                            <span className="text-xs font-medium text-white truncate">{node.name}</span>
                          </div>
                          <p className="text-xs text-zinc-500 leading-tight">{node.description}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

export default WorkflowSidebar;
export { WorkflowSidebar };
