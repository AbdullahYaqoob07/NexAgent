"""Stopper — explicitly ends a workflow branch with a status and message."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, SelectOption


class Stopper(BaseNode):
    definition = NodeDefinition(
        type="Stopper",
        display_name="Stopper",
        description="Explicitly end a workflow branch with a success or error status and optional message.",
        category="Logic",
        icon="🛑",
        color="#DC2626",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="status",
                display_name="Status",
                type=ParameterType.OPTIONS,
                required=False,
                default="success",
                options=[
                    SelectOption(value="success", label="Success"),
                    SelectOption(value="error", label="Error"),
                ],
            ),
            NodeParameter(
                name="message",
                display_name="Message",
                type=ParameterType.EXPRESSION,
                required=False,
                default="",
                description="Optional message to attach to the workflow result.",
                placeholder="Workflow completed successfully",
            ),
        ],
        outputs=[
            NodeOutputField(name="status", display_name="Status", type="string"),
            NodeOutputField(name="message", display_name="Message", type="string"),
            NodeOutputField(name="stopped_at", display_name="Stopped At", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        status = config.get("status", "success")
        message = str(config.get("message", ""))

        return {
            "status": status,
            "message": message,
            "stopped_at": self._now_iso(),
        }
