"""Groq — fast inference via Groq's free API (Llama, Mixtral, Gemma models)."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class Groq(BaseNode):
    definition = NodeDefinition(
        type="Groq",
        display_name="Groq",
        description="Send a prompt to Groq's ultra-fast inference API (Llama 3, Mixtral, Gemma — free tier available).",
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
                default="You are a helpful assistant.",
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
        system_prompt = str(config.get("system_prompt") or "You are a helpful assistant.")
        model = str(config.get("model") or "llama-3.3-70b-versatile")
        temperature = float(config.get("temperature") or 0.7)
        max_tokens = int(config.get("max_tokens") or 1024)
        api_key = str(config.get("api_key") or "").strip()

        if not api_key:
            raise NodeExecutionError(
                "Groq API key is required. Get a free key at console.groq.com",
                self.definition.type,
            )

        try:
            import httpx

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                )
                data = response.json()

            if "error" in data:
                raise NodeExecutionError(
                    f"Groq API error: {data['error'].get('message', str(data['error']))}",
                    self.definition.type,
                )

            choice = data["choices"][0]
            usage = data.get("usage", {})

            return {
                "response": choice["message"]["content"],
                "model": data.get("model", model),
                "tokens_used": usage.get("total_tokens", 0),
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "finish_reason": choice.get("finish_reason", ""),
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(
                f"Groq request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
