"""
Main Orchestrator Class
Complete workflow orchestrator integrating all components
"""
from typing import Dict, Any, Optional, List
import asyncio
import logging
from datetime import datetime

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

# Import all the components we've created
from .state_management import StateManager, WorkflowState, NodeStatus
from .executor_factory import (
    NodeExecutorFactory, NodeConfig, ErrorStrategy, 
    RetryConfig, TimeoutConfig, NodeExecutionContext
)
from .conditional_routing import ConditionalRouter
from .parallel_coordinator import (
    ParallelExecutionCoordinator, MergeStrategy
)
from .circuit_breaker import CircuitBreakerRegistry, CircuitBreakerConfig
from .data_flow_system import DataFlowManager, CrossNodeDataBus
from .error_recovery import (
    CheckpointManager, FileCheckpointStorage,
    ErrorRecoveryManager, RecoveryStrategy, CheckpointType
)
from .scheduler import get_scheduler

logger = logging.getLogger(__name__)

class WorkflowOrchestrator:
    """
    Master orchestrator that integrates all components.
    """
    
    def __init__(
        self,
        api_keys: Optional[Dict[str, str]] = None,
        enable_checkpointing: bool = True,
        enable_circuit_breakers: bool = True,
        checkpoint_storage_dir: str = "./checkpoints"
    ):
        # Core components
        self.executor_factory = NodeExecutorFactory()
        self.conditional_router = ConditionalRouter()
        self.parallel_coordinator = ParallelExecutionCoordinator()
        self.data_bus = CrossNodeDataBus()
        
        # Circuit breakers
        self.enable_circuit_breakers = enable_circuit_breakers
        if enable_circuit_breakers:
            self.circuit_breaker_registry = CircuitBreakerRegistry()
        
        # Checkpointing
        self.enable_checkpointing = enable_checkpointing
        if enable_checkpointing:
            storage = FileCheckpointStorage(checkpoint_storage_dir)
            self.checkpoint_manager = CheckpointManager(
                storage,
                auto_checkpoint=True,
                checkpoint_interval_nodes=3
            )
            self.recovery_manager = ErrorRecoveryManager(
                self.checkpoint_manager
            )
        
        # Configuration
        self.api_keys = api_keys or {}
        
        # Register node executors
        self._register_node_types()
    
    def _register_node_types(self):
        """Register all supported node types"""
        from .nodes import (
            # Triggers
            ScheduleTriggerExecutor,
            WebhookTriggerExecutor,
            ManualTriggerExecutor,
            # Actions
            HttpRequestExecutor,
            EmailExecutor,
            SlackExecutor,
            DatabaseExecutor,
            # Logic
            IfConditionExecutor,
            SwitchExecutor,
            LoopExecutor,
            MergeExecutor,
            DelayExecutor,
            # AI/ML
            OpenAIExecutor,
            TextAnalysisExecutor,
            ImageProcessingExecutor,
            DataTransformExecutor,
            # Data
            JsonParseExecutor,
            XmlParseExecutor,
            CsvParseExecutor,
            DataFilterExecutor,
        )
        
        # Register triggers
        self.executor_factory.register_executor("Schedule", ScheduleTriggerExecutor)
        self.executor_factory.register_executor("ScheduleTriggerNode", ScheduleTriggerExecutor)
        self.executor_factory.register_executor("Webhook", WebhookTriggerExecutor)
        self.executor_factory.register_executor("WebhookTriggerNode", WebhookTriggerExecutor)
        self.executor_factory.register_executor("Manual Trigger", ManualTriggerExecutor)
        self.executor_factory.register_executor("OnClickExecuteTriggerNode", ManualTriggerExecutor)
        
        # Register actions
        self.executor_factory.register_executor("HTTP Request", HttpRequestExecutor)
        self.executor_factory.register_executor("HTTP Request Action", HttpRequestExecutor)
        self.executor_factory.register_executor("HttpNode", HttpRequestExecutor)
        self.executor_factory.register_executor("Send Email", EmailExecutor)
        self.executor_factory.register_executor("EmailNode", EmailExecutor)
        self.executor_factory.register_executor("Slack Message", SlackExecutor)
        self.executor_factory.register_executor("SlackNode", SlackExecutor)
        self.executor_factory.register_executor("Database Query", DatabaseExecutor)
        self.executor_factory.register_executor("DatabaseNode", DatabaseExecutor)
        
        # Register logic
        self.executor_factory.register_executor("If Condition", IfConditionExecutor)
        self.executor_factory.register_executor("IfNode", IfConditionExecutor)
        self.executor_factory.register_executor("Switch", SwitchExecutor)
        self.executor_factory.register_executor("SwitchNode", SwitchExecutor)
        self.executor_factory.register_executor("Loop", LoopExecutor)
        self.executor_factory.register_executor("LoopNode", LoopExecutor)
        self.executor_factory.register_executor("Merge", MergeExecutor)
        self.executor_factory.register_executor("MergeNode", MergeExecutor)
        self.executor_factory.register_executor("Delay", DelayExecutor)
        self.executor_factory.register_executor("DelayNode", DelayExecutor)
        
        # Register AI/ML
        self.executor_factory.register_executor("OpenAI GPT", OpenAIExecutor)
        self.executor_factory.register_executor("OpenAI", OpenAIExecutor)
        self.executor_factory.register_executor("OpenAINode", OpenAIExecutor)
        self.executor_factory.register_executor("Text Analysis", TextAnalysisExecutor)
        self.executor_factory.register_executor("TextAnalysisNode", TextAnalysisExecutor)
        self.executor_factory.register_executor("Image Processing", ImageProcessingExecutor)
        self.executor_factory.register_executor("ImageProcessingNode", ImageProcessingExecutor)
        self.executor_factory.register_executor("Data Transformation", DataTransformExecutor)
        self.executor_factory.register_executor("DataTransformNode", DataTransformExecutor)
        
        # Register data
        self.executor_factory.register_executor("JSON Parse", JsonParseExecutor)
        self.executor_factory.register_executor("JsonParseNode", JsonParseExecutor)
        self.executor_factory.register_executor("XML Parse", XmlParseExecutor)
        self.executor_factory.register_executor("XmlParseNode", XmlParseExecutor)
        self.executor_factory.register_executor("CSV Parse", CsvParseExecutor)
        self.executor_factory.register_executor("CsvParseNode", CsvParseExecutor)
        self.executor_factory.register_executor("Data Filter", DataFilterExecutor)
        self.executor_factory.register_executor("DataFilterNode", DataFilterExecutor)
        
        logger.info(f"Registered {len(self.executor_factory.get_registered_types())} node types")
    
    async def execute_workflow(
        self,
        workflow_data: Dict[str, Any],
        initial_input: Any = None
    ) -> Dict[str, Any]:
        """
        Execute a complete workflow.
        
        Args:
            workflow_data: Workflow definition from frontend
            initial_input: Initial input data
            
        Returns:
            Execution result with all node outputs and metadata
        """
        logger.info(f"Starting workflow execution: {workflow_data.get('id', 'unknown')}")
        
        # Create initial state
        state = StateManager.create_initial_state(
            workflow_id=workflow_data.get("id", "unknown"),
            initial_input=initial_input,
            config=workflow_data.get("config", {}),
            api_keys=self.api_keys
        )
        
        # Add workflow data to global config for nodes to access (needed for Schedule node)
        state["global_config"]["workflow_data"] = workflow_data
        state["global_config"]["workflow_id"] = workflow_data.get("id", "unknown")
        
        # Update workflow status
        state["workflow_status"] = "running"
        state["started_at"] = datetime.utcnow().isoformat()
        
        try:
            # Execute nodes based on connections
            nodes = workflow_data.get("nodes", [])
            connections = workflow_data.get("connections", [])
            
            # Find start node (node with no incoming connections)
            all_target_nodes = {conn["targetNodeId"] for conn in connections}
            start_nodes = [node for node in nodes if node["id"] not in all_target_nodes]
            
            if not start_nodes:
                raise ValueError("No start node found in workflow")
            
            # Execute workflow starting from start node
            result = await self._execute_nodes(state, nodes, connections, start_nodes[0])
            
            # Update final state
            state["workflow_status"] = "completed"
            state["last_updated_at"] = datetime.utcnow().isoformat()
            
            # Generate summary
            summary = StateManager.get_execution_summary(state)
            
            return {
                "status": "success",
                "summary": summary,
                "final_output": state["current_data"],
                "node_logs": state["node_logs"],
                "execution_time_ms": state["execution_time_ms"]
            }
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            state["workflow_status"] = "failed"
            state["errors"].append(str(e))
            
            # Attempt recovery if enabled
            if self.enable_checkpointing and self.recovery_manager:
                recovered_state = await self.recovery_manager.handle_error(
                    state, e, RecoveryStrategy.RESUME_FROM_CHECKPOINT
                )
                
                if recovered_state:
                    # Retry from checkpoint
                    logger.info("Retrying workflow execution from checkpoint")
                    return await self.execute_workflow(workflow_data, initial_input)
            
            return {
                "status": "failed",
                "error": str(e),
                "partial_results": state.get("node_logs", [])
            }
    
    async def _execute_nodes(
        self,
        state: WorkflowState,
        nodes: List[Dict[str, Any]],
        connections: List[Dict[str, Any]],
        start_node: Dict[str, Any]
    ) -> Any:
        """
        Execute nodes in the workflow based on connections.
        
        Args:
            state: Current workflow state
            nodes: List of all nodes
            connections: List of connections between nodes
            start_node: Starting node
            
        Returns:
            Final output data
        """
        current_node = start_node
        current_data = state["current_data"]
        
        # Create a map of node ID to node for easy lookup
        node_map = {node["id"]: node for node in nodes}
        
        while current_node:
            node_id = current_node["id"]
            logger.info(f"Executing node: {node_id} ({current_node['type']})")
            
            # Mark node as visited
            state["visited_nodes"].append(node_id)
            state["current_node_id"] = node_id
            
            # Create checkpoint before execution if enabled
            if self.enable_checkpointing:
                await self.checkpoint_manager.create_checkpoint(
                    state, CheckpointType.NODE
                )
            
            try:
                # Execute the node
                node_output = await self._execute_single_node(
                    state, current_node, current_data
                )
                
                # Update state with node result
                # Get node name with fallback: name -> type -> id
                node_name = (
                    current_node.get("name") or 
                    current_node.get("type") or 
                    node_id
                )
                log_entry = StateManager.update_node_log(
                    state,
                    node_id=node_id,
                    node_name=node_name,
                    node_type=current_node.get("type", "unknown"),
                    status=NodeStatus.SUCCESS,
                    output=node_output,
                    execution_time_ms=100.0  # Placeholder
                )
                state["node_logs"].append(log_entry)
                state["current_data"] = node_output
                
                # Store in data bus
                self.data_bus.set_node_output(node_id, node_output)
                
                # Find next node(s) based on connections
                next_connections = [
                    conn for conn in connections 
                    if conn["sourceNodeId"] == node_id
                ]
                
                if not next_connections:
                    # No more connections, workflow complete
                    logger.info(f"Workflow completed at node: {node_id}")
                    return node_output
                
                # Handle multiple connections (conditional routing)
                target_node_ids = self.conditional_router.route_connections(
                    next_connections, node_id, current_data, state["variables"]
                )
                
                if not target_node_ids:
                    # No routes matched, workflow ends here
                    logger.info(f"No routes matched from node: {node_id}")
                    return node_output
                
                # For simplicity, we'll follow the first matching route
                # In a more complex implementation, you might handle parallel execution
                next_node_id = target_node_ids[0]
                current_node = node_map.get(next_node_id)
                current_data = node_output
                
                if not current_node:
                    raise ValueError(f"Target node {next_node_id} not found")
                
            except Exception as e:
                logger.error(f"Error executing node {node_id}: {str(e)}")
                
                # Log the error
                # Get node name with fallback: name -> type -> id
                node_name = (
                    current_node.get("name") or 
                    current_node.get("type") or 
                    node_id
                )
                log_entry = StateManager.update_node_log(
                    state,
                    node_id=node_id,
                    node_name=node_name,
                    node_type=current_node.get("type", "unknown"),
                    status=NodeStatus.FAILED,
                    error=e,
                    execution_time_ms=0.0
                )
                state["node_logs"].append(log_entry)
                state["errors"].append(str(e))
                
                raise e
        
        return current_data
    
    async def _execute_single_node(
        self,
        state: WorkflowState,
        node: Dict[str, Any],
        input_data: Any
    ) -> Any:
        """
        Execute a single node.
        
        Args:
            state: Current workflow state
            node: Node definition
            input_data: Input data for the node
            
        Returns:
            Node output data
        """
        node_id = node["id"]
        node_type = node["type"]
        node_config = node.get("config", {})
        
        logger.info(f"Executing node {node_id} of type {node_type}")
        
        # Create node configuration
        config = NodeConfig(
            node_id=node_id,
            node_type=node_type,
            node_name=node.get("name", node_id),
            config=node_config,
            error_strategy=ErrorStrategy.FAIL_FAST,
            retry_config=RetryConfig(max_attempts=3),
            timeout_config=TimeoutConfig(execution_timeout_ms=30000)
        )
        
        # Create execution context
        # Get workflow data from state for Schedule node
        workflow_data = state.get("global_config", {}).get("workflow_data", {})
        context = NodeExecutionContext(
            execution_id=state["execution_id"],
            variables=state["variables"],
            api_keys=state["api_keys"],
            global_config={
                **state["global_config"],
                "workflow_data": workflow_data,
                "workflow_id": workflow_data.get("id", "unknown")
            }
        )
        
        # Use executor factory to execute the node
        try:
            output, metrics = await self.executor_factory.execute_node(
                config, context, input_data
            )
            
            # Log execution metrics
            logger.info(
                f"Node {node_id} executed successfully. "
                f"Time: {metrics.get('execution_time_ms', 0):.2f}ms"
            )
            
            return output
            
        except ValueError as e:
            # Configuration validation error
            error_msg = str(e)
            logger.error(f"Node {node_id} configuration error: {error_msg}")
            
            # Update state with error
            state["errors"].append(f"Node {node_id}: {error_msg}")
            
            raise ValueError(f"Node '{node_id}' ({node_type}) is not properly configured. {error_msg}")
        
        except Exception as e:
            # Other execution errors
            error_msg = str(e)
            logger.error(f"Node {node_id} execution error: {error_msg}")
            raise
    
    def register_node_executor(
        self,
        node_type: str,
        executor_class: Any,
        default_config: Optional[Dict[str, Any]] = None
    ):
        """
        Register a custom node executor.
        
        Args:
            node_type: Type identifier for the node
            executor_class: NodeExecutor subclass
            default_config: Default configuration for this node type
        """
        self.executor_factory.register_executor(
            node_type, executor_class, default_config
        )
        logger.info(f"Registered custom executor for node type: {node_type}")