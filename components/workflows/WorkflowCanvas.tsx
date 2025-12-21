"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { 
  Plus, 
  Grid3x3, 
  MousePointer, 
  Zap, 
  Play, 
  Settings,
  Database,
  Globe,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Filter,
  GitBranch,
  Code,
  Bot,
  ShoppingCart,
  Instagram,
  Facebook,
  Phone,
  X
} from "lucide-react";
import { getNodeMapping } from "@/lib/workflow/utils/NodeMapping";
import { getBrandLogo, getBrandColor } from "@/lib/workflow/utils/BrandLogoMapping";
import NodeConfigModal from "./NodeConfigModal";
import { WorkflowNode as WorkflowNodeType } from "@/lib/workflow/types";

interface WorkflowCanvasProps {
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onOpenTriggers?: () => void;
  onNodeCountChange?: (count: number) => void;
  executingNodeId?: string | null; // externally-controlled active node
  errorNodeIds?: string[]; // nodes to highlight as invalid
}

export interface WorkflowCanvasRef {
  getWorkflowData: () => {
    nodes: WorkflowNode[];
    connections: Connection[];
  };
  setExecutingNode: (nodeId: string | null) => void;
  setErrorNodes: (ids: string[]) => void;
  applyLayout: (layout: 'serpentine' | 'row' | 'column' | 'radial') => void;
  loadWorkflow: (data: { nodes: WorkflowNode[]; connections: Connection[] }) => void;
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  config?: any; // For custom node configurations like fork outputs
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromPoint: string; // Can be 'output', 'output_1', 'output_2', etc.
  toPoint: 'input';
}

const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(({ selectedNode, onNodeSelect, onOpenTriggers, onNodeCountChange, executingNodeId: executingNodeIdProp, errorNodeIds: errorNodeIdsProp }, ref) => {
  // Canvas ref for precise measurements
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConnecting, setIsConnecting] = useState<{ nodeId: string; point: string } | null>(null);
  const [tempConnection, setTempConnection] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const [forceConnectionUpdate, setForceConnectionUpdate] = useState(0);
  const [executingNodeIdState, setExecutingNodeIdState] = useState<string | null>(null);
  const executingNodeId = executingNodeIdProp ?? executingNodeIdState;
  const [errorNodeIdsState, setErrorNodeIdsState] = useState<string[]>([]);
  const errorNodeIds = errorNodeIdsProp ?? errorNodeIdsState;
  const [customForkModal, setCustomForkModal] = useState<{ open: boolean; nodeId: string | null }>({ open: false, nodeId: null });
  const [customForkOutputs, setCustomForkOutputs] = useState(2);
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<WorkflowNodeType | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'warning' | 'info' } | null>(null);
  
  // Constants for precise node dimensions
  const NODE_SIZE = 64; // Square nodes like n8n/Make.com
  const CONNECTION_HANDLE_SIZE = 6;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getWorkflowData: () => ({
      nodes,
      connections
    }),
    setExecutingNode: (nodeId: string | null) => {
      setExecutingNodeIdState(nodeId);
    },
    setErrorNodes: (ids: string[]) => {
      setErrorNodeIdsState(ids);
      // auto clear after few seconds
      if (ids && ids.length > 0) {
        setTimeout(() => setErrorNodeIdsState([]), 4000);
      }
    },
    loadWorkflow: (data: { nodes: WorkflowNode[]; connections: Connection[] }) => {
      setNodes(data.nodes || []);
      setConnections(data.connections || []);
    },
    applyLayout: (layout: 'serpentine' | 'row' | 'column' | 'radial') => {
      const canvasEl = canvasRef.current;
      const width = canvasEl?.clientWidth || 1200;
      const height = canvasEl?.clientHeight || 800;
      const padding = 40;
      const hGap = 80;
      const vGap = 60;
      const colWidth = NODE_SIZE + hGap;
      const rowHeight = NODE_SIZE + vGap;
      const cols = Math.max(1, Math.floor((width - padding * 2) / colWidth));
      const centerX = width / 2 - NODE_SIZE / 2;
      const centerY = height / 2 - NODE_SIZE / 2;

      setNodes(prev => {
        const arr = [...prev];
        if (arr.length === 0) return arr;
        switch (layout) {
          case 'row': {
            return arr.map((n, i) => ({
              ...n,
              x: padding + (i % cols) * colWidth,
              y: padding + Math.floor(i / cols) * rowHeight,
            }));
          }
          case 'column': {
            const rows = Math.max(1, Math.floor((height - padding * 2) / rowHeight));
            return arr.map((n, i) => ({
              ...n,
              x: padding + Math.floor(i / rows) * colWidth,
              y: padding + (i % rows) * rowHeight,
            }));
          }
          case 'radial': {
            const radius = Math.min(width, height) / 3;
            const cx = centerX; const cy = centerY;
            return arr.map((n, i) => {
              const angle = (i / arr.length) * Math.PI * 2;
              return { ...n, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
            });
          }
          case 'serpentine':
          default: {
            // Zig-zag rows: left->right on even rows, right->left on odd rows
            return arr.map((n, i) => {
              const row = Math.floor(i / cols);
              const idxInRow = i % cols;
              const isOdd = row % 2 === 1;
              const xBase = padding;
              const y = padding + row * rowHeight;
              const x = isOdd
                ? padding + (cols - 1 - idxInRow) * colWidth
                : xBase + idxInRow * colWidth;
              return { ...n, x, y };
            });
          }
        }
      });
    }
  }));

  // Notify parent of node count changes
  useEffect(() => {
    onNodeCountChange?.(nodes.length);
  }, [nodes.length, onNodeCountChange]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    // Simple drag leave - just set to false
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    // Try to get JSON data first (new format), then fall back to plain text (old format)
    let nodeData: any = null;
    let nodeType: string;
    let nodeName: string;
    let isStartNode = false;
    
    const jsonData = event.dataTransfer.getData("application/reactflow");
    if (jsonData) {
      try {
        nodeData = JSON.parse(jsonData);
        nodeType = nodeData.type;
        nodeName = nodeData.name;
        isStartNode = nodeData.category === 'Triggers' || false; // Check if it's from Triggers category
      } catch (e) {
        // If JSON parsing fails, treat as old format
        nodeType = jsonData;
        nodeName = jsonData;
        const nodeMapping = getNodeMapping(nodeType);
        isStartNode = nodeMapping?.category === 'trigger';
      }
    } else {
      // Fallback to plain text
      nodeType = event.dataTransfer.getData("text/plain");
      nodeName = nodeType;
      if (nodeType) {
        const nodeMapping = getNodeMapping(nodeType);
        isStartNode = nodeMapping?.category === 'trigger';
      }
    }
    
    if (!nodeType) {
      console.log('No node type found in drag data');
      return;
    }

    // Validation: If this is the first node, it must be a trigger/start node
    if (nodes.length === 0 && !isStartNode) {
      setNotification({
        message: 'The first node must be a trigger! Please select a node from the Triggers section.',
        type: 'error'
      });
      // Clear notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: nodeName,
      x: Math.max(0, x - 80), // Center the node on cursor with bounds
      y: Math.max(0, y - 40),
      // Store additional metadata from dynamic nodes
      ...(nodeData && {
        nodeDefinitionId: nodeData.id,
        category: nodeData.category
      })
    };

    setNodes(prev => [...prev, newNode]);
    
    // Show modal for Custom fork nodes
    if (nodeType === 'Custom') {
      setCustomForkModal({ open: true, nodeId: newNode.id });
    }
  };

  const handleNodeClick = (nodeId: string) => {
    const clickedNode = nodes.find(n => n.id === nodeId);
    if (clickedNode) {
      // Create WorkflowNodeType object for the modal
      const workflowNode: WorkflowNodeType = {
        id: clickedNode.id,
        type: clickedNode.type,
        name: clickedNode.name,
        category: (clickedNode as any).category || getNodeMapping(clickedNode.type)?.category as any || 'action',
        position: { x: clickedNode.x, y: clickedNode.y },
        config: clickedNode.config || {},
        inputs: [],
        outputs: [],
        enabled: true,
        // Pass node definition ID if available for dynamic nodes
        ...(clickedNode as any).nodeDefinitionId && {
          nodeDefinitionId: (clickedNode as any).nodeDefinitionId
        }
      };
      
      setSelectedNodeForConfig(workflowNode);
      setIsConfigModalOpen(true);
    }
    onNodeSelect(selectedNode === nodeId ? null : nodeId);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode === nodeId) {
      onNodeSelect(null);
    }
  };

  const handleConnectionMouseDown = (nodeId: string, point: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = event.currentTarget.closest('.workflow-canvas')?.getBoundingClientRect();
    if (!rect) return;
    
    const connectionPoint = getConnectionPoint(node, point);
    
    setIsConnecting({ nodeId, point });
    setTempConnection({
      startX: connectionPoint.x,
      startY: connectionPoint.y,
      endX: event.clientX - rect.left,
      endY: event.clientY - rect.top
    });
  };

  const handleConnectionDrop = (nodeId: string, point: 'input') => {
    if (isConnecting && isConnecting.nodeId !== nodeId && isConnecting.point.startsWith('output')) {
      // Check if connection already exists
      const existingConnection = connections.find(
        c => c.from === isConnecting.nodeId && c.to === nodeId
      );
      
      if (!existingConnection) {
        const newConnection: Connection = {
          id: `conn_${Date.now()}`,
          from: isConnecting.nodeId,
          to: nodeId,
          fromPoint: isConnecting.point,
          toPoint: point
        };
        setConnections(prev => [...prev, newConnection]);
      }
    }
    setIsConnecting(null);
    setTempConnection(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setMousePosition({ x, y });
    
    // Handle connection preview - this makes the line follow the mouse
    if (isConnecting && tempConnection) {
      setTempConnection(prev => prev ? {
        ...prev,
        endX: x,
        endY: y
      } : null);
    }
    
    // Handle node dragging (only if not connecting)
    if (draggedNode && !isConnecting) {
      handleNodeMouseMove(event);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    // If we're in connecting mode and click on empty canvas, cancel connection
    if (isConnecting && event.target === event.currentTarget) {
      setIsConnecting(null);
      setTempConnection(null);
    }
  };
  
  const handleCanvasMouseUp = () => {
    // Cancel any ongoing connection
    if (isConnecting) {
      setIsConnecting(null);
      setTempConnection(null);
    }
    // Stop node dragging
    handleNodeMouseUp();
  };

  const deleteConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
  };

  // Enhanced connection point calculation with proper anchoring
  const getNodeCenter = (node: WorkflowNode) => {
    return {
      x: node.x + (NODE_SIZE / 2), // Precise center calculation
      y: node.y + (NODE_SIZE / 2)  // Precise center calculation
    };
  };

  // Get the exact position of connection handles with real node positions
  const getConnectionPoint = useCallback((node: WorkflowNode, type: string) => {
    if (type === 'input') {
      return {
        x: node.x,
        y: node.y + (NODE_SIZE / 2)
      };
    }
    
    if (type === 'output') {
      return {
        x: node.x + NODE_SIZE,
        y: node.y + (NODE_SIZE / 2)
      };
    }
    
    // Handle multiple outputs (output_1, output_2, etc.)
    if (type.startsWith('output_')) {
      const outputIndex = parseInt(type.split('_')[1]) - 1;
      const isCurrentFork = isForkNode(node.type);
      
      if (isCurrentFork) {
        const outputCount = getForkOutputCount(node.type, (node as any).config);
        const handleSpacing = NODE_SIZE / (outputCount + 1);
        const yOffset = handleSpacing * (outputIndex + 1);
        
        return {
          x: node.x + NODE_SIZE,
          y: node.y + yOffset
        };
      }
    }
    
    // Fallback to default output position
    return {
      x: node.x + NODE_SIZE,
      y: node.y + (NODE_SIZE / 2)
    };
  }, []);
  
  // Force connection update when nodes move
  useEffect(() => {
    if (draggedNode) {
      // Trigger re-render of connections when node is being dragged
      setForceConnectionUpdate(prev => prev + 1);
    }
  }, [nodes, draggedNode]);

  const handleNodeMouseDown = (nodeId: string, event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left click
    event.preventDefault();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = event.currentTarget.closest('.workflow-canvas')?.getBoundingClientRect();
    if (!rect) return;
    
    const offsetX = event.clientX - rect.left - node.x;
    const offsetY = event.clientY - rect.top - node.y;
    
    setDraggedNode({
      id: nodeId,
      startX: node.x,
      startY: node.y,
      offsetX,
      offsetY
    });
  };
  
  const handleNodeMouseMove = (event: React.MouseEvent) => {
    if (!draggedNode) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const newX = Math.max(0, event.clientX - rect.left - draggedNode.offsetX);
    const newY = Math.max(0, event.clientY - rect.top - draggedNode.offsetY);
    
    setNodes(prev => prev.map(node => 
      node.id === draggedNode.id 
        ? { ...node, x: newX, y: newY }
        : node
    ));
  };
  
  const handleNodeMouseUp = () => {
    setDraggedNode(null);
  };

  // Enhanced connection rendering with proper path calculations and real-time updates
  const renderConnection = useCallback((connection: Connection) => {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);
    
    if (!fromNode || !toNode) return null;

    // Get real-time connection points using current node positions
    const startPoint = getConnectionPoint(fromNode, 'output');
    const endPoint = getConnectionPoint(toNode, 'input');
    
    const startX = startPoint.x;
    const startY = startPoint.y;
    const endX = endPoint.x;
    const endY = endPoint.y;

    // Calculate horizontal distance for control point positioning
    const horizontalDistance = Math.abs(endX - startX);
    const verticalDistance = Math.abs(endY - startY);
    
    // Enhanced bezier curve calculations for better visual flow
    const controlOffset = Math.max(horizontalDistance * 0.4, 50); // Minimum 50px offset
    const isReversed = endX < startX; // Check if connection flows backwards
    
    // Create smooth bezier curve path with proper control points
    let path;
    if (isReversed) {
      // Handle backward connections with proper looping curve
      const verticalOffset = verticalDistance > 50 ? 0 : 50;
      path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY - verticalOffset}, ${endX - controlOffset} ${endY - verticalOffset}, ${endX} ${endY}`;
    } else {
      // Normal forward connections
      path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
    }

    const isActiveFlow = executingNodeId && connection.from === executingNodeId;
    return (
      <g key={connection.id} className="group">
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          stroke="transparent"
          strokeWidth="12"
          fill="none"
          className="cursor-pointer"
          style={{ pointerEvents: 'all' }}
          onClick={(e) => {
            e.stopPropagation();
            deleteConnection(connection.id);
          }}
        />
        
        {/* Visible connection line */}
        <path
          d={path}
          stroke="#FF6900"
          strokeWidth="3"
          fill="none"
          className={`opacity-80 group-hover:opacity-100 transition-all duration-200 ${isActiveFlow ? 'glow' : ''}`}
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Active flow overlay */}
        {isActiveFlow && (
          <path
            d={path}
            stroke="#FFB080"
            strokeWidth="3"
            fill="none"
            strokeDasharray="48 16"
            className="flow-active"
            style={{ pointerEvents: 'none' }}
          />
        )}
        
        {/* Connection flow animation */}
        <path
          d={path}
          stroke="rgba(255, 105, 0, 0.6)"
          strokeWidth="2"
          fill="none"
          strokeDasharray="8 8"
          className="opacity-0 group-hover:opacity-100 animate-pulse"
          style={{ 
            pointerEvents: 'none',
            animation: 'dash 2s linear infinite'
          }}
        />
        
        {/* Direction indicator arrow */}
        <circle
          cx={endX - 6}
          cy={endY}
          r="3"
          fill="#FF6900"
          className="opacity-90"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Delete button on hover - positioned at curve midpoint */}
        <circle
          cx={(startX + endX) / 2}
          cy={Math.min(startY, endY) - 12}
          r="10"
          fill="#DC2626"
          className="opacity-0 group-hover:opacity-90 transition-opacity cursor-pointer hover:fill-red-500"
          style={{ pointerEvents: 'all' }}
          onClick={(e) => {
            e.stopPropagation();
            deleteConnection(connection.id);
          }}
        />
        <text
          x={(startX + endX) / 2}
          y={Math.min(startY, endY) - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none"
          style={{ pointerEvents: 'none' }}
        >
          ×
        </text>
      </g>
    );
  }, [nodes, getConnectionPoint]);

  // Helper functions for fork nodes
  const isForkNode = (nodeType: string): boolean => {
    return ['Double', 'Triple', 'Quadra', 'Custom'].includes(nodeType);
  };

  const getForkOutputCount = (nodeType: string, config?: any): number => {
    switch (nodeType) {
      case 'Double': return 2;
      case 'Triple': return 3;
      case 'Quadra': return 4;
      case 'Custom': return config?.outputCount || 2;
      default: return 1;
    }
  };

  // Get brand logo component for node
  const getBrandLogoComponent = (nodeType: string, node?: WorkflowNode) => {
    const LogoComponent = getBrandLogo(nodeType);
    
    // Special handling for CustomForkLogo to pass output count
    if (nodeType === 'Custom') {
      const outputCount = node?.config?.outputCount || 5;
      // Cast to any to handle the outputCount prop
      const CustomComponent = LogoComponent as any;
      return <CustomComponent size={NODE_SIZE} outputCount={outputCount} />;
    }
    
    return <LogoComponent size={NODE_SIZE} />;
  };

  return (
    <div 
      ref={canvasRef}
      className="workflow-canvas flex-1 h-full relative bg-black border border-zinc-800 overflow-hidden min-h-0"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onClick={handleCanvasClick}
    >
      {/* SVG Connections Layer with proper event handling */}
      <svg 
        className="absolute inset-0 w-full h-full z-10"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <style>{`
            @keyframes dash { to { stroke-dashoffset: -16; } }
            @keyframes flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -48; } }
            .flow-active { animation: flow 1.2s linear infinite; }
            .glow { filter: drop-shadow(0 0 6px rgba(255,105,0,0.35)); }
          `}</style>
        </defs>
        {connections.map(renderConnection)}
        {tempConnection && (
          <g>
            <path
              d={`M ${tempConnection.startX} ${tempConnection.startY} C ${tempConnection.startX + 80} ${tempConnection.startY}, ${tempConnection.endX - 80} ${tempConnection.endY}, ${tempConnection.endX} ${tempConnection.endY}`}
              stroke="#FF6900"
              strokeWidth="3"
              strokeDasharray="8,4"
              fill="none"
              opacity="0.8"
              className="animate-pulse"
            />
            <circle
              cx={tempConnection.endX}
              cy={tempConnection.endY}
              r="6"
              fill="#FF6900"
              opacity="0.6"
              className="animate-ping"
            />
          </g>
        )}
      </svg>

      {/* Classic Black Grid Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #6b7280 1px, transparent 1px),
            linear-gradient(to bottom, #6b7280 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Drop Zone Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-[#FF6900]/10 border-2 border-dashed border-[#FF6900] z-20 flex items-center justify-center backdrop-blur-sm animate-pulse">
          <div className="bg-zinc-900/95 border border-[#FF6900]/50 rounded-xl px-8 py-6 flex items-center gap-4 shadow-xl">
            <div className="w-10 h-10 bg-[#FF6900] rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[#FF6900] font-bold text-lg">Drop Node Here</div>
              <div className="text-sm text-zinc-300">Release to add to your workflow board</div>
            </div>
          </div>
        </div>
      )}
      {/* Workflow Nodes */}
      {nodes.map((node, index) => {
        const isFirstNode = index === 0;
        const nodeMapping = getNodeMapping(node.type);
        const isTrigger = nodeMapping?.category === 'trigger';
        
        return (
        <div
          key={node.id}
          className={`absolute cursor-pointer transition-all duration-200 z-20 group
            ${selectedNode === node.id
              ? "transform scale-[1.05]" 
              : "hover:transform hover:scale-[1.02]"
            }`}
          style={{
            left: node.x,
            top: node.y,
          }}
          onClick={() => handleNodeClick(node.id)}
          onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleNodeDelete(node.id);
          }}
        >
          {/* Square Brand Logo Node */}
          <div className="relative">
            {/* Main Square Node Container */}
            <div 
              className={`
                relative transition-all duration-200 border-2 bg-black/20 backdrop-blur-sm
                ${selectedNode === node.id 
                  ? 'border-[#FF6900] shadow-[#FF6900]/40 shadow-lg' 
                  : errorNodeIds.includes(node.id) 
                    ? 'border-red-500 animate-pulse' 
                    : 'border-zinc-700 hover:border-zinc-600'
                }
              `}
              style={{
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: '12px'
              }}
            >
              {/* Brand Logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                {getBrandLogoComponent(node.type, node)}
              </div>
              
              {/* Execution indicator */}
              {executingNodeId === node.id && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-4 h-4 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin bg-black" />
                </div>
              )}
              
              {/* Node label (appears on hover) */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-black/90 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-medium whitespace-nowrap">
                  {node.name}
                </div>
              </div>
            </div>
            
            {/* Connection Handles (outside the clipped body) */}
            {/* Input Handle - hidden for first trigger node */}
            {!(isFirstNode && isTrigger) && (
              <div 
                className={`absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-zinc-800 border-2 transition-all duration-200 cursor-crosshair flex items-center justify-center z-50 shadow-lg rounded-full ${
                  isConnecting ? 'border-[#FF6900] bg-[#FF6900]/20 scale-110' : 'border-zinc-700 hover:border-[#FF6900] hover:bg-[#FF6900]/20'
                }`}
                onMouseUp={() => isConnecting && handleConnectionDrop(node.id, 'input')}
                onMouseEnter={(e) => {
                  if (isConnecting) {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 105, 0, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isConnecting) {
                    e.currentTarget.style.borderColor = '#FF6900';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 105, 0, 0.1)';
                  }
                }}
                title="Input - Drop connection here"
              >
                <div className="w-2 h-2 bg-zinc-400 hover:bg-[#FF6900] rounded-full transition-colors"></div>
              </div>
            )}

            {/* Output Handle(s) */}
            {(() => {
              const isCurrentFork = isForkNode(node.type);
              const outputCount = isCurrentFork ? getForkOutputCount(node.type, node.config) : 1;
              
              if (isCurrentFork) {
                // Multiple output handles for fork nodes
                const handles = [];
                const nodeHeight = NODE_SIZE;
                const handleSpacing = nodeHeight / (outputCount + 1);
                
                for (let i = 0; i < outputCount; i++) {
                  const yOffset = handleSpacing * (i + 1) - (nodeHeight / 2);
                  const outputPort = `output_${i + 1}`;
                  
                  handles.push(
                    <div 
                      key={`output-${i}`}
                      className={`absolute -right-3 w-6 h-6 bg-zinc-800 border-2 border-zinc-700 rounded-full hover:border-[#FF6900] hover:bg-[#FF6900]/20 transition-all duration-200 cursor-crosshair flex items-center justify-center z-50 shadow-lg`}
                      style={{ 
                        top: '50%',
                        transform: `translate(0, ${yOffset}px)` 
                      }}
                      onMouseDown={(e) => handleConnectionMouseDown(node.id, outputPort, e)}
                      title={`Output ${i + 1} - Drag to connect`}
                    >
                      <div className="w-2 h-2 bg-zinc-400 hover:bg-[#FF6900] rounded-full transition-colors" />
                    </div>
                  );
                }
                return handles;
              } else {
                // Single output handle for regular nodes
                return (
                  <div 
                    className={`absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-zinc-800 border-2 border-zinc-700 rounded-full hover:border-[#FF6900] hover:bg-[#FF6900]/20 transition-all duration-200 cursor-crosshair flex items-center justify-center z-50 shadow-lg`}
                    onMouseDown={(e) => handleConnectionMouseDown(node.id, 'output', e)}
                    title="Output - Drag to connect"
                  >
                    <div className="w-2 h-2 bg-zinc-400 hover:bg-[#FF6900] rounded-full transition-colors" />
                  </div>
                );
              }
            })()}

            {/* Delete Button on Hover */}
            <div className={`absolute -top-2 ${isFirstNode && isTrigger ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium shadow-sm transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeDelete(node.id);
                }}
                title="Delete Node"
              >
                ×
              </button>
            </div>
          </div>
        </div>
        );
      })}

      {/* Empty State */}
      {nodes.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Icon */}
            <div className="relative mb-8">
              <button
                onClick={onOpenTriggers}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-[#FF6900]/20 hover:to-[#FF6900]/30 rounded-2xl border-2 border-dashed border-zinc-700/30 hover:border-[#FF6900]/50 flex items-center justify-center transition-all duration-300 group"
              >
                <Plus className="w-12 h-12 text-zinc-400 group-hover:text-[#FF6900] transition-colors duration-300" />
              </button>
            </div>
            
            {/* Title */}
            <h3 className="text-2xl font-bold text-white mb-4">Add Your First Node</h3>
            <p className="text-lg text-zinc-400 mb-6 max-w-md mx-auto">
              Drag a node from the sidebar to start building your workflow
            </p>
            
            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                <MousePointer className="w-4 h-4" />
                <span>Drag from sidebar → Drop here</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-zinc-600">or</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-[#FF6900]">
                <Plus className="w-4 h-4" />
                <span>Click the plus icon above to browse triggers</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Node Configuration Modal */}
      <NodeConfigModal
        node={selectedNodeForConfig}
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false);
          setSelectedNodeForConfig(null);
          onNodeSelect(null);
        }}
        onSave={(nodeConfig) => {
          if (selectedNodeForConfig) {
            setNodes(prev => prev.map(node => 
              node.id === selectedNodeForConfig.id
                ? { ...node, config: nodeConfig }
                : node
            ));
          }
        }}
        onTest={async (testWorkflow, config) => {
          // Execute single node test using the workflow engine
          try {
            
            // Import the advanced workflow engine dynamically
            const { AdvancedWorkflowEngine } = await import('../../lib/workflow/engine/AdvancedWorkflowEngine');
            const engine = new AdvancedWorkflowEngine();
            
            // Execute the test workflow
            const execution = await engine.execute(testWorkflow, { testMode: true }, {
              timeout: 10000,
              retryCount: 1,
              errorHandling: 'stop'
            });
            
            return {
              success: execution.status === 'completed',
              data: execution.output || execution.nodeLogs[0]?.output,
              metadata: {
                executionTime: execution.duration,
                logs: execution.nodeLogs,
                nodeCount: execution.nodeLogs.length
              }
            };
            
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Test failed',
              data: null
            };
          }
        }}
        onDelete={() => {
          if (selectedNodeForConfig) {
            setNodes(prev => prev.filter(node => node.id !== selectedNodeForConfig.id));
            setConnections(prev => prev.filter(conn => 
              conn.from !== selectedNodeForConfig.id && conn.to !== selectedNodeForConfig.id
            ));
            setIsConfigModalOpen(false);
            setSelectedNodeForConfig(null);
            onNodeSelect(null);
          }
        }}
      />

      {/* Custom Fork Configuration Modal */}
      {customForkModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#FF6900]" />
                  Configure Custom Fork
                </h3>
                <button
                  onClick={() => setCustomForkModal({ open: false, nodeId: null })}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 block mb-3 font-medium">
                  How many output branches do you need?
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Number of Outputs</span>
                    <span className="text-[#FF6900] font-bold text-lg">{customForkOutputs}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={customForkOutputs}
                    onChange={(e) => setCustomForkOutputs(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #FF6900 0%, #FF6900 ${((customForkOutputs - 2) / 4) * 100}%, #27272a ${((customForkOutputs - 2) / 4) * 100}%, #27272a 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>2 outputs</span>
                    <span>6 outputs</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="text-sm text-zinc-300 mb-2">Preview:</div>
                <div className="text-xs text-zinc-400">
                  This fork will split incoming data into <strong className="text-[#FF6900]">{customForkOutputs}</strong> parallel branches, 
                  allowing for simultaneous processing across multiple workflow paths.
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-700 flex gap-3">
              <button 
                onClick={() => setCustomForkModal({ open: false, nodeId: null })}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (customForkModal.nodeId) {
                    // Update the node with the selected output count
                    setNodes(prev => prev.map(node => 
                      node.id === customForkModal.nodeId 
                        ? { ...node, config: { outputCount: customForkOutputs } }
                        : node
                    ));
                  }
                  setCustomForkModal({ open: false, nodeId: null });
                }}
                className="flex-1 px-4 py-2 bg-[#FF6900] hover:bg-[#E55D00] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] max-w-md">
          <div className={`p-4 rounded-xl border-2 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
            notification.type === 'error' ? 'bg-red-900/90 border-red-500/50 text-red-100' :
            notification.type === 'warning' ? 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100' :
            'bg-blue-900/90 border-blue-500/50 text-blue-100'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {notification.type === 'error' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                    !
                  </div>
                ) : notification.type === 'warning' ? (
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-black text-sm font-bold">
                    ⚠
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    i
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WorkflowCanvas.displayName = 'WorkflowCanvas';

export default WorkflowCanvas;
