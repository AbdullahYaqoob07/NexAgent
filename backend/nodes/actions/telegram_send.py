"""Telegram Send — sends a Telegram message via Bot API."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError, SelectOption


class TelegramSend(BaseNode):
    definition = NodeDefinition(
        type="TelegramSend",
        display_name="Telegram Send",
        description="Send a message via a Telegram bot to a chat or channel.",
        category="Actions",
        icon="✈️",
        color="#229ED9",
        is_trigger=False,
        required_credentials=["telegram_bot_token"],
        parameters=[
            NodeParameter(
                name="chat_id",
                display_name="Chat ID",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Telegram chat ID, group ID, or @channel_username",
                placeholder="@mychannel or 123456789",
            ),
            NodeParameter(
                name="message",
                display_name="Message",
                type=ParameterType.EXPRESSION,
                required=True,
                placeholder="Hello from NexAgent!",
            ),
            NodeParameter(
                name="token",
                display_name="Bot Token",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="Telegram Bot Token from @BotFather. Store in Credentials for security.",
                is_private=True,
            ),
            NodeParameter(
                name="parse_mode",
                display_name="Parse Mode",
                type=ParameterType.OPTIONS,
                required=False,
                default="HTML",
                options=[
                    SelectOption(value="HTML", label="HTML"),
                    SelectOption(value="Markdown", label="Markdown"),
                    SelectOption(value="", label="Plain Text"),
                ],
            ),
        ],
        outputs=[
            NodeOutputField(name="sent", display_name="Sent", type="boolean"),
            NodeOutputField(name="message_id", display_name="Message ID", type="number"),
            NodeOutputField(name="chat_id", display_name="Chat ID", type="string"),
            NodeOutputField(name="sent_at", display_name="Sent At", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "chat_id", "message")

        chat_id = str(config["chat_id"])
        message = str(config["message"])
        token = config.get("token") or context.get_credential("telegram_bot_token", "token", "")
        parse_mode = config.get("parse_mode", "HTML")

        if not token:
            raise NodeExecutionError(
                "Telegram bot token is required. Set it in the node config or in Credentials.",
                self.definition.type,
            )

        try:
            import httpx

            payload: Dict[str, Any] = {"chat_id": chat_id, "text": message}
            if parse_mode:
                payload["parse_mode"] = parse_mode

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    json=payload,
                )
                data = response.json()

            if not data.get("ok"):
                raise NodeExecutionError(
                    f"Telegram API error: {data.get('description', 'unknown')}",
                    self.definition.type,
                )

            result = data.get("result", {})
            return {
                "sent": True,
                "message_id": result.get("message_id", 0),
                "chat_id": str(result.get("chat", {}).get("id", chat_id)),
                "sent_at": self._now_iso(),
            }
        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Telegram request failed: {type(exc).__name__}: {exc}", self.definition.type)
