"""Loop — iterates over an array, emitting one item at a time downstream.

Note: The engine handles iteration by running downstream nodes once per item
using the loop node's output. The loop node itself returns metadata about the
current iteration. The engine detects Loop nodes and handles the repeat logic.
For simplicity, this node returns the full items list; the engine picks items
one at a time.
"""

from __future__ import annotations
from typing import Any, Dict, List
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class Loop(BaseNode):
    definition = NodeDefinition(
        type="Loop",
        display_name="Loop",
        description=(
            "Iterate over an array. For each item, the connected downstream "
            "nodes execute once. Use {{$node.loopId.current_item}} to access the current item."
        ),
        category="Logic",
        icon="🔁",
        color="#F97316",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="items",
                display_name="Items",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Array to iterate over. Use {{$node.x.y}} to reference a previous node's output.",
                placeholder='["item1", "item2"]',
            ),
            NodeParameter(
                name="items_path",
                display_name="Items Path (alternative)",
                type=ParameterType.STRING,
                required=False,
                description="Dot-notation path into input_data to find the array (e.g. 'response_body.users')",
                placeholder="response_body.users",
            ),
        ],
        outputs=[
            NodeOutputField(name="items", display_name="All Items", type="array"),
            NodeOutputField(name="total", display_name="Total Count", type="number"),
            NodeOutputField(name="current_item", display_name="Current Item", type="object",
                            description="The item for the current iteration"),
            NodeOutputField(name="index", display_name="Index", type="number",
                            description="0-based index of the current iteration"),
            NodeOutputField(name="is_last", display_name="Is Last Item", type="boolean"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        items: Any = config.get("items")

        # If items_path is provided, resolve from input_data
        items_path = config.get("items_path", "")
        if (items is None or items == "") and items_path:
            parts = items_path.split(".")
            current = input_data
            for part in parts:
                if isinstance(current, dict):
                    current = current.get(part)
                else:
                    current = None
                    break
            items = current

        if items is None:
            raise NodeExecutionError(
                "No items to iterate. Set 'items' config or 'items_path'.",
                self.definition.type,
            )

        if not isinstance(items, list):
            # Wrap scalar in list
            items = [items]

        total = len(items)

        # Return metadata for the first iteration; engine handles subsequent
        first_item = items[0] if items else None
        return {
            "items": items,
            "total": total,
            "current_item": first_item,
            "index": 0,
            "is_last": total <= 1,
        }
