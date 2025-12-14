"""
Parallel Execution Coordinator
Manages parallel branch execution, synchronization, and result aggregation
"""
import asyncio
from typing import Dict, List, Any, Optional, Set, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
import time
import logging

logger = logging.getLogger(__name__)

class BranchStatus(str, Enum):
    """Status of parallel execution branch"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class MergeStrategy(str, Enum):
    """Strategy for merging results from parallel branches"""
    COMBINE_DICT = "combine_dict"      # Merge into dict with branch IDs
    COMBINE_LIST = "combine_list"      # Merge into list
    FIRST = "first"                    # Return first completed
    LAST = "last"                      # Return last completed
    FASTEST = "fastest"                # Return fastest (same as first)
    ALL_SUCCESS = "all_success"        # All must succeed
    ANY_SUCCESS = "any_success"        # At least one must succeed
    CUSTOM = "custom"                  # Use custom merge function

@dataclass
class BranchMetadata:
    """Metadata for a parallel execution branch"""
    branch_id: str
    parent_node_id: str
    node_ids: List[str]
    status: BranchStatus = BranchStatus.PENDING
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    result: Any = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0

@dataclass
class SynchronizationPoint:
    """A point where parallel branches must synchronize"""
    sync_id: str
    node_id: str                       # The converging node
    expected_branches: Set[str]        # Branch IDs that must complete
    completed_branches: Set[str] = field(default_factory=set)
    branch_results: Dict[str, Any] = field(default_factory=dict)
    merge_strategy: MergeStrategy = MergeStrategy.COMBINE_DICT
    timeout_ms: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    
    def is_complete(self) -> bool:
        """Check if all expected branches have completed"""
        return self.completed_branches >= self.expected_branches
    
    def is_timeout(self) -> bool:
        """Check if synchronization has timed out"""
        if self.timeout_ms is None:
            return False
        elapsed = (time.time() - self.created_at) * 1000
        return elapsed > self.timeout_ms

class ParallelExecutionCoordinator:
    """
    Coordinates parallel execution of workflow branches.
    Handles branch identification, execution, and synchronization.
    """
    
    def __init__(
        self,
        max_concurrent_branches: int = 10,
        default_timeout_ms: Optional[float] = None,
        enable_deadlock_detection: bool = True
    ):
        self.max_concurrent_branches = max_concurrent_branches
        self.default_timeout_ms = default_timeout_ms
        self.enable_deadlock_detection = enable_deadlock_detection
        
        # Active execution tracking
        self.active_branches: Dict[str, BranchMetadata] = {}
        self.sync_points: Dict[str, SynchronizationPoint] = {}
        self.branch_semaphore = asyncio.Semaphore(max_concurrent_branches)
        
        # Deadlock detection
        self._dependency_graph: Dict[str, Set[str]] = {}
        self._execution_lock = asyncio.Lock()
    
    def identify_parallel_branches(
        self,
        connections: List[Dict[str, Any]],
        start_node_id: str
    ) -> Dict[str, List[str]]:
        """
        Identify parallel branches from a starting node.
        
        Args:
            connections: List of workflow connections
            start_node_id: Node where branches split
            
        Returns:
            Dict mapping branch_id to list of node_ids in that branch
        """
        # Find all outgoing connections from start node
        outgoing = [
            conn for conn in connections 
            if conn.get("sourceNodeId") == start_node_id
        ]
        
        if len(outgoing) <= 1:
            return {}
        
        branches = {}
        
        # Each outgoing connection starts a new branch
        for conn in outgoing:
            target_id = conn.get("targetNodeId")
            if not target_id:
                continue
            
            branch_id = f"branch_{uuid4().hex[:8]}"
            
            # Trace nodes in this branch until convergence
            branch_nodes = self._trace_branch(
                connections, target_id, start_node_id
            )
            
            branches[branch_id] = branch_nodes
            
            logger.debug(
                f"Identified branch {branch_id} with {len(branch_nodes)} nodes"
            )
        
        return branches
    
    def _trace_branch(
        self,
        connections: List[Dict[str, Any]],
        start_node: str,
        parent_node: str
    ) -> List[str]:
        """
        Trace nodes in a branch until convergence or termination.
        
        Args:
            connections: All workflow connections
            start_node: Starting node of branch
            parent_node: Parent node where branch split
            
        Returns:
            List of node IDs in this branch
        """
        branch_nodes = [start_node]
        current = start_node
        visited = {parent_node, start_node}
        
        while True:
            # Find outgoing connections from current node
            outgoing = [
                conn for conn in connections
                if conn.get("sourceNodeId") == current
            ]
            
            if not outgoing:
                # End of branch (no outgoing connections)
                break
            
            if len(outgoing) > 1:
                # Branch splits again - stop here
                break
            
            next_node = outgoing[0].get("targetNodeId")
            if not next_node or next_node in visited:
                break
            
            # Check if next node is a convergence point
            # (has multiple incoming connections)
            incoming = [
                conn for conn in connections
                if conn.get("targetNodeId") == next_node
            ]
            
            if len(incoming) > 1:
                # Convergence point - include it and stop
                branch_nodes.append(next_node)
                break
            
            branch_nodes.append(next_node)
            visited.add(next_node)
            current = next_node
        
        return branch_nodes
    
    def find_convergence_point(
        self,
        connections: List[Dict[str, Any]],
        branch_nodes: Dict[str, List[str]]
    ) -> Optional[str]:
        """
        Find the node where parallel branches converge.
        
        Args:
            connections: All workflow connections
            branch_nodes: Dict of branch_id to node lists
            
        Returns:
            Node ID where branches converge, or None
        """
        # Get all nodes that could be convergence points
        all_branch_nodes = set()
        for nodes in branch_nodes.values():
            all_branch_nodes.update(nodes)
        
        # Find nodes with multiple incoming connections
        for node_id in all_branch_nodes:
            incoming = [
                conn for conn in connections
                if conn.get("targetNodeId") == node_id
            ]
            
            if len(incoming) >= len(branch_nodes):
                # This node has connections from multiple branches
                # Check if all branches lead to it
                source_nodes = {conn["sourceNodeId"] for conn in incoming}
                
                branches_reaching = 0
                for nodes in branch_nodes.values():
                    if any(node in source_nodes for node in nodes):
                        branches_reaching += 1
                
                if branches_reaching >= len(branch_nodes):
                    return node_id
        
        return None
    
    async def execute_parallel_branches(
        self,
        branch_definitions: Dict[str, List[str]],
        executor_func: Callable[[str, Any], Awaitable[Any]],
        initial_data: Any,
        parent_node_id: str,
        merge_strategy: MergeStrategy = MergeStrategy.COMBINE_DICT,
        timeout_ms: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Execute multiple branches in parallel.
        
        Args:
            branch_definitions: Dict of branch_id to node_ids
            executor_func: Async function to execute a node
            initial_data: Data to pass to first node in each branch
            parent_node_id: Parent node where branches split
            merge_strategy: How to merge results
            timeout_ms: Timeout for all branches
            
        Returns:
            Dict with execution results and metadata
        """
        if not branch_definitions:
            return {
                "status": "no_branches",
                "data": initial_data
            }
        
        async with self._execution_lock:
            # Create branch metadata
            branches = {}
            for branch_id, node_ids in branch_definitions.items():
                metadata = BranchMetadata(
                    branch_id=branch_id,
                    parent_node_id=parent_node_id,
                    node_ids=node_ids,
                    status=BranchStatus.PENDING
                )
                branches[branch_id] = metadata
                self.active_branches[branch_id] = metadata
        
        # Create tasks for each branch
        tasks = []
        for branch_id, metadata in branches.items():
            task = asyncio.create_task(
                self._execute_branch(
                    branch_id, metadata, executor_func, initial_data
                )
            )
            tasks.append(task)
        
        # Wait for all branches with timeout
        timeout_sec = (timeout_ms or self.default_timeout_ms or 0) / 1000.0
        
        try:
            if timeout_sec > 0:
                results = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=timeout_sec
                )
            else:
                results = await asyncio.gather(*tasks, return_exceptions=True)
        
        except asyncio.TimeoutError:
            logger.error(
                f"Parallel execution timeout after {timeout_sec}s"
            )
            # Cancel remaining tasks
            for task in tasks:
                if not task.done():
                    task.cancel()
            
            results = [
                Exception(f"Branch timeout") for _ in tasks
            ]
        
        # Process results
        branch_results = {}
        for branch_id, result in zip(branches.keys(), results):
            metadata = branches[branch_id]
            
            if isinstance(result, Exception):
                metadata.status = BranchStatus.FAILED
                metadata.error = str(result)
                logger.error(f"Branch {branch_id} failed: {result}")
            else:
                metadata.status = BranchStatus.COMPLETED
                metadata.result = result
                branch_results[branch_id] = result
        
        # Merge results based on strategy
        merged_result = self._merge_results(
            branch_results, branches, merge_strategy
        )
        
        # Cleanup
        async with self._execution_lock:
            for branch_id in branches.keys():
                self.active_branches.pop(branch_id, None)
        
        return {
            "status": "completed",
            "branches": {
                bid: {
                    "status": meta.status,
                    "execution_time_ms": meta.execution_time_ms,
                    "error": meta.error
                }
                for bid, meta in branches.items()
            },
            "data": merged_result,
            "merge_strategy": merge_strategy
        }
    
    async def _execute_branch(
        self,
        branch_id: str,
        metadata: BranchMetadata,
        executor_func: Callable[[str, Any], Awaitable[Any]],
        initial_data: Any
    ) -> Any:
        """Execute a single branch"""
        async with self.branch_semaphore:
            start_time = time.time()
            metadata.status = BranchStatus.RUNNING
            metadata.started_at = start_time
            
            try:
                current_data = initial_data
                
                # Execute each node in the branch sequentially
                for node_id in metadata.node_ids:
                    logger.debug(
                        f"Branch {branch_id}: Executing node {node_id}"
                    )
                    current_data = await executor_func(node_id, current_data)
                
                metadata.status = BranchStatus.COMPLETED
                metadata.result = current_data
                return current_data
                
            except Exception as e:
                metadata.status = BranchStatus.FAILED
                metadata.error = str(e)
                logger.error(
                    f"Branch {branch_id} execution failed: {str(e)}"
                )
                raise
            
            finally:
                metadata.completed_at = time.time()
                metadata.execution_time_ms = (
                    (metadata.completed_at - start_time) * 1000
                )
    
    def _merge_results(
        self,
        branch_results: Dict[str, Any],
        branches: Dict[str, BranchMetadata],
        strategy: MergeStrategy
    ) -> Any:
        """Merge results from parallel branches"""
        if not branch_results:
            return None
        
        if strategy == MergeStrategy.COMBINE_DICT:
            return {
                "merged": True,
                "branches": branch_results,
                "metadata": {
                    bid: {
                        "execution_time_ms": meta.execution_time_ms,
                        "status": meta.status
                    }
                    for bid, meta in branches.items()
                }
            }
        
        elif strategy == MergeStrategy.COMBINE_LIST:
            return list(branch_results.values())
        
        elif strategy == MergeStrategy.FIRST or strategy == MergeStrategy.FASTEST:
            # Return result from fastest branch
            fastest = min(
                branches.items(),
                key=lambda x: x[1].execution_time_ms
            )
            return branch_results.get(fastest[0])
        
        elif strategy == MergeStrategy.LAST:
            slowest = max(
                branches.items(),
                key=lambda x: x[1].execution_time_ms
            )
            return branch_results.get(slowest[0])
        
        elif strategy == MergeStrategy.ALL_SUCCESS:
            # Only return if all branches succeeded
            if len(branch_results) == len(branches):
                return branch_results
            else:
                raise Exception("Not all branches succeeded")
        
        elif strategy == MergeStrategy.ANY_SUCCESS:
            # Return if at least one branch succeeded
            if branch_results:
                return next(iter(branch_results.values()))
            else:
                raise Exception("No branches succeeded")
        
        return branch_results
    
    def create_synchronization_point(
        self,
        node_id: str,
        expected_branches: Set[str],
        merge_strategy: MergeStrategy = MergeStrategy.COMBINE_DICT,
        timeout_ms: Optional[float] = None
    ) -> str:
        """
        Create a synchronization point for parallel branches.
        
        Args:
            node_id: Converging node ID
            expected_branches: Set of branch IDs expected to complete
            merge_strategy: How to merge results
            timeout_ms: Timeout for synchronization
            
        Returns:
            Synchronization point ID
        """
        sync_id = f"sync_{uuid4().hex[:8]}"
        
        sync_point = SynchronizationPoint(
            sync_id=sync_id,
            node_id=node_id,
            expected_branches=expected_branches,
            merge_strategy=merge_strategy,
            timeout_ms=timeout_ms or self.default_timeout_ms
        )
        
        self.sync_points[sync_id] = sync_point
        logger.debug(
            f"Created sync point {sync_id} at node {node_id} "
            f"expecting {len(expected_branches)} branches"
        )
        
        return sync_id
    
    async def wait_for_synchronization(
        self,
        sync_id: str,
        check_interval_ms: float = 100
    ) -> Dict[str, Any]:
        """
        Wait for all branches to reach synchronization point.
        
        Args:
            sync_id: Synchronization point ID
            check_interval_ms: How often to check completion
            
        Returns:
            Merged results from all branches
        """
        sync_point = self.sync_points.get(sync_id)
        if not sync_point:
            raise ValueError(f"Synchronization point {sync_id} not found")
        
        check_interval = check_interval_ms / 1000.0
        
        while True:
            if sync_point.is_complete():
                # All branches completed
                logger.debug(f"Sync point {sync_id} complete")
                merged = self._merge_results(
                    sync_point.branch_results,
                    {},  # No metadata needed here
                    sync_point.merge_strategy
                )
                self.sync_points.pop(sync_id)
                return merged
            
            if sync_point.is_timeout():
                # Timeout exceeded
                logger.error(
                    f"Sync point {sync_id} timeout. "
                    f"Completed: {len(sync_point.completed_branches)}/"
                    f"{len(sync_point.expected_branches)}"
                )
                self.sync_points.pop(sync_id)
                raise TimeoutError(f"Synchronization timeout at {sync_id}")
            
            await asyncio.sleep(check_interval)
    
    def detect_deadlock(self) -> Optional[List[str]]:
        """
        Detect deadlock in parallel execution.
        Returns list of branch IDs involved in deadlock, or None.
        """
        if not self.enable_deadlock_detection:
            return None
        
        # Simple cycle detection in dependency graph
        visited = set()
        rec_stack = set()
        deadlock_cycle = []
        
        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self._dependency_graph.get(node, set()):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        deadlock_cycle.append(neighbor)
                        return True
                elif neighbor in rec_stack:
                    deadlock_cycle.append(neighbor)
                    return True
            
            rec_stack.remove(node)
            return False
        
        for branch_id in self.active_branches.keys():
            if branch_id not in visited:
                if has_cycle(branch_id):
                    return deadlock_cycle
        
        return None