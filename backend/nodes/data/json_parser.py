"""JSON Parser — parses a JSON string into a Python object."""

from __future__ import annotations
import json
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class JsonParser(BaseNode):
    definition = NodeDefinition(
        type="JsonParser",
        display_name="JSON Parser",
        description="Parse a JSON string into an object you can reference with {{$node.x.field}} expressions.",
        category="Data",
        icon="{ }",
        color="#64748B",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="json_string",
                display_name="JSON String",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The JSON string to parse. Supports {{$node.x.y}} expressions.",
                placeholder='{"key": "value"}',
            ),
        ],
        outputs=[
            NodeOutputField(name="parsed", display_name="Parsed Object", type="object",
                            description="The parsed JSON as a Python object"),
            NodeOutputField(name="keys", display_name="Top-level Keys", type="array"),
            NodeOutputField(name="is_array", display_name="Is Array", type="boolean"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        json_string = config.get("json_string")

        # If it's already a dict/list (from variable resolution), use it directly
        if isinstance(json_string, (dict, list)):
            parsed = json_string
        else:
            if not json_string:
                raise NodeExecutionError("json_string is required", self.definition.type)
            try:
                parsed = json.loads(str(json_string))
            except json.JSONDecodeError as exc:
                raise NodeExecutionError(f"Invalid JSON: {exc}", self.definition.type)

        keys = list(parsed.keys()) if isinstance(parsed, dict) else []
        is_array = isinstance(parsed, list)

        return {
            "parsed": parsed,
            "keys": keys,
            "is_array": is_array,
        }
