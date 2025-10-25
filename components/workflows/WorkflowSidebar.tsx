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
  Settings,
  ShoppingCart,
  Instagram,
  Facebook,
  Phone,
  GitFork,
  Copy,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrandLogo } from "@/lib/workflow/utils/BrandLogoMapping";
import { NodeDefinition } from "@/lib/schemas/node";

interface NodeCategory {
  name: string;
  icon: React.ReactNode;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    isStartNode: boolean;
  }>;
}

// Category mapping from Firebase categories to sidebar display
const CATEGORY_MAPPING = {
  "Triggers": { icon: <Zap className="w-4 h-4" />, order: 0 },
  "Actions": { icon: <Settings className="w-4 h-4" />, order: 1 },
  "Logic": { icon: <GitBranch className="w-4 h-4" />, order: 2 },
  "Data": { icon: <Database className="w-4 h-4" />, order: 3 },
  "AI/ML": { icon: <Bot className="w-4 h-4" />, order: 4 },
  "Ecommerce": { icon: <ShoppingCart className="w-4 h-4" />, order: 5 },
  "Fork": { icon: <GitFork className="w-4 h-4" />, order: 6 }
} as const;

// Convert Firebase node definitions to sidebar categories
const getNodeCategories = (nodeDefinitions: NodeDefinition[]): NodeCategory[] => {
  console.log('🔄 Converting node definitions to categories. Input:', nodeDefinitions.length, 'nodes');
  
  // Group nodes by category
  const categoryMap = new Map<string, Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    isStartNode: boolean;
  }>>();

  nodeDefinitions.forEach(node => {
    if (!node.isActive) return; // Skip inactive nodes
    
    const category = node.category;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    
    categoryMap.get(category)!.push({
      id: node.id,
      name: node.name,
      type: node.type,
      description: node.description,
      icon: getBrandLogoComponent(node.type), // Use node type for brand logo
      category: node.category,
      isStartNode: node.isStartNode || false
    });
  });

  // Convert to CategoryNode format with proper icons and ordering
  const categories: NodeCategory[] = [];
  
  categoryMap.forEach((nodes, categoryName) => {
    const categoryConfig = CATEGORY_MAPPING[categoryName as keyof typeof CATEGORY_MAPPING] || 
      { icon: <Settings className="w-4 h-4" />, order: 999 };
    
    categories.push({
      name: categoryName,
      icon: categoryConfig.icon,
      nodes: nodes.sort((a, b) => a.name.localeCompare(b.name)) // Sort nodes alphabetically
    });
  });

  // Sort categories by defined order
  return categories.sort((a, b) => {
    const aOrder = CATEGORY_MAPPING[a.name as keyof typeof CATEGORY_MAPPING]?.order ?? 999;
    const bOrder = CATEGORY_MAPPING[b.name as keyof typeof CATEGORY_MAPPING]?.order ?? 999;
    return aOrder - bOrder;
  });
};

// Get brand logo component for node preview
const getBrandLogoComponent = (nodeName: string) => {
  const LogoComponent = getBrandLogo(nodeName);
  
  // Special handling for CustomForkLogo in sidebar preview
  if (nodeName === 'Custom') {
    const CustomComponent = LogoComponent as any;
    return <CustomComponent size={40} outputCount={5} />;
  }
  
  return <LogoComponent size={40} />;
};

interface WorkflowSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  canvasNodeCount?: number;
}

interface WorkflowSidebarHandle {
  openTriggersWithBlink: () => void;
}

const WorkflowSidebar = forwardRef<WorkflowSidebarHandle, WorkflowSidebarProps>(function WorkflowSidebar({ collapsed, onToggleCollapse, canvasNodeCount = 0 }, ref) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Triggers"]);
  const [isBlinking, setIsBlinking] = useState(false);
  const [nodeDefinitions, setNodeDefinitions] = useState<NodeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch node definitions from Firebase
  useEffect(() => {
    const fetchNodeDefinitions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/nodes');
        if (!response.ok) {
          throw new Error(`Failed to fetch nodes: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 Sidebar received data:', data);
        console.log('🔍 Extracting nodes:', data.nodes || data.data || []);
        setNodeDefinitions(data.nodes || data.data || []);
      } catch (err) {
        console.error('Error fetching node definitions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load nodes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNodeDefinitions();
  }, []);

  // Generate node categories from fetched data
  const nodeCategories = getNodeCategories(nodeDefinitions);

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
      
      .accordion-content-enter {
        animation: accordionSlideIn 0.3s ease-out forwards;
      }
      
      .accordion-content-exit {
        animation: accordionSlideOut 0.3s ease-in forwards;
      }
      
      @keyframes accordionSlideIn {
        from {
          max-height: 0;
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          max-height: 500px;
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes accordionSlideOut {
        from {
          max-height: 500px;
          opacity: 1;
          transform: translateY(0);
        }
        to {
          max-height: 0;
          opacity: 0;
          transform: translateY(-10px);
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

  // Check if a node should be disabled based on canvas state
  const isNodeDisabled = (node: { isStartNode: boolean }) => {
    if (canvasNodeCount > 0) return false; // Allow all nodes if canvas has nodes
    
    // If canvas is empty, only allow trigger/start nodes
    return !node.isStartNode;
  };

  const handleNodeDragStart = (event: React.DragEvent, node: { id: string; name: string; type: string; category: string; isStartNode: boolean }) => {
    // Prevent drag if node is disabled
    if (isNodeDisabled(node)) {
      event.preventDefault();
      return;
    }
    
    console.log('Starting drag for:', node.name, 'type:', node.type);
    
    // Pass both display name and node type for proper handling
    event.dataTransfer.setData("application/reactflow", JSON.stringify({
      id: node.id,
      name: node.name,
      type: node.type,
      category: node.category
    }));
    event.dataTransfer.setData("text/plain", node.name);
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
    <div className={`bg-zinc-950 border-r border-zinc-800 ${
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
            {isLoading ? (
              <div className="p-4 text-center text-zinc-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-400 mx-auto mb-2"></div>
                Loading nodes...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-400">
                <p className="text-sm mb-2">Failed to load nodes</p>
                <p className="text-xs text-zinc-500">{error}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-xs"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : nodeCategories.length === 0 ? (
              <div className="p-4 text-center text-zinc-400">
                <p className="text-sm mb-2">No nodes available</p>
                <p className="text-xs text-zinc-500">Visit the admin panel to add nodes</p>
              </div>
            ) : (
              nodeCategories.map((category) => (
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
                    className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-zinc-900/50 group transition-all duration-200 ease-in-out"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-white">
                      {category.icon}
                      <span className="truncate">{category.name}</span>
                      <span className="text-xs text-zinc-500">({category.nodes.length})</span>
                    </div>
                    <ChevronRight 
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ease-in-out ${
                        expandedCategories.includes(category.name) ? "rotate-90" : ""
                      }`} 
                    />
                  </button>
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedCategories.includes(category.name) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className={`pb-2 pt-1 transition-all duration-300 ease-in-out ${
                      expandedCategories.includes(category.name) ? 'transform translate-y-0' : 'transform -translate-y-2'
                    }`}>
                      {category.nodes
                        .filter(node => 
                          searchTerm === "" || 
                          node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          node.description.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((node, index) => {
                          const disabled = isNodeDisabled(node);
                          return (
                          <div
                            key={`${node.id}-${node.name}`}
                            draggable={!disabled}
                            onDragStart={(e) => handleNodeDragStart(e, node)}
                            className={`mx-3 p-3 rounded-lg border mb-2 group transition-all duration-300 ease-out ${
                              disabled 
                                ? 'bg-zinc-950 border-zinc-800 opacity-50 cursor-not-allowed'
                                : 'bg-zinc-900 border-zinc-800 cursor-move hover:bg-zinc-800 hover:border-zinc-700 hover:border-[#FF6900]/30 hover:scale-[1.02] hover:shadow-lg'
                            } ${
                              expandedCategories.includes(category.name) 
                                ? 'opacity-100 transform translate-y-0' 
                                : 'opacity-0 transform translate-y-1'
                            }`}
                            style={{
                              transitionDelay: expandedCategories.includes(category.name) ? `${index * 50}ms` : '0ms'
                            }}
                            title={disabled ? "First node must be a trigger or start node" : node.description}
                          >
                            {/* Square Brand Logo Preview */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
                                <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-black/20 flex items-center justify-center overflow-hidden">
                                  {node.icon}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs font-medium block truncate ${
                                  disabled ? 'text-zinc-600' : 'text-white'
                                }`}>{node.name}</span>
                                <p className={`text-xs leading-tight truncate ${
                                  disabled ? 'text-zinc-700' : 'text-zinc-500'
                                }`}>{node.description}</p>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default WorkflowSidebar;
export { WorkflowSidebar };
