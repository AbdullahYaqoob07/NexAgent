# AI Node Updates - Template

This document shows how to update the remaining AI nodes (Claude, Gemini, Groq) to support MCP database tools.

All follow the same pattern as OpenAI. Here's the template:

## 1. Update Definition

Add two new parameters:

```python
NodeParameter(
    name="enable_tools",
    display_name="Enable Database Tools",
    type=ParameterType.BOOLEAN,
    required=False,
    default=True,
    description="Allow the model to query databases using MCP tools",
),
```

Add two new outputs:

```python
NodeOutputField(name="tool_calls", display_name="Tool Calls Made", type="array", 
              description="List of tools called by the model"),
NodeOutputField(name="database_results", display_name="Database Results", type="object",
              description="Results from database queries"),
```

## 2. Update Execute Method

Replace the simple API call with:

```python
async def execute(self, config, input_data, context):
    # ... existing param validation ...
    
    enable_tools = config.get("enable_tools", True)
    
    # Build tools if enabled
    tools = []
    if enable_tools:
        mcp_client = context.get_mcp_client()
        if mcp_client:
            tools = mcp_client.get_available_tools()
            logger.info("🛠️  [ModelName]: Registering %d MCP tools", len(tools))
    
    # Make API call with tools parameter
    # (Specific format depends on each provider's API)
    
    # If model uses tools, execute them and make follow-up request
    tool_calls_made = []
    database_results = {}
    
    if has_tool_calls:
        for tool_call in tool_calls:
            result = await mcp_client.call_tool(tool_name, arguments)
            tool_calls_made.append({...})
            database_results[tool_name] = result
        
        # Make follow-up request with tool results
        # (Provider-specific)
    
    return {
        ...,
        "tool_calls": tool_calls_made,
        "database_results": database_results,
    }
```

## Claude AI (Anthropic)

**File:** `backend/nodes/ai/claude_chat.py`

Claude supports tool use natively. Tools go in the `tools` parameter:

```python
tools = mcp_client.get_available_tools()

response = await client.post(
    "https://api.anthropic.com/v1/messages",
    json={
        "model": model,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": messages,
        "tools": tools,  # Add this
        "tool_choice": {"type": "auto"}  # Claude auto-selects
    }
)

# Check if Claude uses tools
if response.stop_reason == "tool_use":
    for content_block in response.content:
        if content_block.type == "tool_use":
            tool_name = content_block.name
            result = await mcp_client.call_tool(tool_name, content_block.input)
            # Add tool result to messages and make follow-up request
```

## Gemini (Google)

**File:** `backend/nodes/ai/gemini.py`

Gemini uses `tools` parameter with function declarations:

```python
tools = mcp_client.get_available_tools()
# Convert to Gemini format if needed

response = await client.post(
    "https://generativelanguage.googleapis.com/v1beta/models/...:generateContent",
    json={
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{
            "function_declarations": tools
        }],
        ...
    }
)

# Check for function calls
if response.candidates[0].finish_reason == "FUNCTION_CALL":
    for part in response.candidates[0].content.parts:
        if part.function_call:
            result = await mcp_client.call_tool(...)
```

## Groq

**File:** `backend/nodes/ai/groq.py`

Groq uses OpenAI-compatible API with tool_choice:

```python
tools = mcp_client.get_available_tools()

response = await client.post(
    "https://api.groq.com/openai/v1/chat/completions",  # Groq endpoint
    json={
        "model": model,
        "messages": messages,
        "tools": tools,
        "tool_choice": "auto"
    }
)

# Same as OpenAI - check finish_reason == "tool_calls"
```

## Testing the Updates

```python
# Test workflow with AI database queries
workflow = {
    "nodes": [
        {"id": "n1", "type": "ManualTrigger", "config": {}},
        {
            "id": "n2",
            "type": "ClaudeAI",
            "config": {
                "prompt": "Query the PostgreSQL database and summarize user counts",
                "enable_tools": True
            }
        }
    ],
    "connections": [{"from": "n1", "to": "n2"}]
}

# Execute
context = await ExecutionEnvironment.create_context(...)
result = await engine.execute(workflow, {}, context)

# Check outputs
print(result.logs[-1].output["tool_calls"])  # Should have database query
print(result.logs[-1].output["database_results"])  # Should have results
```

## Implementation Priority

1. **OpenAI** (✅ Done) - Already implemented with full tool support
2. **Claude** (⏳ Todo) - Easy, supports tool_use natively
3. **Gemini** (⏳ Todo) - Medium complexity, function_call format
4. **Groq** (⏳ Todo) - Easy, OpenAI-compatible with tools

All follow the same pattern - just adapt for each provider's API format.
