"""Gemini — Google's Gemini AI models (free tier available via AI Studio)."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class Gemini(BaseNode):
    definition = NodeDefinition(
        type="Gemini",
        display_name="Gemini",
        description="Send a prompt to Google Gemini AI models (free tier available via Google AI Studio).",
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
                default="",
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
        system_prompt = str(config.get("system_prompt") or "").strip()
        model = str(config.get("model") or "gemini-2.0-flash")
        temperature = float(config.get("temperature") or 0.7)
        max_tokens = int(config.get("max_tokens") or 1024)
        api_key = str(config.get("api_key") or "").strip()

        if not api_key:
            raise NodeExecutionError(
                "Google AI Studio API key is required. Get a free key at aistudio.google.com",
                self.definition.type,
            )

        try:
            import httpx

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

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

            async with httpx.AsyncClient(timeout=60) as client:
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
            text = ""
            for part in candidate.get("content", {}).get("parts", []):
                text += part.get("text", "")

            usage = data.get("usageMetadata", {})
            finish_reason = candidate.get("finishReason", "")

            return {
                "response": text,
                "model": model,
                "prompt_tokens": usage.get("promptTokenCount", 0),
                "completion_tokens": usage.get("candidatesTokenCount", 0),
                "finish_reason": finish_reason,
            }

        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(
                f"Gemini request failed: {type(exc).__name__}: {exc}", self.definition.type
            )
