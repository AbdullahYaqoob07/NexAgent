# ============================================================
# NexAgent Workflow Schema v2 — Python Pydantic Models
# ============================================================
# File: app/schemas/workflow_schema.py
# Usage: Import WorkflowV2 for request validation and Firestore serialization
#
# Install deps: pip install pydantic[email] pydantic>=2.0

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Enums ────────────────────────────────────────────────────────────────────

class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class VariableType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SECRET = "secret"
    JSON = "json"


class NodeOutputType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    DATE = "date"
    TRIGGER = "trigger"
    JSON = "json"


class NodeInputType(str, Enum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"
    PASSWORD = "password"
    EMAIL = "email"
    URL = "url"
    JSON = "json"
    TRIGGER = "trigger"


# ─── Variable ────────────────────────────────────────────────────────────────

class WorkflowVariable(BaseModel):
    """
    Typed workflow-level variable.
    For secrets, set type='secret' and provide secretRef.
    value must be None when secretRef is set (never store raw credentials).
    """
    type: VariableType
    value: Optional[Union[str, int, float, bool]] = None
    secret_ref: Optional[str] = Field(None, alias="secretRef")
    description: Optional[str] = None

    @model_validator(mode="after")
    def validate_secret(self) -> WorkflowVariable:
        if self.type == VariableType.SECRET:
            if not self.secret_ref:
                raise ValueError(
                    "Secret variables must have a secretRef "
                    "(e.g. 'TELEGRAM_BOT_TOKEN')"
                )
            if self.value is not None:
                raise ValueError(
                    "Secret variables must have value=null. "
                    "Raw credentials must never be stored in workflow JSON."
                )
        return self

    model_config = {"populate_by_name": True}


# ─── Node ────────────────────────────────────────────────────────────────────

VARIABLE_PATTERN = re.compile(r"\{\{([^}]+)\}\}")


def _validate_variable_syntax(text: str) -> list[str]:
    """Returns list of syntax error messages found in a template string."""
    errors = []
    for match in VARIABLE_PATTERN.finditer(text):
        expr = match.group(1).strip()
        if not (
            expr.startswith("$trigger.")
            or expr.startswith("$node.")
            or expr.startswith("$vars.")
        ):
            errors.append(
                f"Invalid variable '{{{{ {expr} }}}}': "
                f"must start with $trigger, $node, or $vars"
            )
        if expr.startswith("$node."):
            parts = expr[6:].split(".")
            if len(parts) < 2:
                errors.append(
                    f"Invalid $node variable '{{{{ {expr} }}}}': "
                    f"must include node ID and field, e.g. {{{{$node.my_node.fieldName}}}}"
                )
    return errors


class WorkflowNode(BaseModel):
    """
    A single node instance within a workflow.

    outputMap: maps the metadata output ID (what users/UI see) →
               the actual key returned by the executor.
    e.g. { "delayedUntil": "timestamp", "delayed": "delayedData" }
    This is the fix for the metadata/executor key mismatch problem.
    """
    id: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., min_length=1)
    node_schema_version: int = Field(1, alias="nodeSchemaVersion", ge=1)  # Default to 1 for compatibility
    name: str = Field(..., min_length=1, max_length=100)
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})  # Default to origin
    config: Dict[str, Any] = Field(default_factory=dict)
    output_map: Dict[str, str] = Field(default_factory=dict, alias="outputMap")
    disabled: bool = False
    notes: Optional[str] = None

    @field_validator("position")
    @classmethod
    def validate_position(cls, v: Dict[str, float]) -> Dict[str, float]:
        if not v:
            return {"x": 0, "y": 0}
        if "x" not in v or "y" not in v:
            raise ValueError("Node position must have 'x' and 'y' keys")
        return v

    @field_validator("config")
    @classmethod
    def validate_config_variables(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        all_errors = []
        for field_name, field_value in v.items():
            if isinstance(field_value, str):
                errs = _validate_variable_syntax(field_value)
                for err in errs:
                    all_errors.append(f"config.{field_name}: {err}")
        if all_errors:
            raise ValueError("\n".join(all_errors))
        return v

    model_config = {"populate_by_name": True}


# ─── Edge ────────────────────────────────────────────────────────────────────

class WorkflowEdge(BaseModel):
    """
    A connection between two node ports.
    sourcePort and targetPort are the critical fields that were
    previously hardcoded as 'output' and 'input' — now explicit.
    Backward compatible: falls back to defaults if not provided.
    """
    id: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)       # Source node ID
    source_port: str = Field("output", alias="sourcePort")  # Default to 'output' for backward compat
    target: str = Field(..., min_length=1)       # Target node ID
    target_port: str = Field("input", alias="targetPort")   # Default to 'input' for backward compat
    enabled: bool = True
    condition: Optional[str] = None              # Template expression or null

    @field_validator("condition")
    @classmethod
    def validate_condition_syntax(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            errors = _validate_variable_syntax(v)
            if errors:
                raise ValueError(f"Invalid condition syntax: {'; '.join(errors)}")
        return v

    @model_validator(mode="after")
    def no_self_loop(self) -> WorkflowEdge:
        if self.source == self.target:
            raise ValueError(
                f"Edge '{self.id}' connects node '{self.source}' to itself. "
                f"Self-loops are not allowed."
            )
        return self

    model_config = {"populate_by_name": True}


# ─── Execution Config ────────────────────────────────────────────────────────

class RetryPolicy(BaseModel):
    max_retries: int = Field(3, alias="maxRetries", ge=0, le=10)
    backoff_ms: int = Field(1000, alias="backoffMs", ge=0)

    model_config = {"populate_by_name": True}


class ExecutionConfig(BaseModel):
    timeout_ms: int = Field(30000, alias="timeoutMs", ge=1000)
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy, alias="retryPolicy")
    parallel_execution: bool = Field(False, alias="parallelExecution")
    debug_mode: bool = Field(False, alias="debugMode")

    model_config = {"populate_by_name": True}


# ─── Metadata ────────────────────────────────────────────────────────────────

class WorkflowMetadata(BaseModel):
    tags: List[str] = Field(default_factory=list)
    is_public: bool = Field(False, alias="isPublic")
    collaborators: List[str] = Field(default_factory=list)  # User IDs

    model_config = {"populate_by_name": True}


# ─── Main Workflow Model ──────────────────────────────────────────────────────

class WorkflowV2(BaseModel):
    """
    NexAgent Workflow Schema v2.
    This is the single source of truth for workflow structure
    used by the API, Firestore, LangGraph executor, and MCP server.
    """
    schema_version: int = Field(2, alias="schemaVersion")
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    version: int = Field(1, ge=1)
    status: WorkflowStatus = WorkflowStatus.DRAFT
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="createdAt")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), alias="updatedAt")
    variables: Dict[str, WorkflowVariable] = Field(default_factory=dict)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    execution_config: ExecutionConfig = Field(
        default_factory=ExecutionConfig, alias="executionConfig"
    )
    metadata: WorkflowMetadata = Field(default_factory=WorkflowMetadata)

    @field_validator("schema_version")
    @classmethod
    def must_be_v2(cls, v: int) -> int:
        if v != 2:
            raise ValueError(f"Expected schemaVersion 2, got {v}")
        return v

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_iso_timestamp(cls, v: Any) -> str:
        # Handle Firestore Timestamp objects
        if hasattr(v, 'to_datetime'):
            return v.to_datetime().isoformat()
        # Handle Firestore Timestamp with timestamp() method
        if hasattr(v, 'timestamp'):
            return datetime.fromtimestamp(v.timestamp()).isoformat()
        # If already a string, validate it's ISO format
        if isinstance(v, str):
            try:
                datetime.fromisoformat(v.replace("Z", "+00:00"))
                return v
            except ValueError:
                raise ValueError(f"Timestamp must be ISO 8601 format, got: {v}")
        # If None or missing, use current time
        if v is None:
            return datetime.utcnow().isoformat()
        raise ValueError(f"Timestamp must be ISO 8601 string or Firestore Timestamp, got: {type(v)}")

    @model_validator(mode="after")
    def validate_graph_integrity(self) -> WorkflowV2:
        node_ids = {n.id for n in self.nodes}
        errors = []

        # Duplicate node IDs
        seen_ids: set[str] = set()
        for node in self.nodes:
            if node.id in seen_ids:
                errors.append(f"Duplicate node ID: '{node.id}'")
            seen_ids.add(node.id)

        # Duplicate edge IDs
        seen_edge_ids: set[str] = set()
        for edge in self.edges:
            if edge.id in seen_edge_ids:
                errors.append(f"Duplicate edge ID: '{edge.id}'")
            seen_edge_ids.add(edge.id)

        # Edge references must point to existing nodes
        for edge in self.edges:
            if edge.source not in node_ids:
                errors.append(
                    f"Edge '{edge.id}' references unknown source node '{edge.source}'"
                )
            if edge.target not in node_ids:
                errors.append(
                    f"Edge '{edge.id}' references unknown target node '{edge.target}'"
                )

        if errors:
            raise ValueError("\n".join(errors))

        return self

    model_config = {"populate_by_name": True}


# ─── API Request/Response Models ──────────────────────────────────────────────

class WorkflowCreateRequest(BaseModel):
    """Used for POST /api/v1/workflows"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    variables: Dict[str, WorkflowVariable] = Field(default_factory=dict)
    execution_config: ExecutionConfig = Field(
        default_factory=ExecutionConfig, alias="executionConfig"
    )
    metadata: WorkflowMetadata = Field(default_factory=WorkflowMetadata)
    status: WorkflowStatus = WorkflowStatus.DRAFT

    model_config = {"populate_by_name": True}


class WorkflowUpdateRequest(BaseModel):
    """Used for PATCH /api/v1/workflows/{id}"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    variables: Optional[Dict[str, WorkflowVariable]] = None
    execution_config: Optional[ExecutionConfig] = Field(None, alias="executionConfig")
    metadata: Optional[WorkflowMetadata] = None
    status: Optional[WorkflowStatus] = None

    model_config = {"populate_by_name": True}


class WorkflowResponse(BaseModel):
    """Returned by all workflow endpoints"""
    id: str
    user_id: str = Field(..., alias="userId")
    schema_version: int = Field(2, alias="schemaVersion")
    name: str
    description: Optional[str] = None
    version: int
    status: WorkflowStatus
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
    last_executed_at: Optional[str] = Field(None, alias="lastExecutedAt")
    execution_count: int = Field(0, alias="executionCount")
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    variables: Dict[str, WorkflowVariable]
    execution_config: ExecutionConfig = Field(..., alias="executionConfig")
    metadata: WorkflowMetadata

    model_config = {"populate_by_name": True}


# ─── Execute Endpoint Models ──────────────────────────────────────────────────

class NodeExecutionLog(BaseModel):
    """Per-node execution record returned in the response"""
    node_id: str = Field(..., alias="nodeId")
    node_type: str = Field(..., alias="nodeType")
    status: str                                          # 'completed' | 'failed' | 'skipped'
    started_at: Optional[str] = Field(None, alias="startedAt")
    completed_at: Optional[str] = Field(None, alias="completedAt")
    duration_ms: Optional[float] = Field(None, alias="durationMs")
    output: Optional[Dict[str, Any]] = None              # Resolved using outputMap
    error: Optional[str] = None

    model_config = {"populate_by_name": True}


class ExecutionSummary(BaseModel):
    workflow_id: str = Field(..., alias="workflowId")
    total_nodes: int = Field(..., alias="totalNodes")
    completed_nodes: int = Field(..., alias="completedNodes")
    failed_nodes: int = Field(..., alias="failedNodes")
    skipped_nodes: int = Field(0, alias="skippedNodes")

    model_config = {"populate_by_name": True}


class ExecuteWorkflowRequest(BaseModel):
    """POST /api/v1/workflows/{id}/execute"""
    input: Optional[Any] = None
    config_override: Optional[ExecutionConfig] = Field(None, alias="configOverride")

    model_config = {"populate_by_name": True}


class ExecuteWorkflowResponse(BaseModel):
    """Response from /execute endpoint"""
    status: str                                          # 'success' | 'error' | 'partial'
    summary: Optional[ExecutionSummary] = None
    final_output: Optional[Any] = Field(None, alias="finalOutput")
    node_logs: Optional[List[NodeExecutionLog]] = Field(None, alias="nodeLogs")
    execution_time_ms: Optional[float] = Field(None, alias="executionTimeMs")
    error: Optional[str] = None
    partial_results: Optional[List[Dict[str, Any]]] = Field(None, alias="partialResults")

    model_config = {"populate_by_name": True}


# ─── LangGraph Internal Format ────────────────────────────────────────────────

class LangGraphConnection(BaseModel):
    """
    Internal format used when passing workflow to LangGraph.
    Replaces the old format that hardcoded sourcePortId='output'.
    """
    id: str
    source_node_id: str = Field(..., alias="sourceNodeId")
    source_port_id: str = Field(..., alias="sourcePortId")   # Actual output port, never hardcoded
    target_node_id: str = Field(..., alias="targetNodeId")
    target_port_id: str = Field(..., alias="targetPortId")   # Actual input port, never hardcoded
    enabled: bool = True
    condition: Optional[str] = None

    model_config = {"populate_by_name": True}


class LangGraphWorkflow(BaseModel):
    """
    Transformed format sent to LangGraph for execution.
    Created by workflow_service.py from WorkflowV2.
    """
    id: str
    name: str
    nodes: List[WorkflowNode]
    connections: List[LangGraphConnection]
    variables: Dict[str, WorkflowVariable]
    config: ExecutionConfig

    @classmethod
    def from_workflow(cls, workflow: WorkflowV2) -> LangGraphWorkflow:
        """Convert WorkflowV2 → LangGraph format. Replaces the broken transformation."""
        connections = [
            LangGraphConnection(
                id=f"conn_{i}",
                source_node_id=edge.source,
                source_port_id=edge.source_port,    # Now uses real port, not hardcoded 'output'
                target_node_id=edge.target,
                target_port_id=edge.target_port,    # Now uses real port, not hardcoded 'input'
                enabled=edge.enabled,
                condition=edge.condition,
            )
            for i, edge in enumerate(workflow.edges)
            if edge.enabled
        ]
        return cls(
            id=workflow.id,
            name=workflow.name,
            nodes=workflow.nodes,
            connections=connections,
            variables=workflow.variables,
            config=workflow.execution_config,
        )

    model_config = {"populate_by_name": True}


# ─── Variable Resolver ────────────────────────────────────────────────────────

class VariableContext(BaseModel):
    """
    Runtime context used to resolve {{$node.x.y}} variables during execution.
    The Python equivalent of the frontend variableReplacer.ts.
    """
    trigger: Dict[str, Any] = Field(default_factory=dict)
    nodes: Dict[str, Dict[str, Any]] = Field(default_factory=dict)   # nodeId → resolved outputs
    variables: Dict[str, Any] = Field(default_factory=dict)


def _get_nested(obj: Dict[str, Any], path: str) -> Any:
    """Traverse dot-separated path through a nested dict."""
    parts = path.split(".")
    current: Any = obj
    for part in parts:
        if not isinstance(current, dict):
            return None
        current = current.get(part)
    return current


def resolve_variables(template: str, context: VariableContext) -> str:
    """
    Backend equivalent of variableReplacer.ts replaceVariables().
    Call this on every config field before passing config to an executor.

    Example:
        template = "Hello {{$node.chat_1.message}}"
        context.nodes = {"chat_1": {"message": "world"}}
        → "Hello world"
    """
    def replace(match: re.Match) -> str:
        expr = match.group(1).strip()

        if expr.startswith("$trigger."):
            path = expr[9:]
            val = _get_nested(context.trigger, path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        if expr.startswith("$node."):
            parts = expr[6:].split(".", 1)
            if len(parts) < 2:
                return f"[invalid: {expr}]"
            node_id, field_path = parts[0], parts[1]
            node_outputs = context.nodes.get(node_id, {})
            val = _get_nested(node_outputs, field_path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        if expr.startswith("$vars."):
            path = expr[6:]
            val = _get_nested(context.variables, path)
            return str(val) if val is not None else f"[undefined: {expr}]"

        return f"[invalid: {expr}]"

    return VARIABLE_PATTERN.sub(replace, template)


def resolve_node_config(
    config: Dict[str, Any],
    context: VariableContext
) -> Dict[str, Any]:
    """
    Resolve all template variables in a node's config dict.
    Call this before passing config to any executor.
    """
    resolved: Dict[str, Any] = {}
    for key, value in config.items():
        if isinstance(value, str):
            resolved[key] = resolve_variables(value, context)
        elif isinstance(value, dict):
            resolved[key] = resolve_node_config(value, context)
        else:
            resolved[key] = value
    return resolved


def map_executor_output(
    raw_output: Dict[str, Any],
    output_map: Dict[str, str]
) -> Dict[str, Any]:
    """
    Translate executor return keys → metadata output IDs using outputMap.
    This is the fix for the Delay executor key mismatch problem.

    Example:
        raw_output = {"delayedData": ..., "timestamp": "2026-..."}
        output_map = {"delayed": "delayedData", "delayedUntil": "timestamp"}
        → {"delayed": ..., "delayedUntil": "2026-..."}

    The returned dict uses metadata output IDs that match {{$node.x.y}} references.
    """
    # Invert the map: executorKey → metadataOutputId
    inverted = {executor_key: meta_id for meta_id, executor_key in output_map.items()}
    mapped: Dict[str, Any] = {}
    for executor_key, value in raw_output.items():
        meta_id = inverted.get(executor_key, executor_key)  # fallback to original key
        mapped[meta_id] = value
    return mapped
