"""Claude AI — sends a prompt to Anthropic Claude and returns the response."""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, Optional, List
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption

logger = logging.getLogger(__name__)


class ClaudeAI(BaseNode):
    definition = NodeDefinition(
        type="ClaudeAI",
        display_name="Claude AI",
        description="Send a prompt to Anthropic Claude models with optional database access. Claude can query PostgreSQL, MongoDB, and Pinecone.",
        category="AI",
        icon="🧠",
        color="#C97B3A",
        is_trigger=False,
        required_credentials=["anthropic_api_key"],
        parameters=[
            NodeParameter(
                name="prompt",
                display_name="Prompt",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The prompt to send to Claude. Supports {{$node.x.y}} expressions.",
                placeholder="Analyze this data: {{$node.n1.response_body}}",
            ),
            NodeParameter(
                name="system_prompt",
                display_name="System Prompt",
                type=ParameterType.STRING,
                required=False,
                default="You are a helpful assistant. You have access to a database system. When the user asks for data, use the query_database tool to retrieve information.",
                description="Instructions that define Claude's behavior. Mention database access if enable_tools is true.",
            ),
            NodeParameter(
                name="model",
                display_name="Model",
                type=ParameterType.OPTIONS,
                required=False,
                default="claude-haiku-4-5-20251001",
                options=[
                    SelectOption(value="claude-opus-4-6", label="Claude Opus 4.6"),
                    SelectOption(value="claude-sonnet-4-6", label="Claude Sonnet 4.6"),
                    SelectOption(value="claude-haiku-4-5-20251001", label="Claude Haiku 4.5"),
                ],
            ),
            NodeParameter(
                name="max_tokens",
                display_name="Max Tokens",
                type=ParameterType.NUMBER,
                required=False,
                default=1024,
                min_value=1,
                max_value=8096,
            ),
            NodeParameter(
                name="enable_tools",
                display_name="Enable Database Access",
                type=ParameterType.BOOLEAN,
                required=False,
                default=True,
                description="Allow Claude to use the query_database tool to access PostgreSQL, MongoDB, and Pinecone.",
            ),
            NodeParameter(
                name="api_key",
                display_name="API Key",
                type=ParameterType.CREDENTIAL,
                required=False,
                description="Anthropic API key. Leave blank to use the key from Credentials.",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="response", display_name="Response Text", type="string"),
            NodeOutputField(name="model", display_name="Model Used", type="string"),
            NodeOutputField(name="tokens_used", display_name="Tokens Used", type="number"),
            NodeOutputField(name="stop_reason", display_name="Stop Reason", type="string"),
            NodeOutputField(name="input_tokens", display_name="Input Tokens", type="number"),
            NodeOutputField(name="output_tokens", display_name="Output Tokens", type="number"),
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
        system_prompt = config.get("system_prompt", "You are a helpful assistant. You have access to a database system.")
        model = config.get("model", "claude-haiku-4-5-20251001")
        max_tokens = int(config.get("max_tokens", 1024))
        enable_tools = config.get("enable_tools", True)

        api_key = (
            config.get("api_key")
            or context.get_credential("anthropic_api_key", "api_key", "")
        )

        if not api_key:
            raise NodeExecutionError(
                "Anthropic API key is required. Set it in the node config or in Credentials.",
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
                        logger.info(f"Claude node: Registered {len(tools_to_use)} MCP tools")
                except Exception as e:
                    logger.warning(f"Claude node: Failed to register MCP tools: {e}")

            # Build request body
            request_body = {
                "model": model,
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": prompt}],
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
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json=request_body,
                )
                data = response.json()

                if "error" in data:
                    raise NodeExecutionError(
                        f"Anthropic API error: {data['error'].get('message', 'Unknown error')}",
                        self.definition.type,
                    )

                # Process response and handle tool use
                messages = [{"role": "user", "content": prompt}]
                stop_reason = data.get("stop_reason", "end_turn")
                
                # Check for tool use in content blocks
                while stop_reason == "tool_use" and mcp_client:
                    # Extract response and tool uses
                    response_content = data.get("content", [])
                    messages.append({"role": "assistant", "content": response_content})
                    
                    # Execute each tool use
                    tool_results = []
                    for block in response_content:
                        if block.get("type") == "tool_use":
                            tool_name = block.get("name", "")
                            tool_input = block.get("input", {})
                            tool_id = block.get("id", "")
                            
                            try:
                                logger.info(f"Claude node: Executing tool '{tool_name}' with input {tool_input}")
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
                                
                                # Add tool result for Claude
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": str(result),
                                })
                                logger.info(f"Claude node: Tool '{tool_name}' result: {result}")
                            except Exception as e:
                                logger.error(f"Claude node: Tool '{tool_name}' failed: {e}")
                                tool_calls_made.append({
                                    "tool": tool_name,
                                    "input": tool_input,
                                    "error": str(e),
                                    "status": "error"
                                })
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": f"Error: {str(e)}",
                                    "is_error": True,
                                })

                    # Make follow-up request with tool results
                    if tool_results:
                        messages.append({"role": "user", "content": tool_results})
                        
                        request_body["messages"] = messages
                        response = await client.post(
                            "https://api.anthropic.com/v1/messages",
                            headers={
                                "x-api-key": api_key,
                                "anthropic-version": "2023-06-01",
                                "Content-Type": "application/json",
                            },
                            json=request_body,
                        )
                        data = response.json()
                        
                        if "error" in data:
                            raise NodeExecutionError(
                                f"Anthropic API error on follow-up: {data['error'].get('message', 'Unknown error')}",
                                self.definition.type,
                            )
                        
                        stop_reason = data.get("stop_reason", "end_turn")

                # Extract final text response
                content_blocks = data.get("content", [])
                response_text = " ".join(
                    block.get("text", "") for block in content_blocks if block.get("type") == "text"
                )
                
                usage = data.get("usage", {})

                return {
                    "response": response_text,
                    "model": data.get("model", model),
                    "tokens_used": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                    "stop_reason": stop_reason,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "tool_calls": tool_calls_made,
                    "database_results": database_results,
                }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error(f"Claude node execution failed: {exc}")
            raise NodeExecutionError(f"Anthropic request failed: {exc}", self.definition.type)
