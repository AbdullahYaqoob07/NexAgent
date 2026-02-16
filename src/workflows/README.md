# Node Structure Guide - NexAgent

## Folder Organization

The workflow nodes are now organized in a scalable folder structure:

```
src/workflows/
├── index.ts                          # Barrel export for all nodes
├── telegram/
│   ├── telegramsendnode.tsx         # ✅ Node visualization component
│   └── telegramsendconfigurationmodal.tsx  # ✅ Configuration form modal
├── chatinput/
│   ├── chatinputnode.tsx            # ✅ Node visualization component
│   └── chatinputconfigurationmodal.tsx     # ✅ Configuration form modal
├── logger/
│   ├── loggernode.tsx               # ✅ Node visualization component
│   └── loggerconfigurationmodal.tsx        # ✅ Configuration form modal
└── (other node types follow same pattern)
```

## File Naming Convention

For each node type:
1. **Node Component**: `{nodeType}node.tsx`
   - Displays the visual representation on the workflow canvas
   - Handles selection, connection points, styling
   - React Flow `<Node>` component

2. **Configuration Modal**: `{nodeType}configurationmodal.tsx`
   - Form with all configurable fields
   - Validation using Zod or react-hook-form
   - Variable preview and syntax highlighting

## Node Component Template

```tsx
'use client';

import { Handle, Node, NodeProps, Position } from 'reactflow';
import { IconComponent } from 'lucide-react';
import { Node as NodeType } from '@/lib/workflow/types';

interface CustomNodeData extends NodeType {
  data: {
    label: string;
    nodeId: string;
    isConfigured?: boolean;
    // Add other config fields as needed
  };
}

export function CustomNode({ data, selected, isConnecting }: NodeProps<CustomNodeData>) {
  const isConfigured = data.data?.isConfigured ?? false;

  return (
    <div
      className={`px-4 py-3 rounded-lg bg-white border-2 transition-all duration-200 ${
        selected
          ? 'border-[COLOR]-500 shadow-lg shadow-[COLOR]-500/30'
          : isConfigured
            ? 'border-[COLOR]-300'
            : 'border-gray-300'
      } ${isConnecting ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isConfigured ? 'bg-[COLOR]-100' : 'bg-gray-100'}`}>
          <IconComponent className={`w-5 h-5 ${isConfigured ? 'text-[COLOR]-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">{data.data?.label || 'Node Name'}</h3>
          <p className="text-xs text-gray-500">Description</p>
        </div>
        {isConfigured && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">✓ Ready</span>
        )}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### Color Scheme for Node Types

| Node Type | Color | Icon |
|-----------|-------|------|
| Triggers | Blue (`#3B82F6`) | Activity |
| Communication (Telegram, Email, Slack) | Orange (`#F97316`) | Send |
| Chat/Input | Blue (`#3B82F6`) | MessageCircle |
| Logger/Output | Purple (`#8B5CF6`) | FileText |
| Logic/Conditions | Amber (`#FBBF24`) | GitBranch |
| Data Transform | Green (`#10B981`) | Zap |
| AI/ML | Purple (`#8B5CF6`) | Brain |

## Configuration Modal Template

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Info, AlertCircle } from 'lucide-react';

const configSchema = z.object({
  label: z.string().min(1, 'Label required'),
  // Add other fields
});

type ConfigType = z.infer<typeof configSchema>;

interface CustomConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConfigType) => void;
  initialConfig?: Partial<ConfigType>;
  nodeName?: string;
}

export function CustomConfigurationModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  nodeName = 'Node Name',
}: CustomConfigurationModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConfigType>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      label: initialConfig?.label || '',
    },
  });

  const onSubmit = (data: ConfigType) => {
    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[COLOR]-500/20 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{nodeName}</h2>
              <p className="text-sm text-gray-400">Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fields here */}
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800 bg-gray-950">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="flex-1 bg-[COLOR]-600">
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## Adding a New Node Type

Follow these steps to add a new node type:

### 1. Create Node Folder
```bash
mkdir src/workflows/mynodetype/
```

### 2. Create Node Component
File: `src/workflows/mynodetype/mynodetypenod.tsx`
- Extend from template above
- Use appropriate color scheme
- Define TypeScript interfaces for node data

### 3. Create Configuration Modal
File: `src/workflows/mynodetype/mynodotypeconfigurationmodal.tsx`
- Create Zod schema for validation
- Use form hooks (react-hook-form + zod)
- Include helpful descriptions and examples

### 4. Create Node Schema (if needed)
File: `lib/workflow/nodes/{nodeType}/schema.ts`
- Define Zod validation schema
- Export for use in backend validation
- Example: `lib/workflow/nodes/telegram/schema.ts`

### 5. Create Executor Logic (if needed)
File: `lib/workflow/executor/{nodeType}.ts` or extend `lib/workflow/executor.ts`
- Handle execution logic for the node
- Variable replacement and data transformation
- Error handling and retries

### 6. Update Exports
Edit `src/workflows/index.ts`:
```tsx
// MyNodeType
export { MyNodeTypeNode } from './mynodetype/mynodetypenod';
export { MyNodeTypeConfigurationModal } from './mynodetype/mynodotypeconfigurationmodal';
```

### 7. Register in Node Registry
Edit `lib/workflow/NodeRegistry.ts`:
```tsx
{
  type: 'mynodetype',
  label: 'My Node Type',
  category: 'communication',
  icon: MyIcon,
  description: 'Description of what this node does',
}
```

## Styling Guidelines

### Dark Theme Configuration Modal
- Background: `bg-gray-900`
- Header: `bg-gray-950`
- Borders: `border-gray-800`
- Text: `text-white`, `text-gray-400`, `text-gray-500`
- Input: `bg-gray-800 border-gray-700`
- Focus: `focus:ring-2 focus:ring-[COLOR]-500`

### Light Theme Node Component
- Background: `bg-white`
- Border: `border-gray-300` or `border-[COLOR]-300`
- Text: `text-gray-900`, `text-gray-500`
- Icon Background: `bg-[COLOR]-100`
- Icon Color: `text-[COLOR]-600`

## Variable System Integration

For nodes that use variables:

```tsx
import { extractVariables, validateVariableSyntax } from '@/lib/workflow/utils/variableReplacer';

// In your modal component
const variables = extractVariables(message);
const validation = validateVariableSyntax(message);

// Show errors if validation fails
if (validation.errors.length > 0) {
  // Display errors
}
```

Supported variable formats:
- `{{$trigger.fieldName}}` - Trigger node outputs
- `{{$node.nodeId.fieldName}}` - Other node outputs
- `{{$vars.variableName}}` - Global variables
- Nested paths: `{{$node.nodeName.data.nested.path}}`

## Documentation for Each Node

Create a companion markdown file for each node:

File: `src/workflows/{nodetype}/README.md`

```markdown
# {NodeType} Node

## Overview
Description of what this node does and its use cases.

## Configuration Fields
- **Field 1**: Description
- **Field 2**: Description

## Output
Description of what this node outputs and how to reference it in other nodes.

## Example
```
{{$node.{nodeId}.{fieldName}}}
```

## Use Cases
- Use case 1
- Use case 2
```

## Testing

Each node should have:
1. Unit tests for configuration validation
2. Integration tests with workflow executor
3. Example workflows in `lib/workflow/examples/`

## Current Status

✅ **COMPLETED**:
- TelegramSend Node & Modal
- ChatInput Node & Modal
- Logger Node & Modal
- Barrel export (index.ts)
- Node templates and guidelines

**NEXT PRIORITY NODES**:
1. Email Send (Communication)
2. HTTP Request (Integration)
3. Data Formatter (Data)
4. Slack Send (Communication)
5. If/Else Logic (Logic)

Follow this structure for consistency and scalability! 🚀
