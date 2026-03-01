"""IfCondition — branches workflow execution based on a comparison."""

from __future__ import annotations
import re
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


_OPERATORS = [
    SelectOption(value="==", label="equals (==)"),
    SelectOption(value="!=", label="not equals (!=)"),
    SelectOption(value=">", label="greater than (>)"),
    SelectOption(value="<", label="less than (<)"),
    SelectOption(value=">=", label="greater than or equal (>=)"),
    SelectOption(value="<=", label="less than or equal (<=)"),
    SelectOption(value="contains", label="contains"),
    SelectOption(value="not_contains", label="does not contain"),
    SelectOption(value="starts_with", label="starts with"),
    SelectOption(value="ends_with", label="ends with"),
    SelectOption(value="is_empty", label="is empty"),
    SelectOption(value="is_not_empty", label="is not empty"),
    SelectOption(value="regex", label="matches regex"),
]


def _coerce(value: Any) -> Any:
    """Try to coerce string to number/bool for comparison."""
    if isinstance(value, str):
        if value.lower() == "true":
            return True
        if value.lower() == "false":
            return False
        try:
            return int(value)
        except ValueError:
            pass
        try:
            return float(value)
        except ValueError:
            pass
    return value


def _evaluate(left: Any, operator: str, right: Any) -> bool:
    left = _coerce(left)
    right = _coerce(right)

    if operator == "==":
        return left == right
    if operator == "!=":
        return left != right
    if operator == ">":
        return left > right  # type: ignore[operator]
    if operator == "<":
        return left < right  # type: ignore[operator]
    if operator == ">=":
        return left >= right  # type: ignore[operator]
    if operator == "<=":
        return left <= right  # type: ignore[operator]
    if operator == "contains":
        return str(right).lower() in str(left).lower()
    if operator == "not_contains":
        return str(right).lower() not in str(left).lower()
    if operator == "starts_with":
        return str(left).lower().startswith(str(right).lower())
    if operator == "ends_with":
        return str(left).lower().endswith(str(right).lower())
    if operator == "is_empty":
        return not left and left != 0
    if operator == "is_not_empty":
        return bool(left) or left == 0
    if operator == "regex":
        try:
            return bool(re.search(str(right), str(left)))
        except re.error:
            return False
    return False


class IfCondition(BaseNode):
    definition = NodeDefinition(
        type="IfCondition",
        display_name="If Condition",
        description=(
            "Branch workflow execution based on a condition. "
            "Connects 'true' and 'false' branches via the condition field in connections."
        ),
        category="Logic",
        icon="🔀",
        color="#EF4444",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="left",
                display_name="Left Value",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Left side of the comparison. Supports {{$node.x.y}} expressions.",
                placeholder="{{$node.n1.status_code}}",
            ),
            NodeParameter(
                name="operator",
                display_name="Operator",
                type=ParameterType.OPTIONS,
                required=True,
                default="==",
                options=_OPERATORS,
            ),
            NodeParameter(
                name="right",
                display_name="Right Value",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Right side of the comparison (not needed for is_empty / is_not_empty).",
                placeholder="200",
            ),
        ],
        outputs=[
            NodeOutputField(name="branch", display_name="Branch", type="string",
                            description="'true' or 'false' — used by engine to route connections"),
            NodeOutputField(name="result", display_name="Result", type="boolean"),
            NodeOutputField(name="left", display_name="Left Value", type="string"),
            NodeOutputField(name="operator", display_name="Operator", type="string"),
            NodeOutputField(name="right", display_name="Right Value", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        left = config.get("left")
        operator = config.get("operator", "==")
        right = config.get("right")

        if left is None:
            raise NodeExecutionError("'left' value is required", self.definition.type)

        result = _evaluate(left, operator, right)
        branch = "true" if result else "false"

        return {
            "branch": branch,
            "result": result,
            "left": str(left),
            "operator": operator,
            "right": str(right) if right is not None else "",
        }
