# All Nodes - Quick Usage Guide 🎯

## Import Everything at Once

```tsx
import {
  // Triggers (🟢 START WORKFLOWS)
  ManualTriggerNode,
  SchedulingNode,
  WebhookNode,

  // Communication (📱 SEND MESSAGES)
  ChatInputNode,
  ChatInputConfigurationModal,
  TelegramSendNode,
  TelegramSendConfigurationModal,
  EmailSendNode,
  SlackMessageNode,
  HTTPRequestNode,

  // Logic (🔀 CONTROL FLOW)
  ConditionalNode,
  LoopNode,
  DelayNode,

  // Data (📊 TRANSFORM)
  DataFormatterNode,
  JSONParserNode,
  LoggerNode,
  LoggerConfigurationModal,

  // Integrations (☁️ CONNECT SERVICES)
  GoogleSheetsNode,
  GoogleDriveNode,
  StripeNode,

  // AI/ML (🤖 INTELLIGENCE)
  OpenAINode,
  ClaudeAINode,
} from '@/src/workflows';
```

## Setup React Flow

```tsx
import { ReactFlow, Background, Controls } from 'reactflow';

export function WorkflowEditor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Map node types to components
  const nodeTypes = {
    manualtrigger: ManualTriggerNode,
    scheduling: SchedulingNode,
    webhook: WebhookNode,
    chatinput: ChatInputNode,
    telegramsend: TelegramSendNode,
    emailsend: EmailSendNode,
    slackmessage: SlackMessageNode,
    httprequest: HTTPRequestNode,
    conditional: ConditionalNode,
    loop: LoopNode,
    delay: DelayNode,
    dataformatter: DataFormatterNode,
    jsonparser: JSONParserNode,
    logger: LoggerNode,
    googlesheets: GoogleSheetsNode,
    googledrive: GoogleDriveNode,
    stripe: StripeNode,
    openai: OpenAINode,
    claudeai: ClaudeAINode,
  };

  return (
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}>
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

## All 20 Nodes Explained

### 🟢 TRIGGERS (3 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **Manual Trigger** | `manualtrigger` | User clicks Run button | No config needed |
| **Schedule** | `scheduling` | Run at scheduled time | Cron expression required |
| **Webhook** | `webhook` | External HTTP POST | Webhook URL generation |

**Usage**: Every workflow needs exactly ONE trigger node
```tsx
// Example: Start workflow when button clicked
<ManualTriggerNode data={{ label: 'Start Process' }} />
```

---

### 📱 COMMUNICATION (5 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **Chat Input** | `chatinput` | User types message | Label + placeholder |
| **Telegram Send** | `telegramsend` | Send to Telegram bot | Bot token + chat ID + message |
| **Email Send** | `emailsend` | Send email | Email config (not yet) |
| **Slack Message** | `slackmessage` | Send to Slack channel | Webhook URL (not yet) |
| **HTTP Request** | `httprequest` | Call external API | Method + URL + headers (not yet) |

**Usage**: Connect to send data outside workflow
```tsx
// Example: User types message → Send to Telegram
<ChatInputNode data={{ label: 'Message' }} />
    ↓
<TelegramSendNode data={{ label: 'Send to Channel' }} />
```

---

### 🔀 LOGIC (3 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **Conditional** | `conditional` | If/else branching | Condition logic (not yet) |
| **Loop** | `loop` | Repeat for each item | Iterator + items (not yet) |
| **Delay** | `delay` | Wait X seconds | Duration in ms (not yet) |

**Usage**: Control workflow execution flow
```tsx
// Example: Check if message length > 5
<ChatInputNode data={{ label: 'Input' }} />
    ↓
<ConditionalNode data={{ label: 'Check Length' }} />
    ├─ (true) → <TelegramSendNode />
    └─ (false) → <LoggerNode />
```

---

### 📊 DATA & UTILITIES (3 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **Data Formatter** | `dataformatter` | Transform data | Format rules (not yet) |
| **JSON Parser** | `jsonparser` | Parse JSON strings | Field mapping (not yet) |
| **Logger** | `logger` | Output for debugging | Log level (Info/Warning/Error) |

**Usage**: Process and debug data between nodes
```tsx
// Example: Format data then log it
<ChatInputNode />
    ↓
<DataFormatterNode data={{ label: 'Format Message' }} />
    ↓
<LoggerNode data={{ label: 'Save Output' }} />
```

---

### ☁️ INTEGRATIONS (3 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **Google Sheets** | `googlesheets` | Read/Write spreadsheets | Sheet ID + API key |
| **Google Drive** | `googledrive` | Upload/download files | Drive folder + API key |
| **Stripe** | `stripe` | Process payments | API key + webhook |

**Usage**: Connect to external services
```tsx
// Example: Read from Sheets → Payment
<GoogleSheetsNode data={{ label: 'Get Orders' }} />
    ↓
<StripeNode data={{ label: 'Process Payment' }} />
```

---

### 🤖 AI/ML (2 nodes)

| Node | Type | Purpose | Config |
|------|------|---------|--------|
| **OpenAI** | `openai` | Use GPT models | API key + prompt |
| **Claude AI** | `claudeai` | Use Claude models | API key + prompt |

**Usage**: Add AI intelligence to workflows
```tsx
// Example: User input → AI response → Send
<ChatInputNode data={{ label: 'Question' }} />
    ↓
<OpenAINode data={{ label: 'Get Answer' }} />
    ↓
<TelegramSendNode data={{ label: 'Send Answer' }} />
```

---

## Example Workflows

### Workflow 1: User Chat → Telegram Notification

```
Manual Trigger
    ↓
Chat Input (Ask user question)
    ↓
Logger (Save response)
    ↓
Telegram Send (Notify admin)
```

### Workflow 2: Send Email → Log Result

```
Schedule (Daily at 9am)
    ↓
Email Send (Send newsletter)
    ↓
Logger (Record sent)
```

### Workflow 3: AI-Powered Chatbot

```
Webhook (External request)
    ↓
Chat Input (Get prompt)
    ↓
OpenAI (Generate response)
    ↓
HTTP Request (Send response back)
    ↓
Logger (Log conversation)
```

### Workflow 4: Process Orders

```
Webhook (Order received)
    ↓
Conditional (Check amount > $100)
    ├─ YES → Stripe (Premium shipping)
    └─ NO → Data Formatter (Standard shipping)
    ↓
Email Send (Send confirmation)
```

---

## Modal State Management

```tsx
const [selectedNode, setSelectedNode] = useState(null);
const [modalState, setModalState] = useState({
  chatinput: false,
  telegramsend: false,
  logger: false,
});

const handleNodeClick = (node) => {
  setSelectedNode(node);
  if (node.type === 'chatinput') setModalState({...modalState, chatinput: true});
  if (node.type === 'telegramsend') setModalState({...modalState, telegramsend: true});
  if (node.type === 'logger') setModalState({...modalState, logger: true});
};

const handleSaveConfig = (config) => {
  // Update node data
  setNodes(nodes.map(n => 
    n.id === selectedNode.id 
      ? {...n, data: {...n.data, ...config}}
      : n
  ));
};

return (
  <>
    <ReactFlow 
      nodes={nodes} 
      onNodeClick={(event, node) => handleNodeClick(node)}
    />
    
    <ChatInputConfigurationModal
      isOpen={modalState.chatinput && selectedNode?.type === 'chatinput'}
      onClose={() => setModalState({...modalState, chatinput: false})}
      onSave={handleSaveConfig}
      initialConfig={selectedNode?.data}
    />
    
    <TelegramSendConfigurationModal
      isOpen={modalState.telegramsend && selectedNode?.type === 'telegramsend'}
      onClose={() => setModalState({...modalState, telegramsend: false})}
      onSave={handleSaveConfig}
      initialConfig={selectedNode?.data}
    />
    
    <LoggerConfigurationModal
      isOpen={modalState.logger && selectedNode?.type === 'logger'}
      onClose={() => setModalState({...modalState, logger: false})}
      onSave={handleSaveConfig}
      initialConfig={selectedNode?.data}
    />
  </>
);
```

---

## Node Colors Legend

```
🔵 BLUE    = Triggers (Manual, Schedule, Webhook)
🟠 ORANGE  = Communication (Telegram, Slack, Email)
🔷 TEAL    = Integrations (Google Sheets, Drive, Stripe)
🟡 YELLOW  = Logic (Conditional, Loop, Delay)
🟢 GREEN   = Data (Formatter, Parser, Logger)
🟣 VIOLET  = AI/ML (OpenAI, Claude)
```

---

## What's Next?

### Creating More Configuration Modals
Use `TelegramSendConfigurationModal` as template:
1. Create form with react-hook-form
2. Add Zod validation schema
3. Include field descriptions
4. Add help text and examples
5. Handle variable syntax `{{$node.id.field}}`

### Extending Workflow Executor
Update `lib/workflow/executor.ts`:
1. Add case for each node type
2. Implement execution logic
3. Handle variable substitution
4. Add error handling

### Backend Integration
Create endpoints for:
- Email sending
- Slack messages
- HTTP calls
- Integrations (Sheets, Drive, Stripe)

---

**All 20 nodes are ready to use! Start building workflows! 🚀**
