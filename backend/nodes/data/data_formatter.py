"""Data Formatter — transforms strings, numbers, and dates."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


_OPERATIONS = [
    SelectOption(value="uppercase", label="Uppercase"),
    SelectOption(value="lowercase", label="Lowercase"),
    SelectOption(value="trim", label="Trim whitespace"),
    SelectOption(value="capitalize", label="Capitalize"),
    SelectOption(value="reverse", label="Reverse string"),
    SelectOption(value="replace", label="Replace text"),
    SelectOption(value="number_format", label="Format number"),
    SelectOption(value="date_format", label="Format date"),
    SelectOption(value="to_string", label="Convert to string"),
    SelectOption(value="to_number", label="Convert to number"),
]


class DataFormatter(BaseNode):
    definition = NodeDefinition(
        type="DataFormatter",
        display_name="Data Formatter",
        description="Transform a value using common string, number, or date operations.",
        category="Data",
        icon="🔧",
        color="#0891B2",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="input",
                display_name="Input Value",
                type=ParameterType.EXPRESSION,
                required=True,
                description="The value to format. Supports {{$node.x.y}} expressions.",
                placeholder="{{$node.n1.message}}",
            ),
            NodeParameter(
                name="operation",
                display_name="Operation",
                type=ParameterType.OPTIONS,
                required=True,
                default="uppercase",
                options=_OPERATIONS,
            ),
            NodeParameter(
                name="find",
                display_name="Find (for replace)",
                type=ParameterType.STRING,
                required=False,
                description="Text to find (used with 'replace' operation)",
            ),
            NodeParameter(
                name="replace_with",
                display_name="Replace With",
                type=ParameterType.STRING,
                required=False,
                description="Replacement text (used with 'replace' operation)",
            ),
            NodeParameter(
                name="decimal_places",
                display_name="Decimal Places",
                type=ParameterType.NUMBER,
                required=False,
                default=2,
                description="Number of decimal places (used with 'number_format' operation)",
            ),
            NodeParameter(
                name="date_format",
                display_name="Date Format",
                type=ParameterType.STRING,
                required=False,
                default="%Y-%m-%d",
                description="strftime format string (used with 'date_format' operation)",
                placeholder="%Y-%m-%d %H:%M:%S",
            ),
        ],
        outputs=[
            NodeOutputField(name="formatted", display_name="Formatted Value", type="string"),
            NodeOutputField(name="original", display_name="Original Value", type="string"),
            NodeOutputField(name="operation", display_name="Operation Applied", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        value = config.get("input", "")
        operation = config.get("operation", "uppercase")
        original = str(value)

        try:
            formatted = self._apply(value, operation, config)
        except Exception as exc:
            raise NodeExecutionError(
                f"DataFormatter failed for operation '{operation}': {exc}",
                self.definition.type,
            )

        return {
            "formatted": str(formatted),
            "original": original,
            "operation": operation,
        }

    def _apply(self, value: Any, operation: str, config: Dict[str, Any]) -> Any:
        s = str(value)
        if operation == "uppercase":
            return s.upper()
        if operation == "lowercase":
            return s.lower()
        if operation == "trim":
            return s.strip()
        if operation == "capitalize":
            return s.capitalize()
        if operation == "reverse":
            return s[::-1]
        if operation == "replace":
            find = config.get("find", "")
            replace_with = config.get("replace_with", "")
            return s.replace(find, replace_with)
        if operation == "number_format":
            dp = int(config.get("decimal_places", 2))
            return f"{float(value):.{dp}f}"
        if operation == "date_format":
            from datetime import datetime
            fmt = config.get("date_format", "%Y-%m-%d")
            if isinstance(value, datetime):
                return value.strftime(fmt)
            # Try parsing ISO string
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return dt.strftime(fmt)
        if operation == "to_string":
            return str(value)
        if operation == "to_number":
            try:
                return int(value)
            except (ValueError, TypeError):
                return float(value)
        return s
