"""Send Email — sends an email via SMTP."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class SendEmail(BaseNode):
    definition = NodeDefinition(
        type="SendEmail",
        display_name="Send Email",
        description="Send an email via SMTP. All credentials must be entered in the node config.",
        category="Actions",
        icon="📧",
        color="#F59E0B",
        is_trigger=False,
        parameters=[
            NodeParameter(
                name="to",
                display_name="To",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Recipient email address(es). Comma-separated for multiple.",
                placeholder="user@example.com",
            ),
            NodeParameter(
                name="subject",
                display_name="Subject",
                type=ParameterType.EXPRESSION,
                required=True,
                placeholder="Hello from NexAgent",
            ),
            NodeParameter(
                name="body",
                display_name="Body",
                type=ParameterType.EXPRESSION,
                required=True,
                description="Email body. Supports plain text or HTML.",
                placeholder="Hi there!",
            ),
            NodeParameter(
                name="smtp_host",
                display_name="SMTP Host",
                type=ParameterType.STRING,
                required=True,
                default="",
                description="SMTP server hostname (e.g. smtp.gmail.com).",
                placeholder="smtp.gmail.com",
            ),
            NodeParameter(
                name="smtp_port",
                display_name="SMTP Port",
                type=ParameterType.NUMBER,
                required=False,
                default=587,
                description="SMTP port. 587 for TLS, 465 for SSL.",
            ),
            NodeParameter(
                name="smtp_user",
                display_name="SMTP Username",
                type=ParameterType.STRING,
                required=True,
                default="",
                description="SMTP login email address.",
                placeholder="you@gmail.com",
            ),
            NodeParameter(
                name="smtp_pass",
                display_name="SMTP Password",
                type=ParameterType.CREDENTIAL,
                required=True,
                description="SMTP password or app password.",
                is_private=True,
            ),
            NodeParameter(
                name="from_email",
                display_name="From Email",
                type=ParameterType.STRING,
                required=False,
                default="",
                description="Sender address. Defaults to SMTP Username if blank.",
                placeholder="noreply@example.com",
            ),
            NodeParameter(
                name="from_name",
                display_name="From Name",
                type=ParameterType.STRING,
                required=False,
                default="NexAgent",
            ),
            NodeParameter(
                name="is_html",
                display_name="Send as HTML",
                type=ParameterType.BOOLEAN,
                required=False,
                default=False,
            ),
        ],
        outputs=[
            NodeOutputField(name="sent", display_name="Sent", type="boolean"),
            NodeOutputField(name="message_id", display_name="Message ID", type="string"),
            NodeOutputField(name="sent_at", display_name="Sent At", type="string"),
            NodeOutputField(name="to", display_name="Recipients", type="string"),
        ],
    )

    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: Any,
    ) -> Dict[str, Any]:
        self._require(config, "to", "subject", "body")

        to = str(config["to"])
        subject = str(config["subject"])
        body = str(config["body"])
        from_name = config.get("from_name", "NexAgent")
        is_html = config.get("is_html", False)

        # All SMTP credentials must be provided in the node config — no .env fallback
        smtp_host = str(config.get("smtp_host") or "").strip()
        smtp_port = int(config.get("smtp_port") or 587)
        smtp_user = str(config.get("smtp_user") or "").strip()
        smtp_pass = str(config.get("smtp_pass") or "").strip()
        from_email = str(config.get("from_email") or "").strip() or smtp_user

        if not smtp_host:
            raise NodeExecutionError(
                "SMTP Host is required. Enter it in the node config (e.g. smtp.gmail.com).",
                self.definition.type,
            )
        if not smtp_user or not smtp_pass:
            raise NodeExecutionError(
                "SMTP Username and Password are required. Enter them in the node config.",
                self.definition.type,
            )

        try:
            import aiosmtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            import uuid

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{from_name} <{from_email}>"
            msg["To"] = to
            message_id = f"<{uuid.uuid4()}@nexagent>"
            msg["Message-ID"] = message_id

            content_type = "html" if is_html else "plain"
            msg.attach(MIMEText(body, content_type))

            await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_pass,
                start_tls=True,
            )

            return {
                "sent": True,
                "message_id": message_id,
                "sent_at": self._now_iso(),
                "to": to,
            }
        except NodeExecutionError:
            raise
        except Exception as exc:
            raise NodeExecutionError(f"Failed to send email: {exc}", self.definition.type)
