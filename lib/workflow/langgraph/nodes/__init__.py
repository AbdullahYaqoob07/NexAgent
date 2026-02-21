"""
Node Executors Package - Only 20 core implemented node executors
"""
try:
    from .base import BaseNodeExecutor
    
    # Triggers (3)
    from .triggers import (
        ScheduleTriggerExecutor,
        WebhookTriggerExecutor,
        ManualTriggerExecutor
    )
    
    # Actions (4)
    from .actions import (
        LoggerExecutor,
        HttpRequestExecutor,
        EmailExecutor,
        SlackExecutor,
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
        # ClaudeAIExecutor,  # TODO: Implement
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
    LoggerExecutor = None
    HttpRequestExecutor = None
    EmailExecutor = None
    SlackExecutor = None
    IfConditionExecutor = None
    LoopExecutor = None
    DelayExecutor = None
    StopperExecutor = None
    OpenAIExecutor = None
    DateFormatterExecutor = None
    JsonParseExecutor = None

__all__ = [
    "BaseNodeExecutor",
    # Triggers (3)
    "ScheduleTriggerExecutor",
    "WebhookTriggerExecutor",
    "ManualTriggerExecutor",
    # Actions (4)
    "LoggerExecutor",
    "HttpRequestExecutor",
    "EmailExecutor",
    "SlackExecutor",
    # Logic (4)
    "IfConditionExecutor",
    "LoopExecutor",
    "DelayExecutor",
    "StopperExecutor",
    # AI/ML (2)
    "OpenAIExecutor",
    # Data (2)
    "DateFormatterExecutor",
    "JsonParseExecutor",
]
