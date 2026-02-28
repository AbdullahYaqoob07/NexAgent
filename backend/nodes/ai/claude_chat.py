"""Claude AI — sends a prompt to Anthropic Claude and returns the response."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class ClaudeAI(BaseNode):
    definition = NodeDefinition(
        type="ClaudeAI",
        display_name="Claude AI",
        description="Send a prompt to Anthropic Claude models and receive a text response.",
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
                default="You are a helpful assistant.",
                description="Instructions that define Claude's behavior.",
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
        system_prompt = config.get("system_prompt", "You are a helpful assistant.")
        model = config.get("model", "claude-haiku-4-5-20251001")
        max_tokens = int(config.get("max_tokens", 1024))

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

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": max_tokens,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                data = response.json()

            if "error" in data:
                raise NodeExecutionError(
                    f"Anthropic API error: {data['error'].get('message', 'Unknown error')}",
                    self.definition.type,
                )

            content_blocks = data.get("content", [])
            response_text = " ".join(
                block.get("text", "") for block in content_blocks if block.get("type") == "text"
            )
            usage = data.get("usage", {})

            return {
                "response": response_text,
                "model": data.get("model", model),
                "tokens_used": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                "stop_reason": data.get("stop_reason", ""),
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Anthropic request failed: {exc}", self.definition.type)
