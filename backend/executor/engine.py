"""
WorkflowEngine — executes a workflow DAG node by node.

Responsibilities:
- Validate all node types exist in the registry
- Find the start node (trigger / no incoming connections)
- Execute nodes in order, passing each node's output to the next
- Handle conditional branching (IfCondition true/false connections)
- Handle loops (iterate downstream subgraph for each item)
- Collect per-node logs
- Return an ExecutionResult
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from nodes.base import BaseNode, NodeExecutionError, NodeLog, NodeStatus, UnknownNodeTypeError
from nodes.registry import NodeRegistry
from executor.context import ExecutionContext
from executor import resolver as _resolver

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Input / Output models
# ---------------------------------------------------------------------------

class WorkflowNode(BaseModel):
    id: str
    type: str
    name: str = ""
    config: Dict[str, Any] = {}


class WorkflowConnection(BaseModel):
    from_node: str   # aliased from JSON key "from"
    to_node: str     # aliased from JSON key "to"
    condition: Optional[str] = None  # "true" | "false" | None

    class Config:
        populate_by_name = True

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "WorkflowConnection":
        # Support new format (from/to), legacy format (sourceNodeId/targetNodeId),
        # and React Flow / frontend adapter format (source/target)
        from_node = d.get("from") or d.get("sourceNodeId") or d.get("source", "")
        to_node = d.get("to") or d.get("targetNodeId") or d.get("target", "")
        condition = d.get("condition")

        # Infer condition from old-style source port names ("true"/"false")
        if condition is None:
            port = d.get("sourcePortId") or d.get("sourceHandle", "")
            if port in ("true", "false"):
                condition = port

        return cls(from_node=from_node, to_node=to_node, condition=condition)


class WorkflowDefinition(BaseModel):
    id: str = ""
    name: str = ""
    nodes: List[WorkflowNode]
    connections: List[WorkflowConnection] = []

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "WorkflowDefinition":
        nodes = [WorkflowNode(**n) for n in d.get("nodes", [])]
        connections = [WorkflowConnection.from_dict(c) for c in d.get("connections", [])]
        return cls(
            id=d.get("id", ""),
            name=d.get("name", ""),
            nodes=nodes,
            connections=connections,
        )


class ExecutionResult(BaseModel):
    execution_id: str
    workflow_id: str
    status: str          # "completed" | "failed" | "partial"
    started_at: str
    finished_at: str
    duration_ms: float
    logs: List[NodeLog]
    final_output: Dict[str, Any] = {}
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class WorkflowEngine:
    """
    Executes a WorkflowDefinition using the registered node executors.

    Create one instance per application (shared registry) and call
    `await engine.execute(...)` for each workflow run.
    """

    def __init__(self, registry: NodeRegistry) -> None:
        self._registry = registry

    async def execute(
        self,
        workflow: WorkflowDefinition,
        initial_input: Dict[str, Any],
        context: ExecutionContext,
    ) -> ExecutionResult:
        started_at = datetime.now(timezone.utc).isoformat()
        t_start = time.monotonic()

        # ------------------------------------------------------------------
        # 1. Validate all node types
        # ------------------------------------------------------------------
        for node in workflow.nodes:
            if not self._registry.has(node.type):
                available = self._registry.all_types()
                return ExecutionResult(
                    execution_id=context.execution_id,
                    workflow_id=context.workflow_id,
                    status="failed",
                    started_at=started_at,
                    finished_at=datetime.now(timezone.utc).isoformat(),
                    duration_ms=0,
                    logs=[],
                    error=f"Unknown node type '{node.type}'. Available: {available}",
                )

        # ------------------------------------------------------------------
        # 2. Build adjacency maps
        # ------------------------------------------------------------------
        logger.info(
            "🗂️  Workflow '%s' nodes: %s",
            workflow.name or workflow.id,
            [(n.id, n.type) for n in workflow.nodes],
        )
        nodes_by_id: Dict[str, WorkflowNode] = {n.id: n for n in workflow.nodes}
        # outgoing: node_id → list of (target_id, condition)
        outgoing: Dict[str, List[tuple]] = {n.id: [] for n in workflow.nodes}
        # incoming: node_id → count of incoming connections
        incoming_count: Dict[str, int] = {n.id: 0 for n in workflow.nodes}

        for conn in workflow.connections:
            outgoing[conn.from_node].append((conn.to_node, conn.condition))
            incoming_count[conn.to_node] = incoming_count.get(conn.to_node, 0) + 1

        # ------------------------------------------------------------------
        # 3. Find start node
        # ------------------------------------------------------------------
        start_node: Optional[WorkflowNode] = None
        for node in workflow.nodes:
            node_cls = self._registry.get(node.type)
            if node_cls.definition.is_trigger or incoming_count.get(node.id, 0) == 0:
                start_node = node
                break

        if start_node is None:
            return ExecutionResult(
                execution_id=context.execution_id,
                workflow_id=context.workflow_id,
                status="failed",
                started_at=started_at,
                finished_at=datetime.now(timezone.utc).isoformat(),
                duration_ms=0,
                logs=[],
                error="No start node found (workflow needs a trigger or a node with no incoming connections).",
            )

        # Seed trigger input into context
        context.trigger_output = {"input_data": initial_input}

        # ------------------------------------------------------------------
        # 4. Execute nodes (iterative traversal)
        # ------------------------------------------------------------------
        final_output: Dict[str, Any] = {}
        overall_status = "completed"
        overall_error: Optional[str] = None

        # We use a queue of (node_id, prev_output)
        queue: List[tuple] = [(start_node.id, initial_input)]
        visited: set = set()

        while queue:
            current_id, prev_output = queue.pop(0)

            if current_id in visited:
                continue  # prevent cycles / double execution
            visited.add(current_id)

            node = nodes_by_id.get(current_id)
            if node is None:
                continue

            # Run the node
            node_output, log = await self._execute_node(node, prev_output, context)

            context.append_log(log)

            if log.status == NodeStatus.FAILED:
                overall_status = "failed"
                overall_error = log.error
                break  # fail-fast

            # Update trigger_output if this is the first (trigger) node
            node_cls = self._registry.get(node.type)
            if node_cls.definition.is_trigger:
                context.trigger_output = node_output

            final_output = node_output

            # Special handling for Loop nodes — iterate body once per item
            if node.type == "Loop":
                items = node_output.get("items", [])
                if items:
                    success, loop_error = await self._execute_loop_body(
                        node.id, items, nodes_by_id, outgoing, context
                    )
                    if not success:
                        overall_status = "failed"
                        overall_error = loop_error
                        break
                # Mark all loop-body nodes as visited so main queue skips them
                for nid in self._collect_reachable_nodes(node.id, outgoing):
                    visited.add(nid)
                final_output = node_output
                continue

            # Determine next nodes
            next_nodes = self._resolve_next(node.id, node_output, outgoing)
            for next_id in next_nodes:
                queue.append((next_id, node_output))

        duration_ms = (time.monotonic() - t_start) * 1000

        return ExecutionResult(
            execution_id=context.execution_id,
            workflow_id=context.workflow_id,
            status=overall_status,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=round(duration_ms, 2),
            logs=context.logs,
            final_output=final_output,
            error=overall_error,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _execute_node(
        self,
        node: WorkflowNode,
        prev_output: Dict[str, Any],
        context: ExecutionContext,
    ) -> tuple[Dict[str, Any], NodeLog]:
        """Execute a single node and return (output, log)."""
        node_cls = self._registry.get(node.type)
        node_instance: BaseNode = node_cls()

        # Resolve config variables
        resolved_config = _resolver.resolve(node.config, context)

        started_at = datetime.now(timezone.utc).isoformat()
        t0 = time.monotonic()

        logger.info("▶ Executing node %s (%s) config=%s", node.id, node.type, resolved_config)
        try:
            output = await node_instance.execute(resolved_config, prev_output, context)
        except NodeExecutionError as exc:
            duration_ms = (time.monotonic() - t0) * 1000
            log = NodeLog(
                node_id=node.id,
                node_type=node.type,
                node_name=node.name or node.type,
                status=NodeStatus.FAILED,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc).isoformat(),
                duration_ms=round(duration_ms, 2),
                input=prev_output,
                output={},
                error=str(exc),
            )
            return {}, log
        except Exception as exc:
            duration_ms = (time.monotonic() - t0) * 1000
            logger.exception("Unexpected error in node %s (%s)", node.id, node.type)
            log = NodeLog(
                node_id=node.id,
                node_type=node.type,
                node_name=node.name or node.type,
                status=NodeStatus.FAILED,
                started_at=started_at,
                finished_at=datetime.now(timezone.utc).isoformat(),
                duration_ms=round(duration_ms, 2),
                input=prev_output,
                output={},
                error=f"Unexpected error: {exc}",
            )
            return {}, log

        duration_ms = (time.monotonic() - t0) * 1000
        logger.info("✅ Node %s (%s) completed in %.0fms", node.id, node.type, duration_ms)

        # Store output in context
        context.store_output(node.id, output)

        log = NodeLog(
            node_id=node.id,
            node_type=node.type,
            node_name=node.name or node.type,
            status=NodeStatus.SUCCESS,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=round(duration_ms, 2),
            input=prev_output,
            output=output,
        )
        return output, log

    async def _execute_loop_body(
        self,
        loop_node_id: str,
        items: List[Any],
        nodes_by_id: Dict[str, "WorkflowNode"],
        outgoing: Dict[str, List[tuple]],
        context: ExecutionContext,
    ) -> tuple[bool, Optional[str]]:
        """Execute all downstream nodes once per loop item."""
        for i, item in enumerate(items):
            is_last = i == len(items) - 1

            # Update the loop node's context output for this iteration
            iter_output: Dict[str, Any] = {
                "items": items,
                "total": len(items),
                "current_item": item,
                "index": i,
                "is_last": is_last,
            }
            context.store_output(loop_node_id, iter_output)

            # BFS through loop body for this iteration
            body_queue: List[tuple] = [
                (target_id, iter_output)
                for target_id, _ in outgoing.get(loop_node_id, [])
            ]
            body_visited: set = set()

            while body_queue:
                current_id, prev_output = body_queue.pop(0)
                if current_id in body_visited:
                    continue
                body_visited.add(current_id)

                node = nodes_by_id.get(current_id)
                if node is None or node.type == "Loop":
                    # Don't recurse into nested loops here
                    continue

                node_output, log = await self._execute_node(node, prev_output, context)
                context.append_log(log)

                if log.status == NodeStatus.FAILED:
                    return False, log.error

                next_nodes = self._resolve_next(node.id, node_output, outgoing)
                for next_id in next_nodes:
                    if next_id not in body_visited:
                        body_queue.append((next_id, node_output))

        return True, None

    def _collect_reachable_nodes(
        self,
        from_node_id: str,
        outgoing: Dict[str, List[tuple]],
    ) -> set:
        """BFS to collect all node IDs reachable from from_node_id (exclusive)."""
        reachable: set = set()
        queue = [target for target, _ in outgoing.get(from_node_id, [])]
        while queue:
            nid = queue.pop(0)
            if nid in reachable:
                continue
            reachable.add(nid)
            for target, _ in outgoing.get(nid, []):
                if target not in reachable:
                    queue.append(target)
        return reachable

    def _resolve_next(
        self,
        node_id: str,
        node_output: Dict[str, Any],
        outgoing: Dict[str, List[tuple]],
    ) -> List[str]:
        """
        Determine which nodes to run next after `node_id` produced `node_output`.

        - If connections have no condition → follow all (usually just one)
        - If connections have "true"/"false" conditions → follow the one
          matching node_output.get("branch")
        """
        conns = outgoing.get(node_id, [])
        if not conns:
            return []

        has_conditions = any(cond is not None for _, cond in conns)
        if not has_conditions:
            return [target for target, _ in conns]

        # Conditional routing
        branch = str(node_output.get("branch", "")).lower()
        matched = [target for target, cond in conns if cond and cond.lower() == branch]
        if matched:
            return matched

        # Fallback: unconditional connections
        return [target for target, cond in conns if cond is None]
