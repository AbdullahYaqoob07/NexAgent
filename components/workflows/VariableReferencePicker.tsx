"use client";

import { useState, useMemo, useEffect } from 'react';
import { useVariableReferences } from '@/lib/workflow/hooks/useVariableReferences';
import { Search, X, Copy, Database, Zap, Globe, MessageSquare, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface VariableReference {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  path: string;
  value: any;
  fullPath: string;
}

interface VariableReferencePickerProps {
  workflowNodes: any[];
  workflowConnections: any[];
  currentNodeId: string;
  workflowId?: string;
  onSelect: (variablePath: string) => void;
  onClose: () => void;
}

// Helper function to get node icon
const getNodeIcon = (nodeType: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'HTTP Request': <Globe className="w-4 h-4" />,
    'Logger': <FileText className="w-4 h-4" />,
    'String Manipulation': <MessageSquare className="w-4 h-4" />,
    'Number Formatter': <Database className="w-4 h-4" />,
    'Date Formatter': <Database className="w-4 h-4" />,
    'Variable Setter': <Database className="w-4 h-4" />,
    'On Clicking Execute': <Zap className="w-4 h-4" />,
    'Manual Trigger': <Zap className="w-4 h-4" />,
    'Schedule': <Zap className="w-4 h-4" />,
  };
  return iconMap[nodeType] || <Database className="w-4 h-4" />;
};

// Helper function to flatten nested objects and extract paths
const extractVariablePaths = (obj: any, prefix = ''): VariableReference[] => {
  const paths: VariableReference[] = [];
  
  if (obj === null || obj === undefined) {
    return paths;
  }
  
  if (typeof obj !== 'object') {
    return [{
      id: prefix,
      nodeId: '',
      nodeName: '',
      nodeType: '',
      path: prefix,
      value: obj,
      fullPath: `{{${prefix}}}`
    }];
  }
  
  if (Array.isArray(obj)) {
    // Handle arrays
    obj.forEach((item, index) => {
      const itemPaths = extractVariablePaths(item, `${prefix}[${index}]`);
      paths.push(...itemPaths);
    });
  } else {
    // Handle objects
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        // Recursively extract nested paths
        const nestedPaths = extractVariablePaths(value, newPath);
        paths.push(...nestedPaths);
      } else {
        // Add leaf node
        paths.push({
          id: newPath,
          nodeId: '',
          nodeName: '',
          nodeType: '',
          path: newPath,
          value: value,
          fullPath: `{{${newPath}}}`
        });
      }
    });
  }
  
  return paths;
};

// Function to get previous node outputs from workflow execution history
const getPreviousNodeOutputs = async (workflowNodes: any[], workflowConnections: any[], currentNodeId: string, workflowId: string) => {
  // First, try to get real execution data from the backend
  try {
    // Get the latest execution for this workflow
    const response = await fetch(`/api/workflows/executions/${workflowId}`);
    const data = await response.json();
    
    if (data.success && data.executions && data.executions.length > 0) {
      // Get the most recent execution
      const latestExecution = data.executions[0];
      
      // Find nodes that are connected to the current node
      const incomingConnections = workflowConnections.filter(conn => conn.to === currentNodeId);
      const previousNodes: any[] = [];
      
      incomingConnections.forEach(conn => {
        const sourceNode = workflowNodes.find(node => node.id === conn.from);
        if (sourceNode) {
          // Find the execution log for this node
          const nodeLog = latestExecution.nodeLogs.find((log: any) => log.nodeId === sourceNode.id);
          
          if (nodeLog && nodeLog.output) {
            // Use real execution output
            previousNodes.push({
              ...sourceNode,
              output: nodeLog.output
            });
          } else {
            // Fallback to sample data if no execution output
            let nodeOutput: any = {};
            
            switch (sourceNode.type) {
              case 'HTTP Request':
              case 'HttpNode':
                nodeOutput = {
                  status: 200,
                  statusText: "OK",
                  url: "https://jsonplaceholder.typicode.com/users/1",
                  method: "GET",
                  headers: {
                    "content-type": "application/json",
                    "date": "Sat, 20 Dec 2025 21:15:36 GMT"
                  },
                  data: {
                    id: 1,
                    name: "Leanne Graham",
                    username: "Bret",
                    email: "Sincere@april.biz",
                    address: {
                      street: "Kulas Light",
                      suite: "Apt. 556",
                      city: "Gwenborough",
                      zipcode: "92998-3874",
                      geo: {
                        lat: "-37.3159",
                        lng: "81.1496"
                      }
                    },
                    phone: "1-770-736-8031 x56442",
                    website: "hildegard.org",
                    company: {
                      name: "Romaguera-Crona",
                      catchPhrase: "Multi-layered client-server neural-net",
                      bs: "harness real-time e-markets"
                    }
                  }
                };
                break;
              case 'String Manipulation':
              case 'StringManipulationNode':
                nodeOutput = {
                  result: "LEANE GRAHAM",
                  original: "Leanne Graham",
                  operation: "uppercase"
                };
                break;
              case 'Number Formatter':
              case 'NumberFormatterNode':
                nodeOutput = {
                  formatted: "USER-0001",
                  original: 1,
                  decimalPlaces: 0,
                  prefix: "USER-"
                };
                break;
              case 'Date Formatter':
              case 'DateFormatterNode':
                nodeOutput = {
                  formattedDate: "2025-12-21 14:30:00",
                  timestamp: "2025-12-21T14:30:00Z",
                  timezone: "UTC",
                  format: "YYYY-MM-DD HH:mm:ss"
                };
                break;
              case 'Variable Setter':
              case 'VariableSetterNode':
                nodeOutput = {
                  variableSet: true,
                  variableName: "userData",
                  variableValue: {
                    id: 1,
                    name: "Leanne Graham"
                  },
                  valueSource: "input"
                };
                break;
              case 'Logger':
              case 'LoggerNode':
                nodeOutput = {
                  logged: true,
                  logLevel: "info",
                  message: "Workflow node execution",
                  loggedAt: "2025-12-21T14:30:00Z"
                };
                break;
              default:
                nodeOutput = {
                  result: "Node execution result",
                  timestamp: "2025-12-21T14:30:00Z",
                  status: "completed"
                };
            }
            
            previousNodes.push({
              ...sourceNode,
              output: nodeOutput
            });
          }
        }
      });
      
      return previousNodes;
    }
  } catch (error) {
    console.warn('Failed to fetch execution data, using sample data:', error);
  }
  
  // Fallback to sample data if real data is not available
  const previousNodes: any[] = [];
  
  // Find nodes that are connected to the current node
  const incomingConnections = workflowConnections.filter(conn => conn.to === currentNodeId);
  
  incomingConnections.forEach(conn => {
    const sourceNode = workflowNodes.find(node => node.id === conn.from);
    if (sourceNode) {
      // In a real implementation, you'd get the actual output from execution context
      // This would come from the workflow engine's execution context or checkpoint data
      let nodeOutput: any = {};
      
      switch (sourceNode.type) {
        case 'HTTP Request':
        case 'HttpNode':
          nodeOutput = {
            status: 200,
            statusText: "OK",
            url: "https://jsonplaceholder.typicode.com/users/1",
            method: "GET",
            headers: {
              "content-type": "application/json",
              "date": "Sat, 20 Dec 2025 21:15:36 GMT"
            },
            data: {
              id: 1,
              name: "Leanne Graham",
              username: "Bret",
              email: "Sincere@april.biz",
              address: {
                street: "Kulas Light",
                suite: "Apt. 556",
                city: "Gwenborough",
                zipcode: "92998-3874",
                geo: {
                  lat: "-37.3159",
                  lng: "81.1496"
                }
              },
              phone: "1-770-736-8031 x56442",
              website: "hildegard.org",
              company: {
                name: "Romaguera-Crona",
                catchPhrase: "Multi-layered client-server neural-net",
                bs: "harness real-time e-markets"
              }
            }
          };
          break;
        case 'String Manipulation':
        case 'StringManipulationNode':
          nodeOutput = {
            result: "LEANE GRAHAM",
            original: "Leanne Graham",
            operation: "uppercase"
          };
          break;
        case 'Number Formatter':
        case 'NumberFormatterNode':
          nodeOutput = {
            formatted: "USER-0001",
            original: 1,
            decimalPlaces: 0,
            prefix: "USER-"
          };
          break;
        case 'Date Formatter':
        case 'DateFormatterNode':
          nodeOutput = {
            formattedDate: "2025-12-21 14:30:00",
            timestamp: "2025-12-21T14:30:00Z",
            timezone: "UTC",
            format: "YYYY-MM-DD HH:mm:ss"
          };
          break;
        case 'Variable Setter':
        case 'VariableSetterNode':
          nodeOutput = {
            variableSet: true,
            variableName: "userData",
            variableValue: {
              id: 1,
              name: "Leanne Graham"
            },
            valueSource: "input"
          };
          break;
        case 'Logger':
        case 'LoggerNode':
          nodeOutput = {
            logged: true,
            logLevel: "info",
            message: "Workflow node execution",
            loggedAt: "2025-12-21T14:30:00Z"
          };
          break;
        default:
          nodeOutput = {
            result: "Node execution result",
            timestamp: "2025-12-21T14:30:00Z",
            status: "completed"
          };
      }
      
      previousNodes.push({
        ...sourceNode,
        output: nodeOutput
      });
    }
  });
  
  return previousNodes;
};

export default function VariableReferencePicker({ 
  workflowNodes, 
  workflowConnections, 
  currentNodeId, 
  workflowId: propWorkflowId,
  onSelect, 
  onClose 
}: VariableReferencePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract all variable paths from previous nodes
  const [allVariables, setAllVariables] = useState<VariableReference[]>([]);
  
  useEffect(() => {
    const fetchVariables = async () => {
      if (propWorkflowId && workflowNodes.length > 0 && workflowConnections.length > 0 && currentNodeId) {
        const nodesWithOutputs = await getPreviousNodeOutputs(
          workflowNodes, 
          workflowConnections, 
          currentNodeId,
          propWorkflowId
        );
        
        const variables: VariableReference[] = [];
        nodesWithOutputs.forEach(node => {
          const nodeVariables = extractVariablePaths(node.output, `${node.id}.data`);
          nodeVariables.forEach(variable => {
            variables.push({
              ...variable,
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type
            });
          });
        });
        
        setAllVariables(variables);
      }
    };
    
    fetchVariables();
  }, [workflowNodes, workflowConnections, currentNodeId, propWorkflowId]);
  
  // Get previous nodes that have outputs
  const previousNodesWithOutputs = useMemo(() => {
    if (!propWorkflowId || !workflowNodes.length || !workflowConnections.length || !currentNodeId) {
      return [];
    }
    // This will be populated by the useEffect above
    return [];
  }, [workflowNodes, workflowConnections, currentNodeId, propWorkflowId]);
  
  // Filter variables based on search term
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return allVariables;
    
    return allVariables.filter(variable => 
      variable.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.nodeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.nodeType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allVariables, searchTerm]);
  
  // Group variables by node
  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableReference[]> = {};
    
    filteredVariables.forEach(variable => {
      if (!groups[variable.nodeId]) {
        groups[variable.nodeId] = [];
      }
      groups[variable.nodeId].push(variable);
    });
    
    return groups;
  }, [filteredVariables]);
  
  const handleSelectVariable = (fullPath: string) => {
    onSelect(fullPath);
    onClose();
  };
  
  // Handle drag start for drag-and-drop functionality
  const handleDragStart = (e: React.DragEvent, fullPath: string) => {
    e.dataTransfer.setData('text/plain', fullPath);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  // Handle drag over for drop targets
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  
  // Handle drop for drop targets (this would be used in the parent component)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      onSelect(data);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#FF6900]" />
            <h3 className="text-lg font-semibold text-white">Variable References</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(groupedVariables).length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm">No variables available from previous nodes</p>
              <p className="text-xs mt-1">Execute upstream nodes first to see their outputs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedVariables).map(([nodeId, variables]) => {
                const node = previousNodesWithOutputs.find(n => n.id === nodeId);
                if (!node) return null;
                
                return (
                  <div key={nodeId} className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
                        {getNodeIcon(node.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{node.name}</div>
                        <div className="text-xs text-zinc-400">{node.type}</div>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {variables.length} variables
                      </Badge>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {variables.map((variable) => (
                        <div 
                          key={variable.id}
                          className="px-3 py-2 hover:bg-zinc-800/50 cursor-pointer group flex items-center justify-between"
                          onClick={() => handleSelectVariable(variable.fullPath)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, variable.fullPath)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="w-4 h-4 text-zinc-500" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-mono text-[#FF6900] group-hover:text-white truncate">
                                  {variable.path}
                                </div>
                                <div className="text-xs text-zinc-400 truncate max-w-xs">
                                  {String(variable.value)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(variable.fullPath);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                              >
                                <Database className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-900/50">
          <div className="text-xs text-zinc-500">
            <p>Click on a variable to insert it into the field</p>
            <p className="mt-1">Variables are referenced using the syntax: {'{{nodeId.data.field}}'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}