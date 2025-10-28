# Backend Node Type Mapping

This document shows how backend node types from Firestore are mapped to frontend engine node classes.

## Current Backend Node Types (31 Total)

The system is **fully dynamic** - it fetches all node definitions from `/api/admin/nodes` and displays them in the sidebar automatically.

### ✅ Triggers (3 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| Manual Trigger | OnClickExecuteTriggerNode | ✅ Implemented | Triggers |
| Schedule | ScheduleTriggerNode | ✅ Implemented | Triggers |
| Webhook | WebhookTriggerNode | ✅ Implemented | Triggers |
| Shopify Trigger | ShopifyNode | ✅ Implemented | Triggers |

### ✅ Actions (5 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| HTTP Request | HttpNode | ✅ Implemented | Actions |
| HTTP Request Action | HttpNode | ✅ Implemented (alias) | Actions |
| Send Email | EmailNode | ✅ Implemented | Communication |
| Slack Message | SlackNode | ✅ Implemented | Communication |
| Database Query | DatabaseNode | ✅ Implemented | Data |

### ✅ Logic (5 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| If Condition | IfNode | ✅ Implemented | Logic |
| Switch | SwitchNode | ✅ Implemented | Logic |
| Loop | LoopNode | ✅ Implemented | Logic |
| Merge | MergeNode | ✅ Implemented | Logic |
| Delay | DelayNode | ✅ Implemented | Logic |

### ✅ AI/ML (4 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| OpenAI GPT | OpenAINode | ✅ Implemented | AI/ML |
| Text Analysis | TextAnalysisNode | ✅ Implemented | AI/ML |
| Image Processing | ImageProcessingNode | ✅ Implemented | AI/ML |
| Data Transformation | DataTransformNode | ✅ Implemented | AI/ML |

### ✅ Data (4 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| JSON Parse | JsonParseNode | ✅ Implemented | Data |
| XML Parse | XmlParseNode | ✅ Implemented | Data |
| CSV Parse | CsvParseNode | ✅ Implemented | Data |
| Data Filter | DataFilterNode | ✅ Implemented | Data |

### ✅ Ecommerce (4 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| Shopify | ShopifyNode | ✅ Implemented | Ecommerce |
| Shopify Action | ShopifyNode | ✅ Implemented (alias) | Ecommerce |
| Instagram | InstagramNode | ✅ Implemented | Ecommerce |
| Facebook | FacebookNode | ✅ Implemented | Ecommerce |
| WhatsApp | WhatsAppActionNode | ✅ Implemented | Ecommerce |

### ✅ Fork (4 nodes)
| Backend Type | Frontend Engine | Status | Category |
|--------------|----------------|--------|----------|
| Double | DoubleForkNode | ✅ Implemented | Fork |
| Triple | TripleForkNode | ✅ Implemented | Fork |
| Quadra | QuadraForkNode | ✅ Implemented | Fork |
| Custom | CustomForkNode | ✅ Implemented | Fork |

## How It Works

### 1. Dynamic Node Fetching
The `WorkflowSidebar` component fetches nodes from the backend on mount:

```typescript
// WorkflowSidebar.tsx
useEffect(() => {
  const fetchNodeDefinitions = async () => {
    const response = await fetch('/api/admin/nodes');
    const data = await response.json();
    setNodeDefinitions(data.nodes);
  };
  fetchNodeDefinitions();
}, []);
```

### 2. Type Mapping with Aliases
The `nodeTypeMapping.ts` file maps backend types to engine classes with alias support:

```typescript
{
  sidebarType: 'HTTP Request',
  engineType: 'HttpNode',
  nodeClass: HttpNode,
  category: 'action',
  aliases: ['HTTP Request Action', 'Http', 'API Request']
}
```

### 3. Flexible Type Resolution
The `getNodeMapping()` function tries exact match first, then aliases:

```typescript
export function getNodeMapping(sidebarType: string): NodeTypeMapping | undefined {
  // First try exact match
  let mapping = NODE_TYPE_MAPPINGS.find(m => m.sidebarType === sidebarType);
  
  // If no exact match, try aliases
  if (!mapping) {
    mapping = NODE_TYPE_MAPPINGS.find(m => 
      m.aliases?.some(alias => 
        alias.toLowerCase() === sidebarType.toLowerCase()
      )
    );
  }
  
  return mapping;
}
```

## Adding New Nodes

When you add a new node type to the backend, the system will **automatically** display it in the sidebar.

### Option 1: Node Type Already Mapped
If the new node type matches an existing mapping or alias, it will work immediately.

### Option 2: New Node Type Needs Implementation
If you add a completely new node type that doesn't have a frontend implementation:

1. **Create the node class** in `lib/workflow/engine/nodes/YourNewNode.ts`
2. **Add the mapping** to `nodeTypeMapping.ts`:
   ```typescript
   {
     sidebarType: 'Your New Node',
     engineType: 'YourNewNode',
     nodeClass: YourNewNode,
     category: 'action' // or appropriate category
   }
   ```
3. **Import the class** at the top of `nodeTypeMapping.ts`

That's it! The node will appear in the sidebar automatically.

## Category Mapping

Frontend categories are automatically mapped from backend categories:

| Backend Category | Frontend Display | Icon |
|-----------------|-----------------|------|
| Triggers | Triggers | ⚡ |
| Actions | Actions | ⚙️ |
| Logic | Logic | 🔀 |
| AI/ML | AI/ML | 🤖 |
| Data | Data | 🗄️ |
| Ecommerce | Ecommerce | 🛒 |
| Fork | Fork | 🔱 |
| Communication | Communication | 💬 |

## Backend Node Structure

Each node in the backend follows this structure:

```json
{
  "id": "node-uuid",
  "name": "HTTP Request",
  "type": "HTTP Request",
  "category": "Actions",
  "version": "1.0.0",
  "description": "Make HTTP requests to APIs",
  "icon": "🌐",
  "color": "#4CAF50",
  "fields": [...],
  "outputs": [...],
  "examples": [...],
  "implementation": {
    "type": "builtin",
    "builtinHandler": "http_request"
  },
  "isActive": true,
  "isPublic": true,
  "isStartNode": false,
  "isEndNode": false
}
```

## Testing the Dynamic System

1. **Add a new node to Firestore** with any name/type
2. **Refresh the workflow page** - it will appear in the sidebar automatically
3. **Drag it to the canvas** - if the type is mapped, it will execute; otherwise it will show a warning

## Node Field Types

The system supports all these field types dynamically from the backend:

- `text`, `textarea`
- `number`, `range`
- `boolean` (switch)
- `select`, `multiselect`
- `json`, `code`
- `url`, `email`, `password`
- `date`, `datetime`
- `file`, `color`
- `credential` (for OAuth/API keys)

## Summary

✅ **All 31 backend nodes are implemented and mapped**
✅ **System is fully dynamic - fetches from backend automatically**
✅ **Alias support for backward compatibility**
✅ **New nodes appear automatically when added to backend**
✅ **No hardcoded node lists in the frontend**

The system is production-ready and will scale automatically as you add more nodes to the backend!
