"""Chat Input — accepts a user chat message as workflow input."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType


class ChatInput(BaseNode):
    definition = NodeDefinition(
        type="ChatInput",
        display_name="Chat Input",
        description="Accepts a user chat message and passes it into the workflow.",
        category="Actions",
        icon="💭",
        color="#10B981",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="message",
                display_name="Message",
                type=ParameterType.EXPRESSION,
                required=False,
                description="The chat message text. Defaults to input_data.message if not set.",
                placeholder="{{$trigger.input_data.message}}",
            ),
            NodeParameter(
                name="session_id",
                display_name="Session ID",
                type=ParameterType.EXPRESSION,
                required=False,
                description="Optional session identifier for multi-turn conversations.",
                placeholder="{{$trigger.input_data.session_id}}",
            ),
        ],
        outputs=[
            NodeOutputField(name="message", display_name="Message", type="string"),
            NodeOutputField(name="session_id", display_name="Session ID", type="string"),
            NodeOutputField(name="timestamp", display_name="Timestamp", type="string"),
            NodeOutputField(name="word_count", display_name="Word Count", type="number"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        message = config.get("message") or input_data.get("message", "")
        session_id = config.get("session_id") or input_data.get("session_id", "")
        word_count = len(str(message).split()) if message else 0

        return {
            "message": str(message),
            "session_id": str(session_id),
            "timestamp": self._now_iso(),
            "word_count": word_count,
        }
