# NexAgent Workflow Architecture Analysis

## Executive Summary

Your NexAgent platform is a **workflow automation system** similar to n8n, Zapier, or Make.com. It allows users to:
1. **Visually design workflows** using a drag-and-drop canvas
2. **Configure nodes** with specific actions (send email, call API, etc.)
3. **Connect nodes** to define execution flow
4. **Execute workflows** with real-time step-by-step logging
5. **Schedule workflows** to run automatically

## System Architecture

### **Frontend (Next.js + React)**
- **Location**: `/app/workflows`, `/components/workflows/WorkflowCanvas.tsx`
- **Purpose**: Visual workflow builder UI
- **Key Features**:
  - Drag-and-drop canvas for creating workflows
  - Node library with 40+ node types
  - Visual connection system
  - Real-time execution visualization
  - Configuration modals for each node type

### **Backend (Python + FastAPI)**
- **Location**: `/backend/app/api/v1/workflows.py`
- **Purpose**: REST API for workflow management and execution
- **Key Endpoints**:
  - `POST /workflows` - Create workflow
  - `GET /workflows` - List workflows
  - `POST /workflows/{id}/execute` - Execute workflow
  - `GET /workflows/{id}/executions` - Get execution history

### **Execution Engines (TypeScript + Python)**

#### **TypeScript Engine** (Client-side)
- **Location**: `/lib/workflow/engine/AdvancedWorkflowEngine.ts`
- **Purpose**: Execute workflows in the browser for testing/preview
- **Features**:
  - Topological sort for execution order
  - Dependency resolution
  - Parallel execution support
  - Real-time step logging

#### **Python Engine** (Server-side - LangGraph)
- **Location**: `/lib/workflow/langgraph/orchestrator.py`
- **Purpose**: Production workflow execution with advanced features
- **Features**:
  - Checkpoint/resume capability
  - Circuit breakers for reliability
  - Error recovery strategies
  - Scheduled execution
  - Parallel execution coordination

## How Your Workflow System Works

### **1. Workflow Creation Flow**

```
User Action → Frontend Canvas → Backend API → Firestore Database
```

**Step-by-Step:**
1. User drags nodes from sidebar to canvas
2. User connects nodes by clicking output → input ports
3. User configures each node (e.g., API URL, email settings)
4. Frontend sends workflow data to backend:
   ```json
   {
     "name": "My Workflow",
     "nodes": [
       {
         "id": "node_1",
         "type": "HttpRequest",
         "config": { "url": "https://api.example.com" },
         "x": 100, "y": 100
       }
     ],
     "edges": [
       {
         "source": "node_1",
         "target": "node_2",
         "sourceHandle": "output",
         "targetHandle": "input"
       }
     ]
   }
   ```
5. Backend saves to Firestore with metadata (userId, timestamps, etc.)

### **2. Workflow Execution Flow**

```
Trigger Event → Backend API → LangGraph Orchestrator → Node Executors → Results
```

**Step-by-Step:**

#### **A. Execution Request**
```
POST /workflows/{id}/execute
{
  "input": { "someData": "value" },
  "config": { "timeout": 30000 }
}
```

#### **B. Backend Processing** (`workflows.py:517`)
1. **Load workflow** from Firestore
2. **Convert edge format**: `edges` → `connections`
3. **Check for Schedule node**:
   - If scheduled → Register with scheduler, return immediately
   - If manual → Continue to execution
4. **Pass to LangGraph orchestrator**

#### **C. LangGraph Orchestration** (`orchestrator.py`)
1. **Build execution graph**:
   - Parse all nodes and connections
   - Build dependency tree
   - Validate no cycles
   - Create topological sort order

2. **Execute nodes sequentially**:
   ```python
   for node in execution_plan:
       # Get node executor (HttpExecutor, EmailExecutor, etc.)
       executor = factory.create_executor(node.type, config)
       
       # Gather input from previous nodes
       input_data = gather_input_from_connections(node)
       
       # Execute with retries and circuit breakers
       result = await executor.execute(input_data)
       
       # Store output for next nodes
       store_output(node.id, result)
       
       # Log step completion
       log_execution_step(node, result)
   ```

3. **Handle special nodes**:
   - **Fork nodes**: Execute branches in parallel
   - **If nodes**: Route based on condition
   - **Loop nodes**: Repeat execution
   - **Merge nodes**: Combine parallel results

#### **D. Node Execution** (`nodes/` directory)
Each node type has an executor class:
- **HttpRequest**: Makes HTTP calls
- **Email**: Sends emails via SMTP
- **OpenAI**: Calls GPT API
- **Logger**: Logs data
- **Database**: Queries databases
- **Timer**: Waits/delays
- **Boolean**: Evaluates conditions

Example executor structure:
```python
class HttpRequestExecutor(BaseNodeExecutor):
    async def _execute_impl(self, input_data: Any) -> Any:
        url = self.config.get('url')
        method = self.config.get('method', 'GET')
        headers = self.config.get('headers', {})
        body = self.config.get('body')
        
        # Make HTTP request
        response = await http_client.request(
            method=method,
            url=url,
            headers=headers,
            json=body
        )
        
        return {
            'status': response.status_code,
            'data': response.json(),
            'headers': dict(response.headers)
        }
```

#### **E. Return Results**
```json
{
  "status": "completed",
  "execution_id": "exec_123",
  "node_logs": [
    {
      "nodeId": "node_1",
      "nodeName": "Fetch Data",
      "status": "completed",
      "output": { "data": "..." },
      "duration": 1250
    }
  ],
  "final_output": { "result": "..." }
}
```

### **3. Frontend Execution Visualization**

When user clicks "Run Workflow":
1. Frontend calls backend API
2. Backend streams execution logs back (or polls for status)
3. Frontend highlights nodes as they execute:
   - **Yellow/pulsing**: Currently executing
   - **Green**: Successfully completed
   - **Red**: Failed
4. Shows execution logs in sidebar panel

## Available Node Types

### **Triggers** (Start workflow)
- `OnClickExecuteTrigger` - Manual trigger
- `ScheduleTrigger` - Cron-based scheduling
- `WebhookTrigger` - HTTP webhook
- `EmailTrigger` - Email received
- `DatabaseTrigger` - DB changes

### **Actions** (Do something)
- `HttpRequest` - Call APIs
- `Email` - Send emails
- `Slack` - Post to Slack
- `Database` - Query/modify DB
- `Logger` - Log data
- `VariableSetter` - Set variables
- `OpenAI` - Call GPT

### **Logic** (Control flow)
- `If` - Conditional branching
- `Switch` - Multi-way branching
- `DoubleFork` / `TripleFork` - Parallel execution
- `Loop` - Repeat actions
- `Merge` - Combine parallel results
- `Timer` - Delay execution
- `Counter` - Count iterations

### **Data** (Transform data)
- `DataTransform` - Transform JSON
- `DataFilter` - Filter arrays
- `JsonParse` - Parse JSON
- `CsvParse` - Parse CSV
- `StringManipulation` - String ops

### **E-commerce**
- `Shopify` - Shopify API
- `Instagram` - Instagram API
- `Facebook` - Facebook API
- `WhatsApp` - WhatsApp API

## Making Nodes Actually Work

### **Current State**
✅ **Working**:
- Workflow creation and saving
- Visual canvas and connections
- Node configuration UI
- TypeScript execution engine (client-side testing)
- Backend API infrastructure
- LangGraph orchestrator framework

❌ **Not Fully Implemented**:
- **Node executor implementations** - Many nodes return mock data
- **API key management** - Missing secure credential storage
- **Real external API calls** - Nodes need actual HTTP/SMTP/etc. calls
- **Error handling** - Need proper try/catch and retries
- **Data transformation** - Variable substitution between nodes

### **What Needs to Be Done**

#### **1. Implement Node Executors**

Each node in `/lib/workflow/langgraph/nodes/` needs:

**Example: HttpRequestExecutor** (currently basic)
```python
# Current (incomplete):
class HttpRequestExecutor(BaseNodeExecutor):
    async def _execute_impl(self, input_data: Any) -> Any:
        # TODO: Implement actual HTTP request
        return {"mock": "data"}

# Needs to be:
import aiohttp

class HttpRequestExecutor(BaseNodeExecutor):
    async def _execute_impl(self, input_data: Any) -> Any:
        url = self.config.get('url')
        method = self.config.get('method', 'GET')
        headers = self.config.get('headers', {})
        body = self.config.get('body', {})
        
        # Substitute variables from context
        url = self.substitute_variables(url, input_data)
        headers = self.substitute_variables(headers, input_data)
        body = self.substitute_variables(body, input_data)
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                json=body if method in ['POST', 'PUT'] else None
            ) as response:
                return {
                    'status': response.status,
                    'statusText': response.reason,
                    'headers': dict(response.headers),
                    'data': await response.json()
                }
```

#### **2. Variable Substitution System**

Nodes need to reference data from previous nodes:
```python
class BaseNodeExecutor:
    def substitute_variables(self, template: Any, context: Dict) -> Any:
        """
        Replace {{node_id.field}} with actual values
        Example: "Hello {{node_1.output.name}}" → "Hello John"
        """
        if isinstance(template, str):
            import re
            pattern = r'\{\{([^}]+)\}\}'
            def replacer(match):
                path = match.group(1)  # e.g., "node_1.output.name"
                value = self.get_nested_value(context, path)
                return str(value) if value is not None else match.group(0)
            return re.sub(pattern, replacer, template)
        elif isinstance(template, dict):
            return {k: self.substitute_variables(v, context) for k, v in template.items()}
        elif isinstance(template, list):
            return [self.substitute_variables(item, context) for item in template]
        return template
    
    def get_nested_value(self, data: Dict, path: str) -> Any:
        """Get value from nested dict using dot notation"""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value
```

#### **3. Credential Management**

Store API keys securely:
```python
# In backend/app/services/credentials_service.py
class CredentialsService:
    def get_credential(self, user_id: str, credential_name: str) -> Dict:
        """Get encrypted credential from Firestore"""
        doc = db.collection('users').document(user_id)\
               .collection('credentials').document(credential_name).get()
        if doc.exists:
            encrypted = doc.to_dict()['value']
            return self.decrypt(encrypted)
        return None
    
    def decrypt(self, encrypted: str) -> str:
        # Use Fernet or AWS KMS for decryption
        from cryptography.fernet import Fernet
        key = os.environ.get('ENCRYPTION_KEY')
        f = Fernet(key)
        return f.decrypt(encrypted.encode()).decode()
```

#### **4. Complete All Node Implementations**

Priority order:
1. **HttpRequest** - Most versatile, enables API calls
2. **Logger** - For debugging
3. **VariableSetter** - Store data between nodes
4. **If/Switch** - Conditional logic
5. **Email** - Common use case
6. **OpenAI** - AI features
7. **Database** - Data persistence
8. **Slack** - Notifications
9. **Shopify/E-commerce** - Business use cases

#### **5. Add Error Handling**

```python
class BaseNodeExecutor:
    async def execute(self, input_data: Any) -> Any:
        try:
            # Apply circuit breaker
            if self.circuit_breaker.is_open():
                raise Exception("Circuit breaker open - service unavailable")
            
            # Execute with timeout
            result = await asyncio.wait_for(
                self._execute_impl(input_data),
                timeout=self.timeout
            )
            
            self.circuit_breaker.record_success()
            return result
            
        except asyncio.TimeoutError:
            self.circuit_breaker.record_failure()
            if self.retry_count < self.max_retries:
                await asyncio.sleep(self.retry_delay)
                return await self.execute(input_data)
            raise Exception(f"Node timeout after {self.timeout}s")
        
        except Exception as e:
            self.circuit_breaker.record_failure()
            logger.error(f"Node execution failed: {str(e)}")
            raise
```

## Next Steps

### **Immediate (Fix Error)**
✅ Fixed config.py to allow extra env variables

### **Short Term (Make Nodes Work)**
1. **Implement HttpRequestExecutor** completely
2. **Add variable substitution system**
3. **Test with real API** (e.g., JSONPlaceholder)
4. **Add Logger node** for debugging
5. **Test end-to-end**: Create workflow → Save → Execute → See results

### **Medium Term (Production Ready)**
1. **Implement all 40+ node executors**
2. **Add credential management** (encrypted storage)
3. **Add webhook infrastructure** for triggers
4. **Implement scheduler** for cron jobs
5. **Add execution history** (store logs in Firestore)
6. **Add monitoring** (failure alerts, metrics)

### **Long Term (Advanced Features)**
1. **Parallel execution** optimization
2. **Error recovery** and retry strategies
3. **Version control** for workflows
4. **Workflow templates** marketplace
5. **AI-assisted** workflow creation
6. **Collaboration** features (share workflows)

## Example: Creating a Working Workflow

### **Workflow: "Fetch Weather and Send Email"**

**Nodes:**
1. **Trigger**: OnClickExecute
2. **HttpRequest**: Call weather API
3. **If**: Check if temperature > 80°F
4. **Email**: Send alert

**Configuration:**

```json
{
  "nodes": [
    {
      "id": "trigger_1",
      "type": "OnClickExecuteTrigger",
      "name": "Start",
      "config": {}
    },
    {
      "id": "http_1",
      "type": "HttpRequest",
      "name": "Get Weather",
      "config": {
        "url": "https://api.weather.gov/gridpoints/TOP/31,80/forecast",
        "method": "GET"
      }
    },
    {
      "id": "if_1",
      "type": "If",
      "name": "Check Temperature",
      "config": {
        "condition": "{{http_1.output.data.temperature}} > 80"
      }
    },
    {
      "id": "email_1",
      "type": "Email",
      "name": "Send Alert",
      "config": {
        "to": "user@example.com",
        "subject": "High Temperature Alert",
        "body": "Temperature is {{http_1.output.data.temperature}}°F"
      }
    }
  ],
  "edges": [
    { "source": "trigger_1", "target": "http_1" },
    { "source": "http_1", "target": "if_1" },
    { "source": "if_1", "target": "email_1", "sourceHandle": "output_true" }
  ]
}
```

**Execution:**
1. User clicks "Run"
2. Backend executes:
   - ✅ Start trigger
   - ✅ Call weather API → Get temp: 85°F
   - ✅ Evaluate condition: 85 > 80 = true
   - ✅ Send email with "Temperature is 85°F"
3. Return success with logs

## Files to Focus On

### **To Make Nodes Work:**
- `/lib/workflow/langgraph/nodes/` - Implement all executors
- `/lib/workflow/langgraph/executor_factory.py` - Factory pattern
- `/lib/workflow/langgraph/orchestrator.py` - Main execution logic
- `/backend/app/api/v1/workflows.py` - API endpoints

### **Frontend (Already Working):**
- `/components/workflows/WorkflowCanvas.tsx` - Visual builder
- `/lib/workflow/engine/AdvancedWorkflowEngine.ts` - Client execution
- `/lib/workflow/engine/nodes/` - TypeScript node implementations

### **Configuration:**
- `/backend/.env` - Environment variables
- `/backend/app/core/config.py` - Settings (just fixed!)

## Summary

Your workflow system has a **solid foundation** with:
- ✅ Visual workflow builder
- ✅ Backend API infrastructure
- ✅ Orchestration framework
- ✅ Database storage

**What's missing** is the **actual node logic** - the real HTTP calls, email sending, AI API calls, etc. The orchestrator framework is ready, but each node just returns mock data instead of performing real actions.

**Focus on**: Implementing the execute methods in `/lib/workflow/langgraph/nodes/` with real external API calls, proper error handling, and variable substitution.
