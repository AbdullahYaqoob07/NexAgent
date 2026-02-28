"""Webhook — receives an inbound HTTP webhook and starts a workflow."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType


class Webhook(BaseNode):
    definition = NodeDefinition(
        type="Webhook",
        display_name="Webhook",
        description="Start a workflow when an inbound HTTP webhook is received.",
        category="Triggers",
        icon="🔗",
        color="#8B5CF6",
        is_trigger=True,
        parameters=[
            NodeParameter(
                name="path",
                display_name="Webhook Path",
                type=ParameterType.STRING,
                required=False,
                default="",
                description="Optional custom path suffix for this webhook",
                placeholder="/my-webhook",
            ),
            NodeParameter(
                name="allowed_methods",
                display_name="Allowed Methods",
                type=ParameterType.OPTIONS,
                required=False,
                default="POST",
                options=[
                    {"value": "POST", "label": "POST"},
                    {"value": "GET", "label": "GET"},
                    {"value": "ANY", "label": "Any"},
                ],
            ),
        ],
        outputs=[
            NodeOutputField(name="body", display_name="Request Body", type="object",
                            description="Parsed JSON body of the incoming request"),
            NodeOutputField(name="headers", display_name="Headers", type="object"),
            NodeOutputField(name="method", display_name="HTTP Method", type="string"),
            NodeOutputField(name="query_params", display_name="Query Parameters", type="object"),
            NodeOutputField(name="triggered_at", display_name="Triggered At", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        # input_data is populated by the webhook handler in the API layer
        return {
            "body": input_data.get("body", {}),
            "headers": input_data.get("headers", {}),
            "method": input_data.get("method", "POST"),
            "query_params": input_data.get("query_params", {}),
            "triggered_at": self._now_iso(),
        }
