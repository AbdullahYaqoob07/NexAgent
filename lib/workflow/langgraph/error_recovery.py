"""
Error Recovery and Checkpointing System
Enables workflow persistence, recovery from failures, and partial execution restart
"""
import asyncio
import json
import pickle
import hashlib
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class CheckpointType(str, Enum):
    """Types of checkpoints"""
    MANUAL = "manual"          # User-triggered checkpoint
    AUTO = "auto"              # Automatic periodic checkpoint
    NODE = "node"              # After each node execution
    BRANCH = "branch"          # Before branch execution
    SYNC = "sync"              # At synchronization points
    ERROR = "error"            # Before error handling

class RecoveryStrategy(str, Enum):
    """Recovery strategies after failure"""
    RESTART_FROM_BEGINNING = "restart_from_beginning"
    RESUME_FROM_CHECKPOINT = "resume_from_checkpoint"
    RESUME_FROM_FAILED_NODE = "resume_from_failed_node"
    SKIP_FAILED_NODE = "skip_failed_node"
    MANUAL = "manual"

@dataclass
class Checkpoint:
    """Checkpoint snapshot of workflow state"""
    checkpoint_id: str
    workflow_id: str
    execution_id: str
    checkpoint_type: CheckpointType
    
    # State snapshot
    current_node_id: str
    current_data: Any
    node_logs: List[Dict[str, Any]]
    variables: Dict[str, Any]
    visited_nodes: List[str]
    pending_nodes: List[str]
    
    # Metadata
    created_at: str
    execution_time_ms: float
    checkpoint_size_bytes: int = 0
    
    # Recovery info
    last_successful_node: Optional[str] = None
    last_error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Checkpoint':
        """Create from dictionary"""
        return cls(**data)

class CheckpointStorage:
    """
    Abstract storage interface for checkpoints.
    Implementations can use different backends (file, database, S3, etc.)
    """
    
    async def save(self, checkpoint: Checkpoint) -> bool:
        """Save checkpoint"""
        raise NotImplementedError
    
    async def load(self, checkpoint_id: str) -> Optional[Checkpoint]:
        """Load checkpoint by ID"""
        raise NotImplementedError
    
    async def list(
        self,
        workflow_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> List[Checkpoint]:
        """List checkpoints"""
        raise NotImplementedError
    
    async def delete(self, checkpoint_id: str) -> bool:
        """Delete checkpoint"""
        raise NotImplementedError
    
    async def cleanup_old(self, max_age_hours: int = 24) -> int:
        """Clean up old checkpoints"""
        raise NotImplementedError

class FileCheckpointStorage(CheckpointStorage):
    """File-based checkpoint storage"""
    
    def __init__(self, storage_dir: str = "./checkpoints"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_checkpoint_path(self, checkpoint_id: str) -> Path:
        """Get file path for checkpoint"""
        return self.storage_dir / f"{checkpoint_id}.json"
    
    async def save(self, checkpoint: Checkpoint) -> bool:
        """Save checkpoint to file"""
        try:
            path = self._get_checkpoint_path(checkpoint.checkpoint_id)
            
            # Serialize checkpoint
            data = checkpoint.to_dict()
            json_str = json.dumps(data, indent=2, default=str)
            
            # Calculate size
            checkpoint.checkpoint_size_bytes = len(json_str.encode())
            
            # Write to file
            path.write_text(json_str)
            
            logger.info(
                f"Saved checkpoint {checkpoint.checkpoint_id} "
                f"({checkpoint.checkpoint_size_bytes} bytes)"
            )
            return True
            
        except Exception as e:
            logger.error(f"Error saving checkpoint: {str(e)}")
            return False
    
    async def load(self, checkpoint_id: str) -> Optional[Checkpoint]:
        """Load checkpoint from file"""
        try:
            path = self._get_checkpoint_path(checkpoint_id)
            
            if not path.exists():
                logger.warning(f"Checkpoint {checkpoint_id} not found")
                return None
            
            # Read and parse
            json_str = path.read_text()
            data = json.loads(json_str)
            
            checkpoint = Checkpoint.from_dict(data)
            
            logger.info(f"Loaded checkpoint {checkpoint_id}")
            return checkpoint
            
        except Exception as e:
            logger.error(f"Error loading checkpoint: {str(e)}")
            return None
    
    async def list(
        self,
        workflow_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> List[Checkpoint]:
        """List all checkpoints"""
        try:
            checkpoints = []
            
            for path in self.storage_dir.glob("*.json"):
                try:
                    json_str = path.read_text()
                    data = json.loads(json_str)
                    checkpoint = Checkpoint.from_dict(data)
                    
                    # Filter by workflow/execution
                    if workflow_id and checkpoint.workflow_id != workflow_id:
                        continue
                    if execution_id and checkpoint.execution_id != execution_id:
                        continue
                    
                    checkpoints.append(checkpoint)
                    
                except Exception as e:
                    logger.warning(f"Error loading {path}: {str(e)}")
            
            # Sort by creation time
            checkpoints.sort(key=lambda c: c.created_at, reverse=True)
            
            return checkpoints
            
        except Exception as e:
            logger.error(f"Error listing checkpoints: {str(e)}")
            return []
    
    async def delete(self, checkpoint_id: str) -> bool:
        """Delete checkpoint file"""
        try:
            path = self._get_checkpoint_path(checkpoint_id)
            if path.exists():
                path.unlink()
                logger.info(f"Deleted checkpoint {checkpoint_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error deleting checkpoint: {str(e)}")
            return False
    
    async def cleanup_old(self, max_age_hours: int = 24) -> int:
        """Clean up old checkpoint files"""
        try:
            import time
            cutoff_time = time.time() - (max_age_hours * 3600)
            deleted = 0
            
            for path in self.storage_dir.glob("*.json"):
                if path.stat().st_mtime < cutoff_time:
                    path.unlink()
                    deleted += 1
            
            logger.info(f"Cleaned up {deleted} old checkpoints")
            return deleted
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return 0

class CheckpointManager:
    """
    Manages checkpoint creation, storage, and recovery.
    """
    
    def __init__(
        self,
        storage: CheckpointStorage,
        auto_checkpoint: bool = True,
        checkpoint_interval_nodes: int = 5
    ):
        self.storage = storage
        self.auto_checkpoint = auto_checkpoint
        self.checkpoint_interval_nodes = checkpoint_interval_nodes
        
        self._nodes_since_checkpoint = 0
        self._current_execution_checkpoints: List[str] = []
    
    def generate_checkpoint_id(
        self,
        workflow_id: str,
        execution_id: str,
        node_id: str
    ) -> str:
        """Generate unique checkpoint ID"""
        timestamp = datetime.utcnow().isoformat()
        data = f"{workflow_id}:{execution_id}:{node_id}:{timestamp}"
        hash_val = hashlib.md5(data.encode()).hexdigest()[:8]
        return f"ckpt_{hash_val}"
    
    async def create_checkpoint(
        self,
        workflow_state: Dict[str, Any],
        checkpoint_type: CheckpointType = CheckpointType.AUTO,
        force: bool = False
    ) -> Optional[str]:
        """
        Create a checkpoint from current workflow state.
        
        Args:
            workflow_state: Current workflow state
            checkpoint_type: Type of checkpoint
            force: Force checkpoint even if auto is disabled
            
        Returns:
            Checkpoint ID if created, None otherwise
        """
        # Check if we should create checkpoint
        if not force and not self.auto_checkpoint:
            return None
        
        if (not force and 
            checkpoint_type == CheckpointType.AUTO and 
            self._nodes_since_checkpoint < self.checkpoint_interval_nodes):
            return None
        
        try:
            # Generate checkpoint ID
            checkpoint_id = self.generate_checkpoint_id(
                workflow_state.get("workflow_id", ""),
                workflow_state.get("execution_id", ""),
                workflow_state.get("current_node_id", "")
            )
            
            # Find last successful node
            last_successful = None
            for log in reversed(workflow_state.get("node_logs", [])):
                if log.get("status") == "success":
                    last_successful = log.get("node_id")
                    break
            
            # Find last error
            last_error = None
            errors = workflow_state.get("errors", [])
            if errors:
                last_error = errors[-1]
            
            # Create checkpoint
            checkpoint = Checkpoint(
                checkpoint_id=checkpoint_id,
                workflow_id=workflow_state.get("workflow_id", ""),
                execution_id=workflow_state.get("execution_id", ""),
                checkpoint_type=checkpoint_type,
                current_node_id=workflow_state.get("current_node_id", ""),
                current_data=workflow_state.get("current_data"),
                node_logs=workflow_state.get("node_logs", []),
                variables=workflow_state.get("variables", {}),
                visited_nodes=workflow_state.get("visited_nodes", []),
                pending_nodes=workflow_state.get("pending_nodes", []),
                created_at=datetime.utcnow().isoformat(),
                execution_time_ms=workflow_state.get("execution_time_ms", 0.0),
                last_successful_node=last_successful,
                last_error=last_error
            )
            
            # Save checkpoint
            success = await self.storage.save(checkpoint)
            
            if success:
                self._current_execution_checkpoints.append(checkpoint_id)
                self._nodes_since_checkpoint = 0
                logger.info(
                    f"Created {checkpoint_type} checkpoint: {checkpoint_id}"
                )
                return checkpoint_id
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating checkpoint: {str(e)}")
            return None
    
    def increment_node_counter(self):
        """Increment counter for auto-checkpointing"""
        self._nodes_since_checkpoint += 1
    
    async def restore_from_checkpoint(
        self,
        checkpoint_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Restore workflow state from checkpoint.
        
        Args:
            checkpoint_id: Checkpoint to restore from
            
        Returns:
            Restored workflow state
        """
        try:
            checkpoint = await self.storage.load(checkpoint_id)
            
            if not checkpoint:
                logger.error(f"Checkpoint {checkpoint_id} not found")
                return None
            
            # Reconstruct state
            state = {
                "workflow_id": checkpoint.workflow_id,
                "execution_id": checkpoint.execution_id,
                "current_node_id": checkpoint.current_node_id,
                "current_data": checkpoint.current_data,
                "node_logs": checkpoint.node_logs,
                "variables": checkpoint.variables,
                "visited_nodes": checkpoint.visited_nodes,
                "pending_nodes": checkpoint.pending_nodes,
                "execution_time_ms": checkpoint.execution_time_ms,
                "restored_from": checkpoint_id,
                "restored_at": datetime.utcnow().isoformat()
            }
            
            logger.info(
                f"Restored state from checkpoint {checkpoint_id} "
                f"(at node {checkpoint.current_node_id})"
            )
            
            return state
            
        except Exception as e:
            logger.error(f"Error restoring checkpoint: {str(e)}")
            return None
    
    async def find_recovery_checkpoint(
        self,
        workflow_id: str,
        execution_id: str,
        strategy: RecoveryStrategy = RecoveryStrategy.RESUME_FROM_CHECKPOINT
    ) -> Optional[str]:
        """
        Find appropriate checkpoint for recovery.
        
        Args:
            workflow_id: Workflow ID
            execution_id: Execution ID
            strategy: Recovery strategy
            
        Returns:
            Checkpoint ID to recover from, or None
        """
        try:
            # List checkpoints for this execution
            checkpoints = await self.storage.list(
                workflow_id=workflow_id,
                execution_id=execution_id
            )
            
            if not checkpoints:
                logger.warning("No checkpoints found for recovery")
                return None
            
            if strategy == RecoveryStrategy.RESUME_FROM_CHECKPOINT:
                # Use most recent checkpoint
                return checkpoints[0].checkpoint_id
            
            elif strategy == RecoveryStrategy.RESUME_FROM_FAILED_NODE:
                # Find checkpoint before failed node
                for checkpoint in checkpoints:
                    if checkpoint.last_error:
                        return checkpoint.checkpoint_id
                return checkpoints[0].checkpoint_id
            
            else:
                return checkpoints[0].checkpoint_id
                
        except Exception as e:
            logger.error(f"Error finding recovery checkpoint: {str(e)}")
            return None
    
    async def list_checkpoints(
        self,
        workflow_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """List available checkpoints with metadata"""
        checkpoints = await self.storage.list(workflow_id, execution_id)
        
        return [
            {
                "checkpoint_id": c.checkpoint_id,
                "workflow_id": c.workflow_id,
                "execution_id": c.execution_id,
                "type": c.checkpoint_type,
                "created_at": c.created_at,
                "current_node": c.current_node_id,
                "size_bytes": c.checkpoint_size_bytes,
                "last_successful_node": c.last_successful_node,
                "has_error": c.last_error is not None
            }
            for c in checkpoints
        ]
    
    async def cleanup_execution_checkpoints(self, execution_id: str):
        """Clean up checkpoints for completed execution"""
        checkpoints = await self.storage.list(execution_id=execution_id)
        
        # Keep only the last checkpoint
        if len(checkpoints) > 1:
            for checkpoint in checkpoints[1:]:
                await self.storage.delete(checkpoint.checkpoint_id)
            
            logger.info(
                f"Cleaned up {len(checkpoints) - 1} checkpoints "
                f"for execution {execution_id}"
            )

class ErrorRecoveryManager:
    """
    Manages error recovery workflows.
    """
    
    def __init__(self, checkpoint_manager: CheckpointManager):
        self.checkpoint_manager = checkpoint_manager
        self.recovery_attempts: Dict[str, int] = {}
        self.max_recovery_attempts = 3
    
    async def handle_error(
        self,
        workflow_state: Dict[str, Any],
        error: Exception,
        strategy: RecoveryStrategy = RecoveryStrategy.RESUME_FROM_CHECKPOINT
    ) -> Optional[Dict[str, Any]]:
        """
        Handle workflow error and attempt recovery.
        
        Args:
            workflow_state: Current workflow state
            error: Exception that occurred
            strategy: Recovery strategy to use
            
        Returns:
            Recovered state if successful, None otherwise
        """
        execution_id = workflow_state.get("execution_id", "")
        
        # Check recovery attempts
        attempts = self.recovery_attempts.get(execution_id, 0)
        if attempts >= self.max_recovery_attempts:
            logger.error(
                f"Max recovery attempts ({self.max_recovery_attempts}) "
                f"reached for execution {execution_id}"
            )
            return None
        
        self.recovery_attempts[execution_id] = attempts + 1
        
        logger.info(
            f"Attempting recovery for execution {execution_id} "
            f"(attempt {attempts + 1}/{self.max_recovery_attempts})"
        )
        
        # Create error checkpoint
        await self.checkpoint_manager.create_checkpoint(
            workflow_state,
            checkpoint_type=CheckpointType.ERROR,
            force=True
        )
        
        # Find recovery point
        checkpoint_id = await self.checkpoint_manager.find_recovery_checkpoint(
            workflow_state.get("workflow_id", ""),
            execution_id,
            strategy
        )
        
        if not checkpoint_id:
            logger.error("No recovery checkpoint found")
            return None
        
        # Restore from checkpoint
        recovered_state = await self.checkpoint_manager.restore_from_checkpoint(
            checkpoint_id
        )
        
        if recovered_state:
            recovered_state["recovery_info"] = {
                "recovered_from_error": str(error),
                "recovery_attempt": attempts + 1,
                "recovery_strategy": strategy,
                "checkpoint_id": checkpoint_id
            }
        
        return recovered_state
    
    def reset_recovery_attempts(self, execution_id: str):
        """Reset recovery attempt counter"""
        self.recovery_attempts.pop(execution_id, None)