# Node Structure Quick Reference

## 📁 Folder Layout

```
src/workflows/
│
├── 📄 index.ts                  ← Import nodes from here
├── 📖 README.md                 ← Developer guide
│
├── 📂 telegram/
│   ├── telegramsendnode.tsx            ← Canvas visualization (light theme)
│   └── telegramsendconfigurationmodal.tsx ← Config form (dark modal)
│
├── 📂 chatinput/
│   ├── chatinputnode.tsx              ← Canvas visualization
│   └── chatinputconfigurationmodal.tsx  ← Config form
│
└── 📂 logger/
    ├── loggernode.tsx                 ← Canvas visualization
    └── loggerconfigurationmodal.tsx   ← Config form
```

All nodes in `src/workflows/` follow same pattern:
- **`{name}node.tsx`**: React Flow node component (light, displayed on canvas)
- **`{name}configurationmodal.tsx`**: Configuration modal (dark, form-based)

## 🎯 Quick Integration

### Step 1: Import Nodes
```tsx
import {
  TelegramSendNode,
  TelegramSendConfigurationModal,
  ChatInputNode,
  ChatInputConfigurationModal,
  LoggerNode,
  LoggerConfigurationModal,
} from '@/src/workflows';
```

### Step 2: Setup React Flow
```tsx
const nodeTypes = {
  telegram: TelegramSendNode,
  chatinput: ChatInputNode,
  logger: LoggerNode,
};

<ReactFlow nodes={nodes} nodeTypes={nodeTypes} />
```

### Step 3: Render Modals
```tsx
<TelegramSendConfigurationModal
  isOpen={selectedNode?.type === 'telegram'}
  onClose={() => setSelectedNode(null)}
  onSave={updateNodeConfig}
  initialConfig={selectedNode?.data}
  nodeName={selectedNode?.data?.label}
/>
```

## 🎨 Node Colors & Icons

| Node | Folder | Color | Icon | Use |
|------|--------|-------|------|-----|
| **Telegram Send** | `telegram/` | 🟠 Orange | `Send` | Send messages to Telegram |
| **Chat Input** | `chatinput/` | 🔵 Blue | `MessageCircle` | Get user input |
| **Logger** | `logger/` | 🟣 Purple | `FileText` | Log/debug outputs |

## 📦 Node Database Structure

Each node when saved in database should have:

```json
{
  "id": "telegram_1",
  "type": "telegram",
  "label": "Send to Channel",
  "position": { "x": 250, "y": 50 },
  "data": {
    "nodeId": "telegram_1",
    "label": "Send to Channel",
    "botToken": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chatId": "-1001234567890",
    "message": "Hello {{$node.chatinput_1.message}}",
    "parseMode": "HTML",
    "disableNotification": false,
    "protectContent": false,
    "isConfigured": true
  }
}
```

## 🚀 Adding New Nodes

For each new node, create:

```bash
mkdir src/workflows/{nodetype}/
touch src/workflows/{nodetype}/{nodetype}node.tsx
touch src/workflows/{nodetype}/{nodetype}configurationmodal.tsx
```

Then:
1. Copy template from `src/workflows/README.md`
2. Customize color scheme
3. Add form fields in modal
4. Export in `src/workflows/index.ts`
5. Register in `lib/workflow/NodeRegistry.ts`

Estimated time per new node: **15-20 minutes**

## 🔗 Current Workflow Status

### ✅ Completed
- Telegram Send Node
- Chat Input Node
- Logger Node
- Node templates & guides
- Barrel exports

### ⏳ Next Priority (In Order)
1. **Manual Trigger** Node - Entry point for workflows
2. **Email Send** Node - Communication
3. **HTTP Request** Node - Integration
4. **Data Formatter** Node - Transformation
5. **Slack Send** Node - Communication

### 🚧 Infrastructure Done
- ✅ Variable replacement system (`lib/workflow/utils/variableReplacer.ts`)
- ✅ Workflow executor (`lib/workflow/executor.ts`)
- ✅ Telegram backend endpoint (`backend/app/api/v1/telegram.py`)
- ✅ Zod validation schemas
- ✅ Node registry system (`lib/workflow/NodeRegistry.ts`)

## 📝 File Patterns

### Node Component (`{name}node.tsx`)
```
Lines 1-20:    Imports & interfaces
Lines 21-30:   Component function & props
Lines 31-50:   JSX structure (icon, label, badge)
Lines 51-56:   React Flow handles
```

### Configuration Modal (`{name}configurationmodal.tsx`)
```
Lines 1-20:    Imports & schema
Lines 21-40:   Component props & hooks setup
Lines 41-70:   Modal header (icon, title, close button)
Lines 71-150:  Form fields with validation
Lines 151-170: Footer with buttons
Lines 171-end: Conditional render check
```

## 🎯 Example: Complete Workflow

```
┌─────────────────────────────────────────────────────────┐
│ WORKFLOW: "Send Chat to Telegram"                       │
└─────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │  Manual Trigger  │   (Not yet created)
  │  🟢 Start        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Chat Input      │   (Created ✅)
  │  💬 User message │
  └────────┬─────────┘
           │ {{$node.chat_1.message}}
           ▼
  ┌──────────────────┐
  │  Filter Logic    │   (Not yet created)
  │  ❓ Check length │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Telegram Send   │   (Created ✅)
  │  🟠 Send message │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │  Logger          │   (Created ✅)
  │  📋 Log output   │
  └──────────────────┘
```

## 🔄 Variable Syntax

| Format | Description | Example |
|--------|-------------|---------|
| `{{$trigger.x}}` | Trigger input | `{{$trigger.userId}}` |
| `{{$node.id.x}}` | Node output | `{{$node.chat_1.message}}` |
| `{{$vars.x}}` | Global variables | `{{$vars.maxLength}}` |
| `{{$node.id.data.x}}` | Nested output | `{{$node.http_1.data.user.name}}` |

## 📊 Stats

- **Total Nodes Created**: 3 (Telegram, ChatInput, Logger)
- **Lines of Code**: ~500 lines
- **Components**: 6 (3 nodes + 3 modals)
- **Files Created**: 7 (+ 2 docs)
- **Pattern Established**: Yes ✅
- **Ready for 47+ more nodes**: Yes ✅
- **Est. time to add 1 more node**: 15-20 min

---

**Next Task**: Wire these into workflow editor and test the complete flow!
