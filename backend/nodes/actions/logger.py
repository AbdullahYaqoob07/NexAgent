"""Logger — logs a message to the execution output."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, SelectOption


class Logger(BaseNode):
    definition = NodeDefinition(
        type="Logger",
        display_name="Logger",
        description="Log a message or value to the execution output. Useful for debugging.",
        category="Actions",
        icon="📋",
        color="#6B7280",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="message",
                display_name="Message",
                type=ParameterType.EXPRESSION,
                required=False,
                default="",
                description="Message or value to log. Supports {{$node.x.y}} expressions.",
                placeholder="{{$node.n1.triggered_at}}",
            ),
            NodeParameter(
                name="level",
                display_name="Log Level",
                type=ParameterType.OPTIONS,
                required=False,
                default="info",
                options=[
                    SelectOption(value="debug", label="Debug"),
                    SelectOption(value="info", label="Info"),
                    SelectOption(value="warning", label="Warning"),
                    SelectOption(value="error", label="Error"),
                ],
            ),
            NodeParameter(
                name="include_input",
                display_name="Include Input Data",
                type=ParameterType.BOOLEAN,
                required=False,
                default=False,
                description="Also log the full input data from the previous node",
            ),
        ],
        outputs=[
            NodeOutputField(name="logged", display_name="Logged", type="boolean"),
            NodeOutputField(name="message", display_name="Message", type="string"),
            NodeOutputField(name="level", display_name="Log Level", type="string"),
            NodeOutputField(name="logged_at", display_name="Logged At", type="string"),
            NodeOutputField(name="input_data", display_name="Input Data", type="object"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        import logging as _logging
        message = config.get("message", "")
        level = config.get("level", "info").lower()
        include_input = config.get("include_input", False)

        if isinstance(message, (dict, list)):
            import json
            message = json.dumps(message, indent=2)

        log_fn = getattr(_logging.getLogger(__name__), level, _logging.getLogger(__name__).info)
        log_fn("[Workflow Logger] %s", message)

        return {
            "logged": True,
            "message": str(message),
            "level": level,
            "logged_at": self._now_iso(),
            "input_data": input_data if include_input else {},
        }
