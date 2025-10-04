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
  Bot
} from "lucide-react";
import { getNodeMapping } from "@/lib/workflow/utils/NodeMapping";

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
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromPoint: 'output';
  toPoint: 'input';
}

const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(({ selectedNode, onNodeSelect, onOpenTriggers, onNodeCountChange, executingNodeId: executingNodeIdProp, errorNodeIds: errorNodeIdsProp }, ref) => {
  // Canvas ref for precise measurements
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConnecting, setIsConnecting] = useState<{ nodeId: string; point: 'output' } | null>(null);
  const [tempConnection, setTempConnection] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ id: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const [forceConnectionUpdate, setForceConnectionUpdate] = useState(0);
  const [executingNodeIdState, setExecutingNodeIdState] = useState<string | null>(null);
  const executingNodeId = executingNodeIdProp ?? executingNodeIdState;
  const [errorNodeIdsState, setErrorNodeIdsState] = useState<string[]>([]);
  const errorNodeIds = errorNodeIdsProp ?? errorNodeIdsState;
  
  // Constants for precise node dimensions
  const NODE_WIDTH = 192;
  const NODE_HEIGHT = 80;
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
    applyLayout: (layout: 'serpentine' | 'row' | 'column' | 'radial') => {
      const canvasEl = canvasRef.current;
      const width = canvasEl?.clientWidth || 1200;
      const height = canvasEl?.clientHeight || 800;
      const padding = 40;
      const hGap = 80;
      const vGap = 60;
      const colWidth = NODE_WIDTH + hGap;
      const rowHeight = NODE_HEIGHT + vGap;
      const cols = Math.max(1, Math.floor((width - padding * 2) / colWidth));
      const centerX = width / 2 - NODE_WIDTH / 2;
      const centerY = height / 2 - NODE_HEIGHT / 2;

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
    
    // Try both data formats
    let nodeType = event.dataTransfer.getData("application/reactflow");
    if (!nodeType) {
      nodeType = event.dataTransfer.getData("text/plain");
    }
    
    console.log('Dropped node type:', nodeType); // Debug log
    
    if (!nodeType) {
      console.log('No node type found in drag data');
      return;
    }

    // Validation: If this is the first node, it must be a trigger
    if (nodes.length === 0) {
      const nodeMapping = getNodeMapping(nodeType);
      if (!nodeMapping || nodeMapping.category !== 'trigger') {
        alert('The first node must be a trigger! Please select a node from the Triggers section.');
        return;
      }
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type: nodeType,
      name: nodeType,
      x: Math.max(0, x - 80), // Center the node on cursor with bounds
      y: Math.max(0, y - 40),
    };

    console.log('Adding new node:', newNode); // Debug log
    setNodes(prev => [...prev, newNode]);
  };

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect(selectedNode === nodeId ? null : nodeId);
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode === nodeId) {
      onNodeSelect(null);
    }
  };

  const handleConnectionMouseDown = (nodeId: string, point: 'output', event: React.MouseEvent) => {
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
    if (isConnecting && isConnecting.nodeId !== nodeId && isConnecting.point === 'output') {
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
      x: node.x + (NODE_WIDTH / 2), // Precise center calculation
      y: node.y + (NODE_HEIGHT / 2)  // Precise center calculation
    };
  };

  // Get the exact position of connection handles with real node positions
  const getConnectionPoint = useCallback((node: WorkflowNode, type: 'input' | 'output') => {
    const centerY = node.y + (NODE_HEIGHT / 2);
    return {
      x: type === 'output' ? node.x + NODE_WIDTH : node.x, // Precise edge positions
      y: centerY // Vertically centered on node
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
        n        {/* Active flow overlay */}
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

  const getNodeIcon = (nodeType: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      "On Clicking Execute": <Play className="w-4 h-4 text-[#FF6900] fill-current" />,
      "HTTP Request": <Globe className="w-4 h-4" />,
      "Schedule": <Calendar className="w-4 h-4" />,
      "Webhook": <GitBranch className="w-4 h-4" />,
      "File Watch": <FileText className="w-4 h-4" />,
      "Database": <Database className="w-4 h-4" />,
      "Email": <Mail className="w-4 h-4" />,
      "Slack": <MessageSquare className="w-4 h-4" />,
      "If": <GitBranch className="w-4 h-4" />,
      "Switch": <Filter className="w-4 h-4" />,
      "Loop": <Code className="w-4 h-4" />,
      "Merge": <Users className="w-4 h-4" />,
      "OpenAI": <Bot className="w-4 h-4" />,
      "Text Analysis": <FileText className="w-4 h-4" />,
      "Image Processing": <Zap className="w-4 h-4" />,
      "Data Transform": <Code className="w-4 h-4" />
    };
    
    return iconMap[nodeType] || <Settings className="w-4 h-4" />;
  };

  return (
    <div 
      ref={canvasRef}
      className="workflow-canvas flex-1 h-full relative bg-black border border-zinc-800 overflow-hidden"
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
              ? "transform scale-[1.02]" 
              : "hover:transform hover:scale-[1.01]"
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
          {/* Clean Enterprise Node */}
          <div className="relative group">
            {/* Node Container */}
            <div 
              className={`
                backdrop-blur-sm border transition-all duration-200 relative p-4
                ${isFirstNode && isTrigger 
                  ? `w-48 h-16 bg-zinc-900/90 ${errorNodeIds.includes(node.id) ? 'border-red-500 animate-pulse' : 'border-transparent'} rounded-xl`
                  : selectedNode === node.id 
                    ? `w-48 h-20 bg-zinc-900/90 ${errorNodeIds.includes(node.id) ? 'border-red-500 animate-pulse' : 'border-[#FF6900]'} shadow-[#FF6900]/20 shadow-lg rounded-xl` 
                    : `w-48 h-20 bg-zinc-900/90 ${errorNodeIds.includes(node.id) ? 'border-red-500 animate-pulse' : 'border-zinc-700/60'} hover:border-zinc-600/80 hover:shadow-xl rounded-xl`
                }
              `}
              style={isFirstNode && isTrigger ? {
                // Keep the original body size and arrow shape; do not extend width
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)',
                WebkitClipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%)',
                filter: errorNodeIds.includes(node.id) 
                  ? 'drop-shadow(0 0 2px rgba(239,68,68,0.9))' // red outline when invalid
                  : 'drop-shadow(0 0 0.75px rgba(63,63,70,0.9))'
              } : undefined}
            >
              {/* Content */}
              {isFirstNode && isTrigger ? (
                /* Minimal first node layout */
                <div className="h-full flex items-center relative">
                  {/* Icon */}
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-6 h-6 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center">
                      {getNodeIcon(node.type)}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 mr-3">
                    <h4 className="text-white text-sm font-medium truncate">{node.name}</h4>
                  </div>
                  
                  {/* Status */}
                  <div className="w-1.5 h-1.5 bg-[#FF6900] rounded-full" />
                  {executingNodeId === node.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                /* Standard node layout */
                <>
                  {/* Node Header */}
                  <div className="flex items-center gap-3 mb-3 relative">
                    {/* Icon */}
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                      ${selectedNode === node.id 
                        ? 'bg-[#FF6900] text-white' 
                        : 'bg-zinc-800 text-zinc-300 group-hover:bg-zinc-700'
                      }
                    `}>
                      {getNodeIcon(node.type)}
                    </div>
                    
                    {/* Node Title */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{node.name}</h4>
                      <p className="text-zinc-400 text-xs truncate">{node.type}</p>
                    </div>
                    
                    {/* Status Indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      selectedNode === node.id ? 'bg-[#FF6900]' : 'bg-emerald-500'
                    }`} />
                    {executingNodeId === node.id && (
                      <div className="absolute -right-1 -top-1">
                        <div className="w-5 h-5 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Node Description */}
                  <div className="text-xs text-zinc-400 mb-3">
                    Ready to configure
                  </div>
                </>
              )}
              
              {/* Connection Handles are rendered as siblings of the clipped body to avoid clipping */}
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

            {/* Output Handle */}
            <div 
              className={`absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-zinc-800 border-2 border-zinc-700 rounded-full hover:border-[#FF6900] hover:bg-[#FF6900]/20 transition-all duration-200 cursor-crosshair flex items-center justify-center z-50 shadow-lg`}
              onMouseDown={(e) => handleConnectionMouseDown(node.id, 'output', e)}
              title="Output - Drag to connect"
            >
              <div className="w-2 h-2 bg-zinc-400 hover:bg-[#FF6900] rounded-full transition-colors" />
            </div>

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

      {/* Properties Panel */}
      {selectedNode && (
        <div className="absolute top-6 right-6 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 shadow-2xl z-30">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#FF6900] rounded-full"></div>
            Node Properties
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-300 block mb-2 font-medium">Node Name</label>
              <input 
                type="text" 
                className="w-full bg-zinc-800 border border-zinc-600 text-white text-sm rounded-lg px-4 py-3 focus:border-[#FF6900] focus:outline-none transition-colors"
                defaultValue={nodes.find(n => n.id === selectedNode)?.name || ""}
                placeholder="Enter node name..."
              />
            </div>
            <div>
              <label className="text-sm text-zinc-300 block mb-2 font-medium">Description</label>
              <textarea 
                className="w-full bg-zinc-800 border border-zinc-600 text-white text-sm rounded-lg px-4 py-3 h-24 resize-none focus:border-[#FF6900] focus:outline-none transition-colors"
                placeholder="Describe what this node does..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 bg-[#FF6900] hover:bg-[#E55D00] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Save Changes
              </button>
              <button 
                onClick={() => onNodeSelect(null)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Close
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
