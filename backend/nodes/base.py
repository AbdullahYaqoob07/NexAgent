"""
Base classes and Pydantic models for the NexAgent node system.

Every node inherits from BaseNode and declares a static `definition: NodeDefinition`.
The execute() method receives resolved config, previous node output, and execution context.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from enum import Enum
from typing import Any, ClassVar, Dict, List, Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Parameter / Output field models
# ---------------------------------------------------------------------------

class ParameterType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OPTIONS = "options"        # dropdown select
    COLLECTION = "collection"  # list of key-value pairs
    CREDENTIAL = "credential"  # reference to a stored credential
    EXPRESSION = "expression"  # {{$node.x.y}} expression


class SelectOption(BaseModel):
    value: str
    label: str


class NodeParameter(BaseModel):
    name: str                              # internal key, e.g. "duration"
    display_name: str                      # shown in config modal
    type: ParameterType
    required: bool = False
    default: Any = None
    description: str = ""
    placeholder: str = ""
    options: Optional[List[SelectOption]] = None  # for OPTIONS type
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    is_private: bool = False               # if True, value is NOT shared in marketplace listings


class NodeOutputField(BaseModel):
    name: str           # key in output dict, e.g. "response_body"
    display_name: str   # shown in variable picker
    type: str           # string | number | boolean | object | array
    description: str = ""


class NodeDefinition(BaseModel):
    type: str                              # canonical type, e.g. "Delay"
    display_name: str
    description: str
    category: str                          # Triggers | Actions | Logic | Data | AI | Integrations
    icon: str                              # emoji or icon identifier
    color: str                             # hex color for canvas node
    is_trigger: bool = False               # can this be a workflow start node?
    parameters: List[NodeParameter]
    outputs: List[NodeOutputField]
    required_credentials: List[str] = []  # credential types required, e.g. ["openai_api_key"]


# ---------------------------------------------------------------------------
# Execution log
# ---------------------------------------------------------------------------

class NodeStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class NodeLog(BaseModel):
    node_id: str
    node_type: str
    node_name: str
    status: NodeStatus
    started_at: str
    finished_at: str
    duration_ms: float
    input: Dict[str, Any] = {}
    output: Dict[str, Any] = {}
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class NodeExecutionError(Exception):
    """Raised by a node when execution fails."""

    def __init__(self, message: str, node_type: str = "", details: Any = None):
        super().__init__(message)
        self.node_type = node_type
        self.details = details


class UnknownNodeTypeError(Exception):
    """Raised when a workflow references a node type not in the registry."""
    pass


# ---------------------------------------------------------------------------
# Base node
# ---------------------------------------------------------------------------

class BaseNode(ABC):
    """
    Abstract base class for all workflow nodes.

    Subclasses MUST define a class-level `definition: NodeDefinition`.
    Subclasses MUST implement `async execute(config, input_data, context) -> dict`.
    """

    definition: ClassVar[NodeDefinition]

    @abstractmethod
    async def execute(
        self,
        config: Dict[str, Any],
        input_data: Dict[str, Any],
        context: "ExecutionContext",  # forward ref, defined in executor/context.py
    ) -> Dict[str, Any]:
        """
        Execute node logic.

        Args:
            config:     Resolved user configuration (all {{...}} already substituted).
            input_data: Output dict from the immediately preceding node.
            context:    Shared execution context (credentials, variables, node outputs).

        Returns:
            A dict of output fields matching definition.outputs.

        Raises:
            NodeExecutionError: on execution failure.
        """
        pass

    # ------------------------------------------------------------------
    # Helpers available to all nodes
    # ------------------------------------------------------------------

    def _require(self, config: Dict[str, Any], *keys: str) -> None:
        """Raise NodeExecutionError if any required key is missing or falsy."""
        for key in keys:
            if not config.get(key):
                raise NodeExecutionError(
                    f"Missing required config field '{key}'",
                    node_type=self.definition.type,
                )

    def _now_iso(self) -> str:
        """Return current UTC timestamp as ISO 8601 string."""
        return datetime.now(timezone.utc).isoformat()

    def _get(self, data: Dict[str, Any], *path: str, default: Any = None) -> Any:
        """Safe nested get: self._get(d, 'a', 'b', 'c') == d.get('a',{}).get('b',{}).get('c')"""
        current = data
        for key in path:
            if not isinstance(current, dict):
                return default
            current = current.get(key, default)
        return current
