"""
ExecutionContext — shared state passed to every node during workflow execution.

Holds credentials, workflow-level variables, all previous node outputs,
and the running execution log.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from nodes.base import NodeLog


class ExecutionContext(BaseModel):
    """
    Mutable shared state for a single workflow execution run.

    Passed (by reference) to every node's execute() call so nodes can:
    - Access credentials (read-only)
    - Read/write workflow variables (via SetVariable node)
    - Access any previous node's output
    - Append to the execution log
    """

    execution_id: str
    workflow_id: str
    user_id: str

    # Decrypted credentials keyed by credential type (legacy, kept for compatibility)
    # e.g. {"openai_api_key": {"api_key": "sk-..."}, "slack_token": {"token": "xoxb-..."}}
    credentials: Dict[str, Dict[str, str]] = Field(default_factory=dict)

    # Flat user-saved credentials — resolved via {{$creds.name}} syntax
    # e.g. {"my_stripe_key": "sk_live_xxx", "openai_key": "sk-..."}
    user_credentials: Dict[str, str] = Field(default_factory=dict)

    # Mutable workflow-level variables (written by SetVariable node)
    variables: Dict[str, Any] = Field(default_factory=dict)

    # All previous node outputs indexed by node id
    # e.g. {"n1": {"triggered_at": "...", "input_data": {}}}
    node_outputs: Dict[str, Dict[str, Any]] = Field(default_factory=dict)

    # Trigger node output — shortcut for {{$trigger.*}}
    trigger_output: Dict[str, Any] = Field(default_factory=dict)

    # Append-only execution log
    logs: List[NodeLog] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def store_output(self, node_id: str, output: Dict[str, Any]) -> None:
        """Store a node's output and update trigger_output if it's the first node."""
        self.node_outputs[node_id] = output
        if not self.trigger_output:
            self.trigger_output = output

    def get_credential(self, cred_type: str, key: str, default: Optional[str] = None) -> Optional[str]:
        """Safely retrieve a specific key from a credential type."""
        return self.credentials.get(cred_type, {}).get(key, default)

    def set_variable(self, name: str, value: Any) -> None:
        """Write a workflow variable (called by SetVariable node)."""
        self.variables[name] = value

    def append_log(self, log: NodeLog) -> None:
        self.logs.append(log)
