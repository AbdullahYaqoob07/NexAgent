"""HTTP Request — makes an HTTP call to any external URL."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class HttpRequest(BaseNode):
    definition = NodeDefinition(
        type="HttpRequest",
        display_name="HTTP Request",
        description="Make an HTTP request to any URL. Supports GET, POST, PUT, DELETE, PATCH.",
        category="Actions",
        icon="🌐",
        color="#0EA5E9",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="url",
                display_name="URL",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The URL to request. Supports {{$node.x.y}} expressions.",
                placeholder="https://api.example.com/users",
            ),
            NodeParameter(
                name="method",
                display_name="Method",
                type=ParameterType.OPTIONS,
                required=False,
                default="GET",
                options=[
                    SelectOption(value="GET", label="GET"),
                    SelectOption(value="POST", label="POST"),
                    SelectOption(value="PUT", label="PUT"),
                    SelectOption(value="PATCH", label="PATCH"),
                    SelectOption(value="DELETE", label="DELETE"),
                ],
            ),
            NodeParameter(
                name="headers",
                display_name="Headers",
                type=ParameterType.COLLECTION,
                required=False,
                default={},
                description="Key-value pairs to send as HTTP headers",
            ),
            NodeParameter(
                name="body",
                display_name="Body (JSON)",
                type=ParameterType.EXPRESSION,
                required=False,
                default={},
                description="Request body as JSON object or expression",
            ),
            NodeParameter(
                name="query_params",
                display_name="Query Parameters",
                type=ParameterType.COLLECTION,
                required=False,
                default={},
                description="Key-value pairs appended to the URL as query parameters",
            ),
            NodeParameter(
                name="timeout",
                display_name="Timeout (seconds)",
                type=ParameterType.NUMBER,
                required=False,
                default=30,
                min_value=1,
                max_value=300,
            ),
        ],
        outputs=[
            NodeOutputField(name="status_code", display_name="Status Code", type="number"),
            NodeOutputField(name="response_body", display_name="Response Body", type="object"),
            NodeOutputField(name="headers", display_name="Response Headers", type="object"),
            NodeOutputField(name="ok", display_name="Success (2xx)", type="boolean"),
            NodeOutputField(name="response_text", display_name="Response Text", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "url")

        url: str = str(config["url"])
        method: str = config.get("method", "GET").upper()
        headers: Dict = config.get("headers", {}) or {}
        body = config.get("body") or None
        params = config.get("query_params", {}) or {}
        timeout: float = float(config.get("timeout", 30))

        try:
            import httpx
        except ImportError:
            raise NodeExecutionError("httpx is not installed. Add it to requirements.txt.", self.definition.type)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                request_kwargs: Dict[str, Any] = {
                    "method": method,
                    "url": url,
                    "headers": headers,
                    "params": params,
                }
                if body and method not in ("GET", "DELETE", "HEAD"):
                    if isinstance(body, dict):
                        request_kwargs["json"] = body
                    else:
                        request_kwargs["content"] = str(body).encode()

                response = await client.request(**request_kwargs)

            # Try to parse JSON body
            try:
                response_body = response.json()
            except Exception:
                response_body = {}

            return {
                "status_code": response.status_code,
                "response_body": response_body,
                "headers": dict(response.headers),
                "ok": 200 <= response.status_code < 300,
                "response_text": response.text,
            }

        except httpx.TimeoutException:
            raise NodeExecutionError(f"Request to {url} timed out after {timeout}s", self.definition.type)
        except httpx.RequestError as exc:
            raise NodeExecutionError(f"HTTP request failed: {exc}", self.definition.type)
