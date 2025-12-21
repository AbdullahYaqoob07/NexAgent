'use client';

import { useState } from 'react';
import VariableReferencePicker from '@/components/workflows/VariableReferencePicker';

export default function TestVariablePicker() {
  const [selectedVariable, setSelectedVariable] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Mock workflow data for testing
  const mockWorkflowNodes = [
    {
      id: 'manual_trigger_1',
      type: 'Manual Trigger',
      name: 'Start Workflow',
      position: { x: 100, y: 100 },
      config: {}
    },
    {
      id: 'http_request_1',
      type: 'HTTP Request',
      name: 'Fetch User Data',
      position: { x: 300, y: 100 },
      config: {}
    },
    {
      id: 'string_manipulation_1',
      type: 'String Manipulation',
      name: 'Format Name',
      position: { x: 500, y: 100 },
      config: {}
    }
  ];

  const mockWorkflowConnections = [
    {
      id: 'conn_1',
      sourceNodeId: 'manual_trigger_1',
      targetNodeId: 'http_request_1'
    },
    {
      id: 'conn_2',
      sourceNodeId: 'http_request_1',
      targetNodeId: 'string_manipulation_1'
    }
  ];

  return (
    <div className="p-8 bg-zinc-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Variable Picker Test</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Test Input Field</label>
        <div className="relative">
          <input
            type="text"
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value)}
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded"
            placeholder="Click the button to select a variable"
          />
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-zinc-700 hover:bg-zinc-600 p-1 rounded"
          >
            📋
          </button>
        </div>
        <p className="text-sm text-zinc-400 mt-1">
          Selected variable: {selectedVariable || 'None'}
        </p>
      </div>

      {showPicker && (
        <VariableReferencePicker
          workflowNodes={mockWorkflowNodes}
          workflowConnections={mockWorkflowConnections}
          currentNodeId="string_manipulation_1"
          workflowId="test_workflow_123"
          onSelect={(variablePath) => {
            setSelectedVariable(variablePath);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="mt-8 p-4 bg-zinc-800 rounded">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click the clipboard button to open the variable picker</li>
          <li>Browse available variables from previous nodes</li>
          <li>Click on a variable to insert it into the input field</li>
          <li>Try dragging a variable (drag-and-drop functionality)</li>
          <li>Use the search bar to filter variables</li>
        </ul>
      </div>
    </div>
  );
}