"""Slack Message — posts a message to a Slack channel."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class SlackMessage(BaseNode):
    definition = NodeDefinition(
        type="SlackMessage",
        display_name="Slack Message",
        description="Post a message to a Slack channel using a Bot Token.",
        category="Actions",
        icon="💬",
        color="#4A154B",
        is_trigger=False,
        required_credentials=["slack_bot_token"],
        parameters=[
            NodeParameter(
                name="channel",
                display_name="Channel",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Channel ID or name (e.g. #general or C012345678)",
                placeholder="#general",
            ),
            NodeParameter(
                name="message",
                display_name="Message",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Message text. Supports Slack markdown and {{$node.x.y}} expressions.",
                placeholder="Hello from NexAgent!",
            ),
            NodeParameter(
                name="token",
                display_name="Bot Token",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Slack Bot Token (xoxb-...). Store in Credentials for security.",
                is_private=True,
            ),
            NodeParameter(
                name="username",
                display_name="Bot Name",
                type=ParameterType.STRING,
                required=False,
                default="NexAgent",
            ),
        ],
        outputs=[
            NodeOutputField(name="sent", display_name="Sent", type="boolean"),
            NodeOutputField(name="timestamp", display_name="Message Timestamp", type="string"),
            NodeOutputField(name="channel", display_name="Channel", type="string"),
            NodeOutputField(name="sent_at", display_name="Sent At", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "channel", "message")

        channel = str(config["channel"])
        message = str(config["message"])
        token = config.get("token") or context.get_credential("slack_bot_token", "token", "")
        username = config.get("username", "NexAgent")

        if not token:
            raise NodeExecutionError(
                "Slack bot token is required. Set it in the node config or in Credentials.",
                self.definition.type,
            )

        try:
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"channel": channel, "text": message, "username": username},
                )
                data = response.json()

            if not data.get("ok"):
                raise NodeExecutionError(
                    f"Slack API error: {data.get('error', 'unknown')}",
                    self.definition.type,
                )

            return {
                "sent": True,
                "timestamp": data.get("ts", ""),
                "channel": data.get("channel", channel),
                "sent_at": self._now_iso(),
            }
        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Slack request failed: {exc}", self.definition.type)
