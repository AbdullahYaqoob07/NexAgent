"""Groq — fast inference via Groq's free API (Llama, Mixtral, Gemma models)."""

from __future__ import annotations
import json
import logging
import uuid
from typing import Any, Dict, Optional, List
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption

logger = logging.getLogger(__name__)


class Groq(BaseNode):
    definition = NodeDefinition(
        type="Groq",
        display_name="Groq",
        description="Send a prompt to Groq's ultra-fast inference API with optional database access. Groq can query PostgreSQL, MongoDB, and Pinecone.",
        category="AI",
        icon="⚡",
        color="#F55036",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="prompt",
                display_name="Prompt",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The user message to send. Supports {{$node.x.y}} expressions.",
                placeholder="Summarize this: {{$node.n1.response}}",
            ),
            NodeParameter(
                name="system_prompt",
                display_name="System Prompt",
                type=ParameterType.STRING,
                required=False,
                default="You are a helpful assistant. Use the data provided in the user message directly. Do not call tools unless explicitly required.",
                description="Instructions that define the model's behavior.",
            ),
            NodeParameter(
                name="model",
                display_name="Model",
                type=ParameterType.OPTIONS,
                required=False,
                default="llama-3.3-70b-versatile",
                options=[
                    SelectOption(value="llama-3.3-70b-versatile", label="Llama 3.3 70B (recommended)"),
                    SelectOption(value="llama-3.1-8b-instant", label="Llama 3.1 8B (fastest)"),
                    SelectOption(value="llama3-8b-8192", label="Llama 3 8B"),
                    SelectOption(value="mixtral-8x7b-32768", label="Mixtral 8x7B"),
                    SelectOption(value="gemma2-9b-it", label="Gemma 2 9B"),
                ],
            ),
            NodeParameter(
                name="temperature",
                display_name="Temperature",
                type=ParameterType.NUMBER,
                required=False,
                default=0.7,
                min_value=0,
                max_value=2,
                description="Controls randomness. 0 = deterministic, 2 = very creative.",
            ),
            NodeParameter(
                name="max_tokens",
                display_name="Max Tokens",
                type=ParameterType.NUMBER,
                required=False,
                default=1024,
                min_value=1,
                max_value=32768,
            ),
            NodeParameter(
                name="enable_tools",
                display_name="Enable Database Access",
                type=ParameterType.BOOLEAN,
                required=False,
                default=False,
                description="Allow Groq to use the query_database tool to access PostgreSQL, MongoDB, and Pinecone.",
            ),
            NodeParameter(
                name="api_key",
                display_name="API Key",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Groq API key. Get a free key at console.groq.com",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="response", display_name="Response Text", type="string"),
            NodeOutputField(name="model", display_name="Model Used", type="string"),
            NodeOutputField(name="tokens_used", display_name="Tokens Used", type="number"),
            NodeOutputField(name="prompt_tokens", display_name="Prompt Tokens", type="number"),
            NodeOutputField(name="completion_tokens", display_name="Completion Tokens", type="number"),
            NodeOutputField(name="finish_reason", display_name="Finish Reason", type="string"),
            NodeOutputField(name="tool_calls", display_name="Tool Calls Made", type="array"),
            NodeOutputField(name="database_results", display_name="Database Query Results", type="object"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "prompt")

        prompt = str(config["prompt"])
        system_prompt = str(
            config.get("system_prompt")
            or "You are a helpful assistant. Use the data provided in the user message directly. Do not call tools unless explicitly required."
        )
        model = str(config.get("model") or "llama-3.3-70b-versatile")
        temperature = float(config.get("temperature") or 0.7)
        max_tokens = int(config.get("max_tokens") or 1024)
        raw_enable_tools = config.get("enable_tools", False)
        if isinstance(raw_enable_tools, str):
            enable_tools = raw_enable_tools.strip().lower() in {"1", "true", "yes", "on"}
        else:
            enable_tools = bool(raw_enable_tools)
        api_key = str(config.get("api_key") or "").strip()

        if not api_key:
            raise NodeExecutionError(
                "Groq API key is required. Get a free key at console.groq.com",
                self.definition.type,
            )

        try:
            import httpx

            # Get MCP client and tools if enabled
            tools_to_use = []
            mcp_client = None
            
            if enable_tools:
                try:
                    mcp_client = context.get_mcp_client()
                    if mcp_client:
                        tools_to_use = mcp_client.get_available_tools()
                        logger.info(f"Groq node: Registered {len(tools_to_use)} MCP tools")
                except Exception as e:
                    logger.warning(f"Groq node: Failed to register MCP tools: {e}")

            # Build request body
            request_body = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            # Add tools to request if available
            if tools_to_use:
                request_body["tools"] = tools_to_use

            # Track tool calls and results
            tool_calls_made: List[Dict[str, Any]] = []
            database_results: Dict[str, Any] = {}

            async with httpx.AsyncClient(timeout=60) as client:
                # Initial request
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_body,
                )
                data = response.json()

                if "error" in data:
                    error_message = data["error"].get("message", str(data["error"]))
                    # Groq sometimes returns malformed tool-call names from the model
                    # (e.g. tool name concatenated with JSON args). Retry once without tools
                    # so the model can answer directly from prompt/context data.
                    if tools_to_use and "tool call validation failed" in error_message.lower():
                        logger.warning(
                            "Groq tool-call validation failed; retrying once without tools. Error: %s",
                            error_message,
                        )
                        retry_body = {
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": prompt},
                            ],
                            "temperature": temperature,
                            "max_tokens": max_tokens,
                        }
                        response = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            },
                            json=retry_body,
                        )
                        data = response.json()
                        if "error" in data:
                            raise NodeExecutionError(
                                f"Groq API error: {data['error'].get('message', str(data['error']))}",
                                self.definition.type,
                            )
                    else:
                        raise NodeExecutionError(
                            f"Groq API error: {error_message}",
                            self.definition.type,
                        )

                # Process response and handle tool calls
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ]
                
                choice = data["choices"][0]
                finish_reason = choice.get("finish_reason", "stop")
                
                # Handle tool calls (similar to OpenAI)
                while finish_reason == "tool_calls" and mcp_client:
                    # Extract tool calls from assistant message
                    assistant_message = choice["message"]
                    raw_tool_calls = assistant_message.get("tool_calls", [])
                    normalized_tool_calls: List[Dict[str, Any]] = []

                    # Groq/OpenAI follow-up requests require stable tool_call_id values.
                    for idx, tool_call in enumerate(raw_tool_calls):
                        function_payload = tool_call.get("function", {})
                        tool_name = function_payload.get("name", "")
                        tool_args = function_payload.get("arguments", "{}")
                        if not isinstance(tool_args, str):
                            tool_args = json.dumps(tool_args, default=str)

                        tool_id = tool_call.get("id") or f"call_{uuid.uuid4().hex[:12]}_{idx}"
                        normalized_tool_calls.append({
                            "id": tool_id,
                            "type": "function",
                            "function": {
                                "name": tool_name,
                                "arguments": tool_args,
                            },
                        })

                    messages.append({
                        "role": "assistant",
                        "content": assistant_message.get("content") or "",
                        "tool_calls": normalized_tool_calls,
                    })
                    
                    # Add tool calls to message if present
                    tool_calls = normalized_tool_calls
                    if not tool_calls:
                        break
                    
                    # Execute each tool call and append tool-role messages
                    tool_result_messages = []
                    for tool_call in tool_calls:
                        tool_name = tool_call.get("function", {}).get("name", "")
                        tool_arguments = tool_call.get("function", {}).get("arguments", "{}")
                        tool_id = tool_call.get("id", "")
                        tool_input: Dict[str, Any] = {}
                        
                        try:
                            # Parse arguments if it's a string
                            if isinstance(tool_arguments, str):
                                tool_input = json.loads(tool_arguments)
                            else:
                                tool_input = tool_arguments
                            
                            logger.info(f"Groq node: Executing tool '{tool_name}' with input {tool_input}")
                            result = await mcp_client.call_tool(tool_name, tool_input)
                            
                            tool_calls_made.append({
                                "tool": tool_name,
                                "input": tool_input,
                                "result": result,
                                "status": "success"
                            })
                            
                            # Store in database results
                            if tool_name == "query_database":
                                database_results[tool_id] = result
                            
                            # Add tool result in OpenAI/Groq tool message format
                            tool_result_messages.append({
                                "role": "tool",
                                "tool_call_id": tool_id,
                                "content": json.dumps(result, default=str),
                            })
                            logger.info(f"Groq node: Tool '{tool_name}' result: {result}")
                        except Exception as e:
                            logger.error(f"Groq node: Tool '{tool_name}' failed: {e}")
                            tool_calls_made.append({
                                "tool": tool_name,
                                "input": tool_input,
                                "error": str(e),
                                "status": "error"
                            })
                            tool_result_messages.append({
                                "role": "tool",
                                "tool_call_id": tool_id,
                                "content": f"Error: {str(e)}",
                            })

                    # If every tool result indicates missing/unregistered clients, stop
                    # tool recursion and return a clear message instead of looping into
                    # repeated invalid tool calls that can trigger Groq follow-up 400s.
                    if tool_calls_made:
                        recent = tool_calls_made[-len(tool_calls):]
                        all_missing_client = True
                        for call in recent:
                            result_payload = call.get("result") if isinstance(call, dict) else None
                            error_text = ""
                            if isinstance(result_payload, dict):
                                error_text = str(result_payload.get("error", ""))
                            elif call.get("status") == "error":
                                error_text = str(call.get("error", ""))

                            lowered = error_text.lower()
                            if "not registered" not in lowered and "missing" not in lowered:
                                all_missing_client = False
                                break

                        if all_missing_client:
                            logger.warning(
                                "Groq node: Tool calls stopped because required database clients are not registered for this execution."
                            )
                            usage = data.get("usage", {})
                            return {
                                "response": (
                                    "Database tools were enabled, but no database client was registered for this run. "
                                    "Run a database node before this AI node or configure database env vars (for example DATABASE_URL) "
                                    "so MCP tools can connect."
                                ),
                                "model": data.get("model", model),
                                "tokens_used": usage.get("total_tokens", 0),
                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                "completion_tokens": usage.get("completion_tokens", 0),
                                "finish_reason": "tool_unavailable",
                                "tool_calls": tool_calls_made,
                                "database_results": database_results,
                            }

                    # Add tool results to messages
                    if tool_result_messages:
                        messages.extend(tool_result_messages)
                        
                        # Make follow-up request with tool results
                        request_body["messages"] = messages
                        response = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            },
                            json=request_body,
                        )
                        data = response.json()
                        
                        if "error" in data:
                            followup_error = data["error"].get("message", str(data["error"]))
                            # Some Groq tool-follow-up payloads can still be rejected.
                            # Retry once without tools and ask model to summarize tool outcomes.
                            if (
                                "tool" in followup_error.lower()
                                or "validation" in followup_error.lower()
                                or "function" in followup_error.lower()
                            ):
                                logger.warning(
                                    "Groq follow-up rejected tool payload; retrying without tools. Error: %s",
                                    followup_error,
                                )
                                retry_prompt = (
                                    f"{prompt}\n\n"
                                    "Tool execution results (JSON):\n"
                                    f"{json.dumps(tool_calls_made, default=str)}\n\n"
                                    "Use these tool results directly to answer the user request."
                                )
                                retry_body = {
                                    "model": model,
                                    "messages": [
                                        {"role": "system", "content": system_prompt},
                                        {"role": "user", "content": retry_prompt},
                                    ],
                                    "temperature": temperature,
                                    "max_tokens": max_tokens,
                                }
                                response = await client.post(
                                    "https://api.groq.com/openai/v1/chat/completions",
                                    headers={
                                        "Authorization": f"Bearer {api_key}",
                                        "Content-Type": "application/json",
                                    },
                                    json=retry_body,
                                )
                                data = response.json()
                                if "error" in data:
                                    raise NodeExecutionError(
                                        f"Groq API error on follow-up: {data['error'].get('message', str(data['error']))}",
                                        self.definition.type,
                                    )
                            else:
                                raise NodeExecutionError(
                                    f"Groq API error on follow-up: {followup_error}",
                                    self.definition.type,
                                )
                        
                        choice = data["choices"][0]
                        finish_reason = choice.get("finish_reason", "stop")

                # Extract final response
                usage = data.get("usage", {})

                return {
                    "response": choice["message"].get("content") or "",
                    "model": data.get("model", model),
                    "tokens_used": usage.get("total_tokens", 0),
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "finish_reason": finish_reason,
                    "tool_calls": tool_calls_made,
                    "database_results": database_results,
                }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error(f"Groq node execution failed: {exc}")
            raise NodeExecutionError(
                f"Groq request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
