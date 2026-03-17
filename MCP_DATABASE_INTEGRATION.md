# MCP Database Integration Guide

## Overview

This implementation enables **ALL AI Nodes** (OpenAI, Claude, Gemini, Groq) to access databases through MCP (Model Context Protocol) tools, while keeping the deterministic workflow engine completely separate.

### Architecture

```
┌─────────────────────────────────────────┐
│     Workflow Request (API Layer)        │
│     POST /api/v1/workflows/{id}/execute │
└──────────────────┬──────────────────────┘
                   │
                   v
        ┌──────────────────────┐
        │ ExecutionEnvironment │
        │  - Init databases    │
        │  - Setup MCP client  │
        │  - Create context    │
        └──────────┬───────────┘
                   │
                   v
     ┌─────────────────────────────┐
     │   WorkflowEngine.execute()  │
     │ (Deterministic Layer)       │
     └─────────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         v                   v
    Deterministic       AI Agent Nodes
    Nodes              (OpenAI, Claude, etc)
    - Logger                │
    - Delay                 v
    - Loop            ┌──────────────┐
    - IfCondition    │  MCP Client  │
    - HttpRequest    └────────┬─────┘
    - JsonParser             │
                             v
                    ┌────────────────┐
                    │ MCP Tool Calls │
                    │ - query_database
                    │ - list_tables
                    │ - get_schema
                    └────────┬───────┘
                             │
                   ┌─────────┴─────────┬──────────┐
                   │                   │          │
                   v                   v          v
              PostgreSQL          MongoDB    Pinecone
```

## Files Created

### 1. Database Clients (`backend/executor/databases/`)

#### `base.py`
Abstract base class for all database clients with standard interface:
- `async connect()`
- `async disconnect()`
- `async execute(query, params)`
- `async health_check()`

#### `postgres.py`
PostgreSQL async client using `asyncpg`:
```python
client = PostgresClient("postgresql://user:pass@host/db")
await client.connect()
result = await client.execute("SELECT * FROM users WHERE id = $1", {"id": 123})
```

#### `mongodb.py`
MongoDB async client using `motor` with simple DSL:
```python
# Find documents
"collection:users;operation:find;filter:{status: active};limit:10"

# Insert
"collection:users;operation:insert;document:{name: John, age: 30}"

# Update
"collection:users;operation:update;filter:{_id: 123};update:{status: inactive}"

# Aggregate
"collection:users;operation:aggregate;pipeline:[{$group: {_id: null, count: {$sum: 1}}}]"
```

#### `pinecone.py`
Pinecone vector DB client:
```python
# Vector similarity search
"operation:query;vector:[0.1, 0.2, 0.3];top_k:10;filter:{category: tech}"

# Upsert vectors
"operation:upsert;vectors:[[0.1, 0.2], [0.3, 0.4]];ids:[id1, id2]"

# Get DB stats
"operation:stats"
```

### 2. MCP Infrastructure (`backend/ai/mcp/`)

#### `mcp_client.py`
Client that AI nodes use to call MCP tools:
```python
mcp = get_mcp_client()
result = await mcp.call_tool("query_database", {
    "database_type": "postgres",
    "query": "SELECT * FROM users LIMIT 10"
})
```

#### `database_tools.py`
MCP tool registry that exposes database operations as tools:
- `query_database` - Execute queries on any database
- `list_database_tables` - List tables/collections
- `get_database_schema` - Get schema information

### 3. ExecutionContext Updates (`backend/executor/context.py`)

Added fields and methods:
```python
# Store database clients
_db_clients: Dict[str, DatabaseClient]

# Store MCP client
_mcp_client: Optional[MCPClient]

# Methods
context.register_database("postgres", client)
context.get_database("postgres")
context.set_mcp_client(mcp_client)
context.get_mcp_client()
```

### 4. Execution Environment (`backend/executor/execution_environment.py`)

Factory for creating fully configured contexts:
```python
context = await ExecutionEnvironment.create_context(
    execution_id="exec_123",
    workflow_id="wf_456",
    user_id="user_789"
)
# Returns context with all databases and MCP initialized

# Clean up when done
await ExecutionEnvironment.cleanup_context(context)
```

Auto-loads config from environment variables:
- `DATABASE_URL` - PostgreSQL connection
- `MONGODB_URI` - MongoDB connection
- `PINECONE_API_KEY` - Pinecone API key

## API Integration

### In `backend/app/main.py`

```python
from executor.execution_environment import ExecutionEnvironment

@app.post("/api/v1/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    request: ExecuteRequest,
    user: User = Depends(get_current_user)
):
    # Create fully configured execution context
    context = await ExecutionEnvironment.create_context(
        execution_id=str(uuid4()),
        workflow_id=workflow_id,
        user_id=user.id,
    )
    
    try:
        # Convert request to WorkflowDefinition
        workflow = WorkflowDefinition.from_dict(workflow_json)
        
        # Execute (databases and MCP are available to all nodes)
        result = await engine.execute(workflow, request.input, context)
        
        return result
    finally:
        # Clean up database connections
        await ExecutionEnvironment.cleanup_context(context)
```

## Usage in AI Nodes

### OpenAI Example

```python
# In config
{
    "prompt": "List all active users and explain why they're important",
    "enable_tools": true,  # AI can use database tools
    "model": "gpt-4o-mini"
}

# The AI node:
# 1. Gets MCP client from context
# 2. Passes available tools to OpenAI
# 3. OpenAI decides to query Postgres for user data
# 4. Tool is called: query_database(database_type="postgres", query="SELECT ...")
# 5. Results returned to OpenAI
# 6. OpenAI generates response using the data
```

Output includes:
```python
{
    "response": "The 5 most active users are...",
    "tool_calls": [
        {
            "name": "query_database",
            "arguments": {
                "database_type": "postgres",
                "query": "SELECT user_id, activity_count FROM users..."
            },
            "result": {"rows": [...], "row_count": 5}
        }
    ],
    "database_results": {
        "query_database": {"rows": [...]}
    }
}
```

## Workflow Example

```json
{
  "id": "wf_123",
  "name": "User Analysis Workflow",
  "nodes": [
    {
      "id": "n1",
      "type": "ManualTrigger",
      "config": {}
    },
    {
      "id": "n2",
      "type": "OpenAI",
      "config": {
        "prompt": "Based on recent user activity, generate insights about our top 5 most engaged users. Include their names, activity scores, and explain why they're valuable.",
        "system_prompt": "You have access to a PostgreSQL database with user data. Use the query_database tool to fetch relevant user information.",
        "model": "gpt-4o-mini",
        "enable_tools": true
      }
    },
    {
      "id": "n3",
      "type": "Logger",
      "config": {
        "message": "Analysis: {{$node.n2.response}}"
      }
    }
  ],
  "connections": [
    { "from": "n1", "to": "n2" },
    { "from": "n2", "to": "n3" }
  ]
}
```

## Environment Setup

### `.env` Example

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/nexagent

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=nexagent

# Pinecone
PINECONE_API_KEY=pk-xxxxxxxx
PINECONE_INDEX=my-index
PINECONE_ENVIRONMENT=us-west1-gcp

# OpenAI (for AI nodes)
OPENAI_API_KEY=sk-...

# Claude (for AI nodes)
ANTHROPIC_API_KEY=sk-ant-...
```

## Database Query Syntax

### PostgreSQL (Standard SQL)
```sql
SELECT * FROM users WHERE status = 'active' LIMIT 10
INSERT INTO users (name, email) VALUES ('John', 'john@example.com')
UPDATE users SET status = 'inactive' WHERE id = 123
DELETE FROM users WHERE id = 456
```

### MongoDB (DSL Format)

**Find:**
```
collection:users;operation:find;filter:{status: active};limit:10
```

**Insert:**
```
collection:users;operation:insert;document:{name: Jane, email: jane@example.com}
```

**Update:**
```
collection:users;operation:update;filter:{_id: 123};update:{status: inactive}
```

**Aggregate:**
```
collection:users;operation:aggregate;pipeline:[{$match: {status: active}}, {$group: {_id: null, count: {$sum: 1}}}]
```

### Pinecone (Vector Search)

**Query:**
```
operation:query;vector:[0.123, 0.456, ...];top_k:10;filter:{category: tech}
```

**Upsert:**
```
operation:upsert;vectors:[[0.1, 0.2], [0.3, 0.4]];ids:[vec1, vec2];metadata:{category: tech}
```

**Stats:**
```
operation:stats
```

## Benefits

✅ **Deterministic automation stays stable** - Database queries don't affect non-AI nodes
✅ **AI agents remain flexible** - LLMs can choose to query databases dynamically
✅ **Workflows remain debuggable** - Each tool call is logged and traceable
✅ **Clean architecture** - MCP isolated from core execution engine
✅ **Extensible** - Add more tool servers without modifying workflow engine
✅ **Multi-database support** - PostgreSQL, MongoDB, Pinecone from day one
✅ **Async throughout** - All database operations are non-blocking

## Dependencies to Add

Update `requirements.txt`:

```txt
# Existing
fastapi
httpx
pydantic

# New - Database clients
asyncpg             # PostgreSQL
motor               # MongoDB (async)
pinecone-client     # Pinecone vector DB

# Optional improvements
sqlalchemy[asyncio] # For more complex queries
```

Install:
```bash
pip install -r requirements.txt
```

## Testing

```python
# Test database setup
import asyncio
from executor.execution_environment import ExecutionEnvironment

async def test():
    context = await ExecutionEnvironment.create_context(
        "exec_1",
        "wf_1",
        "user_1"
    )
    
    # Test PostgreSQL
    pg = context.get_database("postgres")
    if pg:
        result = await pg.execute("SELECT COUNT(*) as count FROM users")
        print(f"PostgreSQL users: {result['rows']}")
    
    # Test MCP
    mcp = context.get_mcp_client()
    tools = mcp.get_available_tools()
    print(f"Available tools: {[t['name'] for t in tools]}")
    
    await ExecutionEnvironment.cleanup_context(context)

asyncio.run(test())
```

## Next Steps

1. ✅ Database clients implemented
2. ✅ MCP infrastructure set up
3. ✅ ExecutionContext extended
4. ⏳ Update remaining AI nodes (Claude, Gemini, Groq) with tool support
5. ⏳ Update API endpoints to use ExecutionEnvironment
6. ⏳ Add workflow tests with AI database queries
7. ⏳ Document each AI node's database capabilities
