"""Send Email — sends an email via SMTP."""

from __future__ import annotations
from typing import Any, Dict
from nodes.base import BaseNode, NodeDefinition, NodeParameter, NodeOutputField, ParameterType, NodeExecutionError


class SendEmail(BaseNode):
    definition = NodeDefinition(
        type="SendEmail",
        display_name="Send Email",
        description="Send an email via SMTP. Requires SMTP credentials configured in the backend.",
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

        # Get SMTP settings from app config
        from app.core.config import settings

        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_user = settings.SMTP_USERNAME
        smtp_pass = settings.SMTP_PASSWORD
        from_email = settings.EMAIL_FROM

        if not smtp_user or not smtp_pass:
            raise NodeExecutionError(
                "SMTP credentials not configured. Set SMTP_USERNAME and SMTP_PASSWORD in backend .env.",
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
        except ImportError:
            raise NodeExecutionError(
                "aiosmtplib is not installed. Add 'aiosmtplib' to requirements.txt.",
                self.definition.type,
            )
        except Exception as exc:
            raise NodeExecutionError(f"Failed to send email: {exc}", self.definition.type)
