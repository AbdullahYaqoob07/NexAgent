"""Gemini — Google's Gemini AI models (free tier available via AI Studio)."""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, Optional, List
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption

logger = logging.getLogger(__name__)


class Gemini(BaseNode):
    definition = NodeDefinition(
        type="Gemini",
        display_name="Gemini",
        description="Send a prompt to Google Gemini AI models with optional database access. Gemini can query PostgreSQL, MongoDB, and Pinecone.",
        category="AI",
        icon="✨",
        color="#4285F4",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="prompt",
                display_name="Prompt",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The prompt to send to Gemini. Supports {{$node.x.y}} expressions.",
                placeholder="Explain this to me: {{$node.n1.response}}",
            ),
            NodeParameter(
                name="system_prompt",
                display_name="System Prompt",
                type=ParameterType.STRING,
                required=False,
                default="You are a helpful assistant. You have access to a database system. When the user asks for data, use the query_database tool to retrieve information.",
                description="Optional system instructions for the model.",
            ),
            NodeParameter(
                name="model",
                display_name="Model",
                type=ParameterType.OPTIONS,
                required=False,
                default="gemini-2.0-flash",
                options=[
                    SelectOption(value="gemini-2.0-flash", label="Gemini 2.0 Flash (recommended, free)"),
                    SelectOption(value="gemini-1.5-flash", label="Gemini 1.5 Flash (free)"),
                    SelectOption(value="gemini-1.5-pro", label="Gemini 1.5 Pro (free with limits)"),
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
                display_name="Max Output Tokens",
                type=ParameterType.NUMBER,
                required=False,
                default=1024,
                min_value=1,
                max_value=8192,
            ),
            NodeParameter(
                name="enable_tools",
                display_name="Enable Database Access",
                type=ParameterType.BOOLEAN,
                required=False,
                default=True,
                description="Allow Gemini to use the query_database tool to access PostgreSQL, MongoDB, and Pinecone.",
            ),
            NodeParameter(
                name="api_key",
                display_name="API Key",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Google AI Studio API key. Get a free key at aistudio.google.com",
                is_private=True,
            ),
        ],
        outputs=[
            NodeOutputField(name="response", display_name="Response Text", type="string"),
            NodeOutputField(name="model", display_name="Model Used", type="string"),
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
        system_prompt = str(config.get("system_prompt") or "You are a helpful assistant. You have access to a database system.")
        model = str(config.get("model") or "gemini-2.0-flash")
        temperature = float(config.get("temperature") or 0.7)
        max_tokens = int(config.get("max_tokens") or 1024)
        enable_tools = config.get("enable_tools", True)
        api_key = str(config.get("api_key") or "").strip()

        if not api_key:
            raise NodeExecutionError(
                "Google AI Studio API key is required. Get a free key at aistudio.google.com",
                self.definition.type,
            )

        try:
            import httpx

            # Get MCP client and tools if enabled
            tools_defs = []
            mcp_client = None
            
            if enable_tools:
                try:
                    mcp_client = context.get_mcp_client()
                    if mcp_client:
                        mcp_tools = mcp_client.get_available_tools()
                        # Convert OpenAI tools to Gemini function_declarations format
                        for tool in mcp_tools:
                            if tool.get("type") == "function":
                                tools_defs.append(tool.get("function", {}))
                        logger.info(f"Gemini node: Registered {len(tools_defs)} MCP tools")
                except Exception as e:
                    logger.warning(f"Gemini node: Failed to register MCP tools: {e}")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

            # Build request body
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            
            body: Dict[str, Any] = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            }

            # System instruction (Gemini API uses a separate field)
            if system_prompt:
                body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

            # Add tools as function declarations
            if tools_defs:
                body["tools"] = [{"functionDeclarations": tools_defs}]

            # Track tool calls and results
            tool_calls_made: List[Dict[str, Any]] = []
            database_results: Dict[str, Any] = {}

            async with httpx.AsyncClient(timeout=60) as client:
                # Initial request
                response = await client.post(
                    url,
                    params={"key": api_key},
                    headers={"Content-Type": "application/json"},
                    json=body,
                )
                data = response.json()

                if "error" in data:
                    raise NodeExecutionError(
                        f"Gemini API error: {data['error'].get('message', str(data['error']))}",
                        self.definition.type,
                    )

                candidates = data.get("candidates", [])
                if not candidates:
                    raise NodeExecutionError(
                        "Gemini returned no candidates. The prompt may have been blocked by safety filters.",
                        self.definition.type,
                    )

                candidate = candidates[0]
                finish_reason = candidate.get("finishReason", "STOP")

                # Handle function calls (if finish_reason is FUNCTION_CALL)
                while finish_reason == "FUNCTION_CALL" and mcp_client:
                    # Extract function calls from parts
                    parts = candidate.get("content", {}).get("parts", [])
                    
                    # Add to contents for follow-up
                    if "content" not in contents[0]:
                        contents[0]["parts"] = []
                    
                    # Add assistant response parts to contents
                    if isinstance(contents[0]["parts"], list):
                        contents[0]["parts"].extend(parts)
                    
                    # Execute each function call
                    function_results = []
                    for part in parts:
                        if part.get("functionCall"):
                            func_call = part["functionCall"]
                            tool_name = func_call.get("name", "")
                            tool_input = func_call.get("args", {})
                            
                            try:
                                logger.info(f"Gemini node: Executing tool '{tool_name}' with input {tool_input}")
                                result = await mcp_client.call_tool(tool_name, tool_input)
                                
                                tool_calls_made.append({
                                    "tool": tool_name,
                                    "input": tool_input,
                                    "result": result,
                                    "status": "success"
                                })
                                
                                # Store in database results
                                if tool_name == "query_database":
                                    database_results[tool_name] = result
                                
                                # Add function result for follow-up
                                function_results.append({
                                    "functionResponse": {
                                        "name": tool_name,
                                        "response": {
                                            "result": result,
                                            "status": "success"
                                        }
                                    }
                                })
                                logger.info(f"Gemini node: Tool '{tool_name}' result: {result}")
                            except Exception as e:
                                logger.error(f"Gemini node: Tool '{tool_name}' failed: {e}")
                                tool_calls_made.append({
                                    "tool": tool_name,
                                    "input": tool_input,
                                    "error": str(e),
                                    "status": "error"
                                })
                                function_results.append({
                                    "functionResponse": {
                                        "name": tool_name,
                                        "response": {
                                            "error": str(e),
                                            "status": "error"
                                        }
                                    }
                                })

                    # Make follow-up request with function results
                    if function_results:
                        # Add results as user message (Gemini style)
                        contents.append({"role": "user", "parts": function_results})
                        
                        body["contents"] = contents
                        response = await client.post(
                            url,
                            params={"key": api_key},
                            headers={"Content-Type": "application/json"},
                            json=body,
                        )
                        data = response.json()
                        
                        if "error" in data:
                            raise NodeExecutionError(
                                f"Gemini API error on follow-up: {data['error'].get('message', str(data['error']))}",
                                self.definition.type,
                            )
                        
                        candidates = data.get("candidates", [])
                        if not candidates:
                            break
                        
                        candidate = candidates[0]
                        finish_reason = candidate.get("finishReason", "STOP")

                # Extract final text response
                final_text = ""
                for part in candidate.get("content", {}).get("parts", []):
                    if "text" in part:
                        final_text += part.get("text", "")
                
                usage = data.get("usageMetadata", {})

                return {
                    "response": final_text,
                    "model": model,
                    "prompt_tokens": usage.get("promptTokenCount", 0),
                    "completion_tokens": usage.get("candidatesTokenCount", 0),
                    "finish_reason": finish_reason,
                    "tool_calls": tool_calls_made,
                    "database_results": database_results,
                }

        except NodeExecutionError:
            raise
        except Exception as exc:
            logger.error(f"Gemini node execution failed: {exc}")
            raise NodeExecutionError(
                f"Gemini request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
