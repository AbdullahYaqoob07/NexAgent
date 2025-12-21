import { useState, useEffect } from 'react';

interface VariableReference {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  path: string;
  value: any;
  fullPath: string;
}

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
export const getPreviousNodeOutputs = (
  workflowNodes: any[], 
  workflowConnections: any[], 
  currentNodeId: string
) => {
  const previousNodes: any[] = [];
  
  // Find nodes that are connected to the current node
  const incomingConnections = workflowConnections.filter(conn => conn.to === currentNodeId);
  
  incomingConnections.forEach(conn => {
    const sourceNode = workflowNodes.find(node => node.id === conn.from);
    if (sourceNode) {
      // In a real implementation, this would come from the workflow execution context
      // For now, we'll provide realistic sample data
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

// Hook to extract variable references from previous nodes
export const useVariableReferences = (
  workflowNodes: any[], 
  workflowConnections: any[], 
  currentNodeId: string
) => {
  const [variables, setVariables] = useState<VariableReference[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!currentNodeId || !workflowNodes.length || !workflowConnections.length) {
      setVariables([]);
      return;
    }
    
    setLoading(true);
    
    try {
      // Get previous nodes that have outputs
      const previousNodesWithOutputs = getPreviousNodeOutputs(
        workflowNodes, 
        workflowConnections, 
        currentNodeId
      );
      
      // Extract all variable paths from previous nodes
      const allVariables: VariableReference[] = [];
      
      previousNodesWithOutputs.forEach(node => {
        const nodeVariables = extractVariablePaths(node.output, `${node.id}.data`);
        nodeVariables.forEach(variable => {
          allVariables.push({
            ...variable,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type
          });
        });
      });
      
      setVariables(allVariables);
    } catch (error) {
      console.error('Error extracting variable references:', error);
      setVariables([]);
    } finally {
      setLoading(false);
    }
  }, [workflowNodes, workflowConnections, currentNodeId]);
  
  // Group variables by node
  const groupedVariables = variables.reduce((groups: Record<string, VariableReference[]>, variable) => {
    if (!groups[variable.nodeId]) {
      groups[variable.nodeId] = [];
    }
    groups[variable.nodeId].push(variable);
    return groups;
  }, {});
  
  return {
    variables,
    groupedVariables,
    loading
  };
};