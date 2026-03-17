"""OpenAI — sends a prompt to OpenAI GPT models and returns the response.

Supports:
- Basic chat completions
- Database queries via MCP tools (Postgres, MongoDB, Pinecone)
- Dynamic tool calling (function calling)
"""

from __future__ import annotations
from typing import Any, Dict
import logging

from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption

logger = logging.getLogger(__name__)


class OpenAI(BaseNode):
    definition = NodeDefinition(
        type="OpenAI",
        display_name="OpenAI",
        description=(
            "Send a prompt to OpenAI GPT models with optional database access via MCP tools. "
            "Models can query PostgreSQL, MongoDB, or Pinecone and use the results to generate responses."
        ),
        category="AI",
        icon="🤖",
        color="#10A37F",
        is_trigger=False,
        required_credentials=["openai_api_key"],
        parameters=[
            NodeParameter(
                name="prompt",
                display_name="Prompt",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The prompt to send to the model. Supports {{$node.x.y}} expressions.",
                placeholder="Summarize the following: {{$node.n1.response_body}}",
            ),
            NodeParameter(
                name="system_prompt",
                display_name="System Prompt",
                type=ParameterType.STRING,
                required=False,
                default="You are a helpful assistant with access to databases. Use available tools to query data when needed.",
                description="Instructions that define the model's behavior.",
            ),
            NodeParameter(
                name="model",
                display_name="Model",
                type=ParameterType.OPTIONS,
                required=False,
                default="gpt-4o-mini",
                options=[
                    SelectOption(value="gpt-4o", label="GPT-4o"),
                    SelectOption(value="gpt-4o-mini", label="GPT-4o Mini"),
                    SelectOption(value="gpt-4-turbo", label="GPT-4 Turbo"),
                    SelectOption(value="gpt-3.5-turbo", label="GPT-3.5 Turbo"),
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
                description="Controls randomness. 0 = deterministic, 2 = very random.",
            ),
            NodeParameter(
                name="max_tokens",
                display_name="Max Tokens",
                type=ParameterType.NUMBER,
                required=False,
                default=1000,
                min_value=1,
                max_value=16000,
            ),
            NodeParameter(
                name="enable_tools",
                display_name="Enable Database Tools",
                type=ParameterType.BOOLEAN,
                required=False,
                default=True,
                description="Allow the model to query databases using MCP tools",
            ),
            NodeParameter(
                name="api_key",
                display_name="API Key",
                type=ParameterType.CREDENTIAL,
                required=False,
                description="OpenAI API key. Leave blank to use the key from Credentials.",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="response", display_name="Response Text", type="string"),
            NodeOutputField(name="model", display_name="Model Used", type="string"),
            NodeOutputField(name="tokens_used", display_name="Tokens Used", type="number"),
            NodeOutputField(name="finish_reason", display_name="Finish Reason", type="string"),
            NodeOutputField(name="prompt_tokens", display_name="Prompt Tokens", type="number"),
            NodeOutputField(name="completion_tokens", display_name="Completion Tokens", type="number"),
            NodeOutputField(name="tool_calls", display_name="Tool Calls Made", type="array", 
                          description="List of tools called by the model"),
            NodeOutputField(name="database_results", display_name="Database Results", type="object",
                          description="Results from database queries"),
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
        system_prompt = config.get("system_prompt", "You are a helpful assistant with access to databases.")
        model = config.get("model", "gpt-4o-mini")
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("max_tokens", 1000))
        enable_tools = config.get("enable_tools", True)

        api_key = (
            config.get("api_key")
            or context.get_credential("openai_api_key", "api_key", "")
        )

        if not api_key:
            raise NodeExecutionError(
                "OpenAI API key is required. Set it in the node config or in Credentials.",
                self.definition.type,
            )

        try:
            import httpx

            # Build tools if enabled
            tools = []
            if enable_tools:
                mcp_client = context.get_mcp_client()
                if mcp_client:
                    tools = mcp_client.get_available_tools()
                    logger.info("🛠️  OpenAI: Registering %d MCP tools", len(tools))

            # Initial request to OpenAI
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]

            request_body = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            if tools:
                request_body["tools"] = tools
                request_body["tool_choice"] = "auto"  # Let OpenAI decide whether to use tools

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=request_body,
                )
                data = response.json()

            if "error" in data:
                raise NodeExecutionError(
                    f"OpenAI API error: {data['error'].get('message', 'Unknown error')}",
                    self.definition.type,
                )

            choice = data["choices"][0]
            finish_reason = choice.get("finish_reason", "")
            tool_calls_made = []
            database_results = {}

            # Handle tool calls if the model chose to use them
            if finish_reason == "tool_calls" and "tool_calls" in choice.get("message", {}):
                tool_calls = choice["message"]["tool_calls"]
                logger.info("🔧 OpenAI calling %d tools", len(tool_calls))

                mcp_client = context.get_mcp_client()
                if not mcp_client:
                    raise NodeExecutionError(
                        "Tool calling requested but MCP client not available",
                        self.definition.type,
                    )

                # Execute each tool call
                for tool_call in tool_calls:
                    tool_name = tool_call["function"]["name"]
                    arguments = tool_call["function"]["arguments"]

                    # Parse JSON arguments
                    import json

                    try:
                        if isinstance(arguments, str):
                            arguments = json.loads(arguments)
                    except json.JSONDecodeError:
                        logger.error("Failed to parse tool arguments: %s", arguments)
                        continue

                    logger.info("▶ Executing tool: %s with args: %s", tool_name, arguments)

                    # Call the MCP tool
                    result = await mcp_client.call_tool(tool_name, arguments)
                    database_results[tool_name] = result

                    tool_calls_made.append({
                        "name": tool_name,
                        "arguments": arguments,
                        "result": result,
                    })

                # If tools were called, do another request with the results
                if tool_calls_made:
                    messages.append({"role": "assistant", "message": choice["message"]})
                    for tool_call_info in tool_calls_made:
                        messages.append({
                            "role": "tool",
                            "tool_use_id": tool_call_info["name"],
                            "content": str(tool_call_info["result"]),
                        })

                    # Request follow-up response from OpenAI
                    async with httpx.AsyncClient(timeout=60) as client:
                        response = await client.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "model": model,
                                "messages": messages,
                                "temperature": temperature,
                                "max_tokens": max_tokens,
                            },
                        )
                        data = response.json()

                    if "error" in data:
                        logger.error("OpenAI follow-up request failed: %s", data["error"])
                    else:
                        choice = data["choices"][0]
                        finish_reason = choice.get("finish_reason", "")

            usage = data.get("usage", {})
            response_text = choice.get("message", {}).get("content", "")

            return {
                "response": response_text,
                "model": data.get("model", model),
                "tokens_used": usage.get("total_tokens", 0),
                "finish_reason": finish_reason,
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "tool_calls": tool_calls_made,
                "database_results": database_results,
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.exception("OpenAI execution failed")
            raise NodeExecutionError(f"OpenAI request failed: {exc}", self.definition.type)
