"""
Complete LangGraph State Management System
Handles state flow, accumulation, and merging for workflow execution
"""
from typing import TypedDict, Annotated, Any, Dict, List, Optional, Union
from datetime import datetime
from enum import Enum
import operator
from copy import deepcopy
from uuid import uuid4

class NodeStatus(str, Enum):
    """Possible node execution statuses"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"
    RETRY = "retry"

class WorkflowStatus(str, Enum):
    """Overall workflow execution status"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
    CANCELLED = "cancelled"

class NodeExecutionLog(TypedDict, total=False):
    """Detailed log entry for a single node execution"""
    node_id: str
    node_name: str
    node_type: str
    status: NodeStatus
    output: Any
    error: Optional[str]
    error_type: Optional[str]
    stack_trace: Optional[str]
    execution_time_ms: float
    started_at: str
    completed_at: str
    attempt_number: int
    max_attempts: int
    metadata: Dict[str, Any]

class BranchInfo(TypedDict):
    """Information about parallel execution branches"""
    branch_id: str
    parent_node_id: str
    node_ids: List[str]
    status: str
    started_at: str
    completed_at: Optional[str]

class CheckpointData(TypedDict):
    """Data for workflow checkpointing and recovery"""
    checkpoint_id: str
    node_id: str
    state_snapshot: Dict[str, Any]
    timestamp: str

class WorkflowState(TypedDict):
    """
    Core state that flows through the LangGraph workflow.
    Uses Annotated types for proper state accumulation.
    """
    # Execution identifiers
    workflow_id: str
    execution_id: str
    thread_id: str
    
    # Current execution context
    current_node_id: str
    current_data: Any  # Data flowing between nodes
    
    # Accumulated execution history
    node_logs: Annotated[List[NodeExecutionLog], operator.add]
    errors: Annotated[List[str], operator.add]
    
    # Branch management for parallel execution
    active_branches: Dict[str, BranchInfo]
    completed_branches: Annotated[List[str], operator.add]
    branch_results: Dict[str, Any]  # Results indexed by branch_id
    
    # State tracking
    workflow_status: WorkflowStatus
    visited_nodes: Annotated[List[str], operator.add]
    pending_nodes: List[str]
    
    # Timing and metadata
    started_at: str
    last_updated_at: str
    execution_time_ms: float
    
    # Checkpointing for recovery
    checkpoints: Annotated[List[CheckpointData], operator.add]
    last_checkpoint_id: Optional[str]
    
    # Configuration and context
    global_config: Dict[str, Any]
    environment: Dict[str, str]
    api_keys: Dict[str, str]
    
    # Variable storage for cross-node data
    variables: Dict[str, Any]
    
    # Circuit breaker states
    circuit_breakers: Dict[str, Dict[str, Any]]

class StateManager:
    """
    Manages workflow state operations including merging, validation,
    and transformation for LangGraph execution.
    """
    
    @staticmethod
    def create_initial_state(
        workflow_id: str,
        execution_id: Optional[str] = None,
        initial_input: Any = None,
        config: Optional[Dict[str, Any]] = None,
        api_keys: Optional[Dict[str, str]] = None
    ) -> WorkflowState:
        """
        Create initial workflow state with all required fields.
        
        Args:
            workflow_id: Unique workflow identifier
            execution_id: Optional execution ID (generated if not provided)
            initial_input: Initial data to pass to first node
            config: Global workflow configuration
            api_keys: API keys for external services
            
        Returns:
            Initialized WorkflowState
        """
        exec_id = execution_id or str(uuid4())
        now = datetime.utcnow().isoformat()
        
        return WorkflowState(
            workflow_id=workflow_id,
            execution_id=exec_id,
            thread_id=exec_id,
            current_node_id="",
            current_data=initial_input or {},
            node_logs=[],
            errors=[],
            active_branches={},
            completed_branches=[],
            branch_results={},
            workflow_status=WorkflowStatus.INITIALIZING,
            visited_nodes=[],
            pending_nodes=[],
            started_at=now,
            last_updated_at=now,
            execution_time_ms=0.0,
            checkpoints=[],
            last_checkpoint_id=None,
            global_config=config or {},
            environment={},
            api_keys=api_keys or {},
            variables={},
            circuit_breakers={}
        )
    
    @staticmethod
    def merge_parallel_results(
        state: WorkflowState,
        branch_results: Dict[str, Any],
        merge_strategy: str = "combine"
    ) -> Any:
        """
        Merge results from parallel execution branches.
        
        Args:
            state: Current workflow state
            branch_results: Results from each branch (branch_id -> result)
            merge_strategy: How to merge results
                - "combine": Combine into dict with branch IDs as keys
                - "array": Combine into array
                - "first": Return first result
                - "last": Return last result
                - "custom": Use custom merge function from config
                
        Returns:
            Merged result data
        """
        if not branch_results:
            return state["current_data"]
        
        if merge_strategy == "combine":
            return {
                "merged": True,
                "branches": branch_results,
                "branch_count": len(branch_results),
                "previous_data": state["current_data"]
            }
        
        elif merge_strategy == "array":
            return list(branch_results.values())
        
        elif merge_strategy == "first":
            return next(iter(branch_results.values()))
        
        elif merge_strategy == "last":
            return list(branch_results.values())[-1]
        
        elif merge_strategy == "custom":
            # Use custom merge function if provided in config
            merge_fn = state["global_config"].get("merge_function")
            if merge_fn and callable(merge_fn):
                return merge_fn(branch_results, state["current_data"])
            return branch_results
        
        return branch_results
    
    @staticmethod
    def update_node_log(
        state: WorkflowState,
        node_id: str,
        node_name: str,
        node_type: str,
        status: NodeStatus,
        output: Any = None,
        error: Optional[Exception] = None,
        execution_time_ms: float = 0.0,
        attempt: int = 1,
        max_attempts: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> NodeExecutionLog:
        """
        Create a node execution log entry.
        
        Args:
            state: Current workflow state
            node_id: Node identifier
            node_name: Human-readable node name
            node_type: Type of node
            status: Execution status
            output: Node output data
            error: Exception if failed
            execution_time_ms: Execution duration
            attempt: Current attempt number
            max_attempts: Maximum retry attempts
            metadata: Additional metadata
            
        Returns:
            NodeExecutionLog entry
        """
        now = datetime.utcnow().isoformat()
        
        log_entry = NodeExecutionLog(
            node_id=node_id,
            node_name=node_name,
            node_type=node_type,
            status=status,
            output=output,
            error=str(error) if error else None,
            error_type=type(error).__name__ if error else None,
            stack_trace=None,  # Could add traceback here
            execution_time_ms=execution_time_ms,
            started_at=state.get("last_updated_at", now),
            completed_at=now,
            attempt_number=attempt,
            max_attempts=max_attempts,
            metadata=metadata or {}
        )
        
        return log_entry
    
    @staticmethod
    def create_checkpoint(
        state: WorkflowState,
        node_id: str
    ) -> CheckpointData:
        """
        Create a checkpoint for state recovery.
        
        Args:
            state: Current workflow state
            node_id: Node at which checkpoint is created
            
        Returns:
            CheckpointData
        """
        checkpoint_id = f"ckpt_{uuid4().hex[:8]}"
        
        # Create a snapshot of essential state
        state_snapshot = {
            "current_data": deepcopy(state["current_data"]),
            "variables": deepcopy(state["variables"]),
            "visited_nodes": state["visited_nodes"].copy(),
            "workflow_status": state["workflow_status"]
        }
        
        return CheckpointData(
            checkpoint_id=checkpoint_id,
            node_id=node_id,
            state_snapshot=state_snapshot,
            timestamp=datetime.utcnow().isoformat()
        )
    
    @staticmethod
    def restore_from_checkpoint(
        state: WorkflowState,
        checkpoint_id: str
    ) -> WorkflowState:
        """
        Restore state from a checkpoint.
        
        Args:
            state: Current workflow state
            checkpoint_id: Checkpoint to restore from
            
        Returns:
            Restored WorkflowState
        """
        # Find checkpoint
        checkpoint = None
        for ckpt in state["checkpoints"]:
            if ckpt["checkpoint_id"] == checkpoint_id:
                checkpoint = ckpt
                break
        
        if not checkpoint:
            raise ValueError(f"Checkpoint {checkpoint_id} not found")
        
        # Restore snapshot
        snapshot = checkpoint["state_snapshot"]
        restored_state = state.copy()
        restored_state["current_data"] = snapshot["current_data"]
        restored_state["variables"] = snapshot["variables"]
        restored_state["visited_nodes"] = snapshot["visited_nodes"]
        restored_state["workflow_status"] = snapshot["workflow_status"]
        restored_state["last_checkpoint_id"] = checkpoint_id
        
        return restored_state
    
    @staticmethod
    def get_execution_summary(state: WorkflowState) -> Dict[str, Any]:
        """
        Generate execution summary from state.
        
        Args:
            state: Workflow state
            
        Returns:
            Summary dictionary
        """
        successful = sum(1 for log in state["node_logs"] if log["status"] == NodeStatus.SUCCESS)
        failed = sum(1 for log in state["node_logs"] if log["status"] == NodeStatus.FAILED)
        skipped = sum(1 for log in state["node_logs"] if log["status"] == NodeStatus.SKIPPED)
        
        return {
            "workflow_id": state["workflow_id"],
            "execution_id": state["execution_id"],
            "status": state["workflow_status"],
            "nodes_executed": len(state["node_logs"]),
            "nodes_successful": successful,
            "nodes_failed": failed,
            "nodes_skipped": skipped,
            "total_errors": len(state["errors"]),
            "execution_time_ms": state["execution_time_ms"],
            "started_at": state["started_at"],
            "last_updated_at": state["last_updated_at"],
            "branches_completed": len(state["completed_branches"]),
            "checkpoints_created": len(state["checkpoints"]),
            "final_output": state["current_data"]
        }
    
    @staticmethod
    def validate_state(state: WorkflowState) -> tuple[bool, List[str]]:
        """
        Validate workflow state integrity.
        
        Args:
            state: Workflow state to validate
            
        Returns:
            Tuple of (is_valid, list of validation errors)
        """
        errors = []
        
        # Check required fields
        required_fields = ["workflow_id", "execution_id", "workflow_status"]
        for field in required_fields:
            if field not in state or not state[field]:
                errors.append(f"Missing required field: {field}")
        
        # Check status consistency
        if state["workflow_status"] == WorkflowStatus.COMPLETED:
            if any(log["status"] == NodeStatus.RUNNING for log in state["node_logs"]):
                errors.append("Workflow marked complete but has running nodes")
        
        # Check branch consistency
        for branch_id in state["completed_branches"]:
            if branch_id in state["active_branches"]:
                errors.append(f"Branch {branch_id} in both active and completed")
        
        return len(errors) == 0, errors