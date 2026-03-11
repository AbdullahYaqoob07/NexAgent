"""ManualTrigger — starts a workflow manually (via UI Run button or API call)."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType


class ManualTrigger(BaseNode):
    definition = NodeDefinition(
        type="ManualTrigger",
        display_name="Manual Trigger",
        description="Start a workflow manually via the Run button or API call.",
        category="Triggers",
        icon="▶️",
        color="#22C55E",
        is_trigger=True,
        parameters=[],
        outputs=[
            NodeOutputField(name="triggered_at", display_name="Triggered At", type="string",
                            description="ISO 8601 timestamp when the workflow was triggered"),
            NodeOutputField(name="timestamp", display_name="Timestamp", type="string",
                            description="Alias for triggered_at — ISO 8601 timestamp"),
            NodeOutputField(name="input_data", display_name="Input Data", type="object",
                            description="Any input data passed when triggering the workflow"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        ts = self._now_iso()
        return {
            "triggered_at": ts,
            "timestamp": ts,
            "input_data": input_data,
        }
