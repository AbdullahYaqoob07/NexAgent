"""Set Variable — writes a value to a workflow-level variable."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class SetVariable(BaseNode):
    definition = NodeDefinition(
        type="SetVariable",
        display_name="Set Variable",
        description=(
            "Write a value to a workflow-level variable. "
            "Access it later with {{$vars.variableName}} in any node."
        ),
        category="Data",
        icon="📌",
        color="#7C3AED",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="variable_name",
                display_name="Variable Name",
                type=ParameterType.STRING,
                required=True,
                description="Name of the variable to set.",
                placeholder="myVariable",
            ),
            NodeParameter(
                name="value",
                display_name="Value",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Value to assign. Supports {{$node.x.y}} expressions.",
                placeholder="{{$node.n1.response_body}}",
            ),
        ],
        outputs=[
            NodeOutputField(name="variable_name", display_name="Variable Name", type="string"),
            NodeOutputField(name="value", display_name="Value Set", type="object"),
            NodeOutputField(name="set_at", display_name="Set At", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "variable_name")

        name = str(config["variable_name"])
        value = config.get("value")

        context.set_variable(name, value)

        return {
            "variable_name": name,
            "value": value,
            "set_at": self._now_iso(),
        }
