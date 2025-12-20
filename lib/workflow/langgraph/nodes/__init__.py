"""
Node Executors Package
All node executors are registered here
"""
try:
    from .base import BaseNodeExecutor
    from .triggers import (
        ScheduleTriggerExecutor,
        WebhookTriggerExecutor,
        ManualTriggerExecutor
    )
    from .actions import (
        LoggerExecutor,
        VariableSetterExecutor,
        LoggerExecutor,
        VariableSetterExecutor,
        HttpRequestExecutor,
        EmailExecutor,
        SlackExecutor,
        DatabaseExecutor
    )
    from .logic import (
        TimerExecutor,
        CounterExecutor,
        BooleanExecutor,
        TimerExecutor,
        CounterExecutor,
        BooleanExecutor,
        IfConditionExecutor,
        SwitchExecutor,
        LoopExecutor,
        MergeExecutor,
        DelayExecutor
    )
    from .ai_ml import (
        OpenAIExecutor,
        TextAnalysisExecutor,
        ImageProcessingExecutor,
        DataTransformExecutor
    )
    from .data import (
        StringManipulationExecutor,
        NumberFormatterExecutor,
        DateFormatterExecutor,
        JsonParseExecutor,
        XmlParseExecutor,
        CsvParseExecutor,
        DataFilterExecutor
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
    VariableSetterExecutor = None
    HttpRequestExecutor = None
    EmailExecutor = None
    SlackExecutor = None
    DatabaseExecutor = None
    TimerExecutor = None
    CounterExecutor = None
    BooleanExecutor = None
    IfConditionExecutor = None
    SwitchExecutor = None
    LoopExecutor = None
    MergeExecutor = None
    DelayExecutor = None
    OpenAIExecutor = None
    TextAnalysisExecutor = None
    ImageProcessingExecutor = None
    DataTransformExecutor = None
    StringManipulationExecutor = None
    NumberFormatterExecutor = None
    DateFormatterExecutor = None
    JsonParseExecutor = None
    XmlParseExecutor = None
    CsvParseExecutor = None
    DataFilterExecutor = None

__all__ = [
    "BaseNodeExecutor",
    # Triggers
    "ScheduleTriggerExecutor",
    "WebhookTriggerExecutor",
    "ManualTriggerExecutor",
    # Actions
    "LoggerExecutor",
    "VariableSetterExecutor",
    "LoggerExecutor",
    "VariableSetterExecutor",
    "HttpRequestExecutor",
    "EmailExecutor",
    "SlackExecutor",
    "DatabaseExecutor",
    # Logic
    "TimerExecutor",
    "CounterExecutor",
    "BooleanExecutor",
    "TimerExecutor",
    "CounterExecutor",
    "BooleanExecutor",
    "IfConditionExecutor",
    "SwitchExecutor",
    "LoopExecutor",
    "MergeExecutor",
    "DelayExecutor",
    # AI/ML
    "OpenAIExecutor",
    "TextAnalysisExecutor",
    "ImageProcessingExecutor",
    "DataTransformExecutor",
    # Data
    "StringManipulationExecutor",
    "NumberFormatterExecutor",
    "DateFormatterExecutor",
    "JsonParseExecutor",
    "XmlParseExecutor",
    "CsvParseExecutor",
    "DataFilterExecutor",
]

