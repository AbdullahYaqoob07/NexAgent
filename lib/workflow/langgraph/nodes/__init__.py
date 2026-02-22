"""
Node Executors Package - All core implemented node executors
"""
try:
    from .base import BaseNodeExecutor
    
    # Triggers (4)
    from .triggers import (
        ScheduleTriggerExecutor,
        WebhookTriggerExecutor,
        ManualTriggerExecutor,
        ChatInputExecutor
    )
    
    # Actions (8)
    from .actions import (
        LoggerExecutor,
        HttpRequestExecutor,
        EmailExecutor,
        SlackExecutor,
        TelegramExecutor,
        GoogleSheetsExecutor,
        GoogleDriveExecutor,
        StripeExecutor,
    )
    
    # Logic (4)
    from .logic import (
        IfConditionExecutor,
        LoopExecutor,
        DelayExecutor,
        StopperExecutor
    )
    
    # AI/ML (2)
    from .ai_ml import (
        OpenAIExecutor,
        ClaudeAIExecutor,
    )
    
    # Data (2)
    from .data import (
        DateFormatterExecutor,
        JsonParseExecutor,
    )
    
except ImportError as e:
    # Handle import errors gracefully
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Some node executors could not be imported: {e}")
    # Define placeholders to prevent import errors
    BaseNodeExecutor = None
    ScheduleTriggerExecutor = None
    WebhookTriggerExecutor = None
    ManualTriggerExecutor = None
    ChatInputExecutor = None
    LoggerExecutor = None
    HttpRequestExecutor = None
    EmailExecutor = None
    SlackExecutor = None
    TelegramExecutor = None
    GoogleSheetsExecutor = None
    GoogleDriveExecutor = None
    StripeExecutor = None
    IfConditionExecutor = None
    LoopExecutor = None
    DelayExecutor = None
    StopperExecutor = None
    OpenAIExecutor = None
    ClaudeAIExecutor = None
    DateFormatterExecutor = None
    JsonParseExecutor = None

__all__ = [
    "BaseNodeExecutor",
    # Triggers (4)
    "ScheduleTriggerExecutor",
    "WebhookTriggerExecutor",
    "ManualTriggerExecutor",
    "ChatInputExecutor",
    # Actions (8)
    "LoggerExecutor",
    "HttpRequestExecutor",
    "EmailExecutor",
    "SlackExecutor",
    "TelegramExecutor",
    "GoogleSheetsExecutor",
    "GoogleDriveExecutor",
    "StripeExecutor",
    # Logic (4)
    "IfConditionExecutor",
    "LoopExecutor",
    "DelayExecutor",
    "StopperExecutor",
    # AI/ML (2)
    "OpenAIExecutor",
    "ClaudeAIExecutor",
    # Data (2)
    "DateFormatterExecutor",
    "JsonParseExecutor",
]
