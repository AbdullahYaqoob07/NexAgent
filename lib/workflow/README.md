# NexAgent Workflow Engine

A scalable, maintainable workflow engine built with Next.js and TypeScript.

## 🏗️ Architecture

### Folder Structure
```
lib/workflow/
├── types.ts                 # TypeScript interfaces and types
├── WorkflowManager.ts       # Main entry point
├── engine/
│   └── WorkflowEngine.ts    # Core execution engine
├── nodes/
│   ├── NodeRegistry.ts      # Node handler registry
│   ├── triggers/            # Trigger nodes
│   ├── actions/             # Action nodes
│   ├── logic/               # Logic nodes
│   ├── ai/                  # AI/ML nodes
│   └── data/                # Data processing nodes
├── storage/
│   └── StorageProvider.ts   # Storage implementations
└── utils/
    ├── WorkflowValidator.ts # Workflow validation
    └── ExecutionTracker.ts  # Execution tracking
```

## 🚀 Features

### Node Types

#### Triggers
- **HTTP Request Trigger** - Triggers workflow via HTTP
- **Schedule Trigger** - Time-based triggers with cron expressions

#### Actions
- **HTTP Request** - Make API calls to external services
- **Save Data** - Save data to storage (memory, localStorage, database)

#### Logic
- **If Condition** - Conditional logic with multiple operators

#### AI/ML
- **OpenAI Completion** - Generate text using OpenAI API

#### Data
- **JSON Parse** - Parse and validate JSON data

### Core Features
- ✅ **Async Execution** - Safe parallel and sequential node execution
- ✅ **Validation** - Comprehensive workflow and node validation
- ✅ **Error Handling** - Configurable error handling (stop/continue/retry)
- ✅ **Execution Tracking** - Detailed execution logs and metadata
- ✅ **Storage** - Modular storage layer (in-memory, localStorage)
- ✅ **TypeScript** - Full type safety and IntelliSense support
- ✅ **UI Components** - React execution page with Tailwind styling

## 📖 Usage

### Basic Usage

```typescript
import { workflowManager } from '@/lib/workflow/WorkflowManager';

// Create a workflow
const workflow = workflowManager.createWorkflow('My Workflow', 'Description');

// Add nodes
workflow.nodes = [
  {
    id: 'node_1',
    type: 'json_parse',
    name: 'Parse Input',
    config: { jsonString: '{{input}}' },
    // ... other properties
  }
];

// Execute workflow
const execution = await workflowManager.executeWorkflow(workflow, {
  input: '{"name": "John"}'
});

console.log(execution.status); // 'completed' | 'failed'
console.log(execution.output); // Workflow output
```

### Creating Custom Nodes

```typescript
import { NodeHandler, NodeCategory } from '@/lib/workflow/types';

export class CustomNode implements NodeHandler {
  type = 'custom_node';
  category = NodeCategory.ACTION;
  name = 'Custom Node';
  description = 'My custom node';

  inputs = [
    { id: 'input', name: 'Input', type: 'string', required: true }
  ];

  outputs = [
    { id: 'output', name: 'Output', type: 'string', required: true }
  ];

  configSchema = {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  };

  async execute(context: any, config: any) {
    return {
      success: true,
      result: `Processed: ${config.input}`,
      metadata: {
        executionTime: 100,
        tokensUsed: 0,
        cost: 0
      }
    };
  }

  validate(config: any) {
    // Validation logic
    return [];
  }
}

// Register the node
const registry = NodeRegistry.getInstance();
registry.registerHandler(new CustomNode());
```

### Storage Providers

```typescript
import { InMemoryStorageProvider, LocalStorageProvider } from '@/lib/workflow/storage/StorageProvider';

// In-memory storage (default)
const memoryStorage = new InMemoryStorageProvider();

// LocalStorage for browser
const localStorage = new LocalStorageProvider();

// Custom storage implementation
class DatabaseStorageProvider implements StorageProvider {
  // Implement storage methods
}
```

## 🎯 Execution Flow

1. **Validation** - Validate workflow structure and node configurations
2. **Dependency Resolution** - Find starting nodes and resolve execution order
3. **Node Execution** - Execute nodes in parallel where possible
4. **Error Handling** - Handle errors based on workflow settings
5. **Result Collection** - Collect outputs and metadata
6. **Persistence** - Save execution results to storage

## 🔧 Configuration

### Workflow Settings
```typescript
const workflow: Workflow = {
  // ... other properties
  settings: {
    timeout: 300000,        // 5 minutes
    retryCount: 3,          // Retry failed nodes 3 times
    errorHandling: 'stop',  // 'stop' | 'continue' | 'retry'
    concurrency: 1          // Max concurrent nodes
  }
};
```

### Execution Options
```typescript
const execution = await workflowManager.executeWorkflow(workflow, input, {
  timeout: 60000,           // Override workflow timeout
  retryCount: 5,            // Override retry count
  errorHandling: 'continue' // Override error handling
});
```

## 🎨 UI Components

### Execution Page
- **URL**: `/workflows/execution/[executionId]`
- **Features**:
  - Real-time execution status
  - Detailed node execution logs
  - Input/output data display
  - Performance metrics (tokens, cost, duration)
  - Error reporting

### Test Page
- **URL**: `/test-workflow`
- **Features**:
  - Create sample workflows
  - Execute workflows with custom input
  - View execution results
  - Navigate to detailed execution page

## 🧪 Testing

Visit `/test-workflow` to test the workflow engine with a sample workflow that:
1. Parses JSON input data
2. Generates AI response using OpenAI
3. Saves the result to storage

## 🔮 Future Enhancements

- [ ] Database storage provider
- [ ] More node types (Email, Slack, Database, etc.)
- [ ] Workflow scheduling
- [ ] Real-time execution monitoring
- [ ] Workflow templates
- [ ] Visual workflow editor integration
- [ ] Advanced error handling strategies
- [ ] Workflow versioning
- [ ] Performance optimization
- [ ] Webhook triggers

## 📝 API Reference

### WorkflowManager
- `createWorkflow(name, description)` - Create new workflow
- `saveWorkflow(workflow)` - Save workflow
- `loadWorkflow(id)` - Load workflow by ID
- `executeWorkflow(workflow, input, options)` - Execute workflow
- `getExecution(id)` - Get execution by ID
- `validateWorkflow(workflow)` - Validate workflow

### NodeHandler Interface
- `type` - Node type identifier
- `category` - Node category
- `name` - Human-readable name
- `description` - Node description
- `inputs` - Input port definitions
- `outputs` - Output port definitions
- `configSchema` - JSON schema for configuration
- `execute(context, config)` - Execute the node
- `validate(config)` - Validate configuration

## 🤝 Contributing

1. Create new node types in appropriate category folders
2. Implement the `NodeHandler` interface
3. Register the node in `NodeRegistry`
4. Add tests and documentation
5. Update this README

## 📄 License

This project is part of NexAgent and follows the same license terms.
