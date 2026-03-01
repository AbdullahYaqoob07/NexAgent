"""OpenAI — sends a prompt to OpenAI GPT and returns the response."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class OpenAI(BaseNode):
    definition = NodeDefinition(
        type="OpenAI",
        display_name="OpenAI",
        description="Send a prompt to OpenAI GPT models and receive a text response.",
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
                default="You are a helpful assistant.",
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
        model = config.get("model", "gpt-4o-mini")
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("max_tokens", 1000))

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

            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
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
                    f"OpenAI API error: {data['error'].get('message', 'Unknown error')}",
                    self.definition.type,
                )

            choice = data["choices"][0]
            usage = data.get("usage", {})

            return {
                "response": choice["message"]["content"],
                "model": data.get("model", model),
                "tokens_used": usage.get("total_tokens", 0),
                "finish_reason": choice.get("finish_reason", ""),
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"OpenAI request failed: {exc}", self.definition.type)
