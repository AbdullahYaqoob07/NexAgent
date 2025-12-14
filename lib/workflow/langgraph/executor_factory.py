"""
Advanced Node Executor Factory with error handling, retry logic, and timeout management
"""
import asyncio
import time
from typing import Dict, Any, Optional, Callable, Type, List
from abc import ABC, abstractmethod
from enum import Enum
from dataclasses import dataclass
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class ErrorStrategy(str, Enum):
    """Error handling strategies"""
    FAIL_FAST = "fail_fast"          # Stop execution immediately
    IGNORE = "ignore"                # Continue execution, log error
    FALLBACK = "fallback"            # Use fallback value
    RETRY = "retry"                  # Retry with backoff
    SKIP = "skip"                    # Skip node and continue

@dataclass
class RetryConfig:
    """Configuration for retry behavior"""
    max_attempts: int = 3
    initial_delay_ms: float = 1000
    max_delay_ms: float = 60000
    exponential_base: float = 2.0
    jitter: bool = True              # Add randomness to delays
    retry_on_exceptions: tuple = (Exception,)
    retry_on_status_codes: Optional[List[int]] = None

@dataclass
class TimeoutConfig:
    """Configuration for timeout behavior"""
    execution_timeout_ms: Optional[float] = None
    connection_timeout_ms: Optional[float] = None
    read_timeout_ms: Optional[float] = None

@dataclass
class NodeConfig:
    """Complete node configuration"""
    node_id: str
    node_type: str
    node_name: str
    config: Dict[str, Any]
    error_strategy: ErrorStrategy = ErrorStrategy.FAIL_FAST
    retry_config: Optional[RetryConfig] = None
    timeout_config: Optional[TimeoutConfig] = None
    fallback_value: Any = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
        if self.retry_config is None:
            self.retry_config = RetryConfig()
        if self.timeout_config is None:
            self.timeout_config = TimeoutConfig()

class NodeExecutionContext:
    """Context passed to node executors with execution state"""
    def __init__(
        self,
        execution_id: str,
        variables: Dict[str, Any],
        api_keys: Dict[str, str],
        global_config: Dict[str, Any]
    ):
        self.execution_id = execution_id
        self.variables = variables
        self.api_keys = api_keys
        self.global_config = global_config
        self.metrics: Dict[str, Any] = {}

class NodeExecutor(ABC):
    """
    Base class for all node executors.
    Handles common functionality like validation and variable interpolation.
    """
    
    def __init__(self, config: NodeConfig, context: NodeExecutionContext):
        self.config = config
        self.context = context
        self.logger = logging.getLogger(f"{__name__}.{config.node_type}")
    
    @abstractmethod
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Implement node-specific execution logic.
        This method should be overridden by subclasses.
        """
        pass
    
    async def execute(self, input_data: Any) -> Any:
        """
        Main execution method with error handling wrapper.
        Do not override this method.
        """
        return await self._execute_impl(input_data)
    
    def validate_config(self) -> tuple[bool, List[str]]:
        """
        Validate node configuration.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        required_fields = self.get_required_config_fields()
        
        for field in required_fields:
            if field not in self.config.config:
                errors.append(f"Missing required config field: {field}")
        
        return len(errors) == 0, errors
    
    def get_required_config_fields(self) -> List[str]:
        """
        Return list of required configuration fields.
        Override in subclasses.
        """
        return []
    
    def interpolate_variables(self, text: str, data: Any) -> str:
        """
        Replace {{variable}} placeholders with values.
        Supports nested paths like {{user.profile.name}}
        """
        import re
        
        def get_nested_value(obj: Any, path: str) -> Any:
            """Get value from nested object using dot notation"""
            keys = path.split('.')
            value = obj
            
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                elif hasattr(value, key):
                    value = getattr(value, key)
                else:
                    return None
            return value
        
        def replacer(match):
            var_path = match.group(1).strip()
            
            # Check context variables first
            if var_path in self.context.variables:
                return str(self.context.variables[var_path])
            
            # Check input data
            if var_path.startswith('input.'):
                path = var_path[6:]  # Remove 'input.' prefix
                value = get_nested_value(data, path)
            else:
                value = get_nested_value(data, var_path)
            
            return str(value) if value is not None else match.group(0)
        
        return re.sub(r'\{\{([^}]+)\}\}', replacer, text)

class RetryExecutor:
    """
    Wrapper that adds retry logic to any async function.
    Implements exponential backoff with jitter.
    """
    
    @staticmethod
    def calculate_delay(
        attempt: int,
        config: RetryConfig
    ) -> float:
        """Calculate delay for next retry attempt"""
        delay = config.initial_delay_ms * (config.exponential_base ** (attempt - 1))
        delay = min(delay, config.max_delay_ms)
        
        # Add jitter to prevent thundering herd
        if config.jitter:
            import random
            jitter = random.uniform(0, delay * 0.1)
            delay += jitter
        
        return delay / 1000.0  # Convert to seconds
    
    @staticmethod
    async def execute_with_retry(
        func: Callable,
        config: RetryConfig,
        node_id: str,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic.
        
        Args:
            func: Async function to execute
            config: Retry configuration
            node_id: Node identifier for logging
            *args, **kwargs: Arguments to pass to func
            
        Returns:
            Function result
            
        Raises:
            Last exception if all retries exhausted
        """
        last_exception = None
        
        for attempt in range(1, config.max_attempts + 1):
            try:
                logger.info(f"Node {node_id}: Attempt {attempt}/{config.max_attempts}")
                result = await func(*args, **kwargs)
                
                if attempt > 1:
                    logger.info(f"Node {node_id}: Succeeded on attempt {attempt}")
                
                return result
                
            except config.retry_on_exceptions as e:
                last_exception = e
                logger.warning(
                    f"Node {node_id}: Attempt {attempt} failed: {str(e)}"
                )
                
                if attempt < config.max_attempts:
                    delay = RetryExecutor.calculate_delay(attempt, config)
                    logger.info(
                        f"Node {node_id}: Retrying in {delay:.2f}s "
                        f"(attempt {attempt + 1}/{config.max_attempts})"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Node {node_id}: All {config.max_attempts} attempts failed"
                    )
        
        raise last_exception

class TimeoutExecutor:
    """Wrapper that adds timeout functionality to async functions"""
    
    @staticmethod
    async def execute_with_timeout(
        func: Callable,
        timeout_ms: Optional[float],
        node_id: str,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with timeout.
        
        Args:
            func: Async function to execute
            timeout_ms: Timeout in milliseconds (None for no timeout)
            node_id: Node identifier for logging
            *args, **kwargs: Arguments to pass to func
            
        Returns:
            Function result
            
        Raises:
            asyncio.TimeoutError if timeout exceeded
        """
        if timeout_ms is None:
            return await func(*args, **kwargs)
        
        timeout_sec = timeout_ms / 1000.0
        
        try:
            return await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=timeout_sec
            )
        except asyncio.TimeoutError:
            logger.error(
                f"Node {node_id}: Execution timeout after {timeout_sec}s"
            )
            raise

class ErrorHandler:
    """Handles different error strategies"""
    
    @staticmethod
    async def handle_error(
        error: Exception,
        config: NodeConfig,
        input_data: Any,
        logger: logging.Logger
    ) -> Any:
        """
        Handle error based on configured strategy.
        
        Args:
            error: Exception that occurred
            config: Node configuration
            input_data: Original input data
            logger: Logger instance
            
        Returns:
            Result based on error strategy
            
        Raises:
            Exception if strategy is FAIL_FAST or RETRY
        """
        strategy = config.error_strategy
        
        if strategy == ErrorStrategy.FAIL_FAST:
            logger.error(f"Node {config.node_id}: Failing fast due to error")
            raise error
        
        elif strategy == ErrorStrategy.IGNORE:
            logger.warning(
                f"Node {config.node_id}: Ignoring error: {str(error)}"
            )
            return input_data  # Pass through input
        
        elif strategy == ErrorStrategy.FALLBACK:
            logger.warning(
                f"Node {config.node_id}: Using fallback value due to error"
            )
            return config.fallback_value
        
        elif strategy == ErrorStrategy.SKIP:
            logger.warning(
                f"Node {config.node_id}: Skipping node due to error"
            )
            return {"skipped": True, "reason": str(error), "input": input_data}
        
        else:
            raise error

class NodeExecutorFactory:
    """
    Factory for creating and managing node executors.
    Handles dynamic instantiation, configuration, and execution.
    """
    
    def __init__(self):
        self._executor_registry: Dict[str, Type[NodeExecutor]] = {}
        self._default_configs: Dict[str, NodeConfig] = {}
    
    def register_executor(
        self,
        node_type: str,
        executor_class: Type[NodeExecutor],
        default_config: Optional[Dict[str, Any]] = None
    ):
        """
        Register a node executor class.
        
        Args:
            node_type: Type identifier for the node
            executor_class: NodeExecutor subclass
            default_config: Default configuration for this node type
        """
        self._executor_registry[node_type] = executor_class
        
        if default_config:
            self._default_configs[node_type] = default_config
        
        logger.info(f"Registered executor for node type: {node_type}")
    
    def create_executor(
        self,
        node_config: NodeConfig,
        context: NodeExecutionContext
    ) -> NodeExecutor:
        """
        Create an executor instance for a node.
        
        Args:
            node_config: Node configuration
            context: Execution context
            
        Returns:
            NodeExecutor instance
            
        Raises:
            ValueError if node type not registered
        """
        node_type = node_config.node_type
        
        if node_type not in self._executor_registry:
            raise ValueError(
                f"No executor registered for node type: {node_type}. "
                f"Available types: {list(self._executor_registry.keys())}"
            )
        
        # Merge with default config
        if node_type in self._default_configs:
            merged_config = {**self._default_configs[node_type], **node_config.config}
            node_config.config = merged_config
        
        executor_class = self._executor_registry[node_type]
        executor = executor_class(node_config, context)
        
        # Validate configuration
        is_valid, errors = executor.validate_config()
        if not is_valid:
            raise ValueError(
                f"Invalid configuration for node {node_config.node_id}: {errors}"
            )
        
        return executor
    
    async def execute_node(
        self,
        node_config: NodeConfig,
        context: NodeExecutionContext,
        input_data: Any
    ) -> tuple[Any, Dict[str, Any]]:
        """
        Execute a node with full error handling, retry, and timeout support.
        
        Args:
            node_config: Node configuration
            context: Execution context
            input_data: Input data for the node
            
        Returns:
            Tuple of (output_data, execution_metrics)
        """
        start_time = time.time()
        metrics = {
            "node_id": node_config.node_id,
            "node_type": node_config.node_type,
            "attempts": 0,
            "errors": []
        }
        
        try:
            # Create executor
            executor = self.create_executor(node_config, context)
            
            # Wrap execution with retry logic
            async def execute_with_wrappers():
                # Apply timeout
                result = await TimeoutExecutor.execute_with_timeout(
                    executor.execute,
                    node_config.timeout_config.execution_timeout_ms,
                    node_config.node_id,
                    input_data
                )
                return result
            
            # Apply retry if configured
            if node_config.error_strategy == ErrorStrategy.RETRY:
                output = await RetryExecutor.execute_with_retry(
                    execute_with_wrappers,
                    node_config.retry_config,
                    node_config.node_id
                )
            else:
                output = await execute_with_wrappers()
            
            metrics["success"] = True
            return output, metrics
            
        except Exception as e:
            metrics["success"] = False
            metrics["errors"].append(str(e))
            
            # Handle error based on strategy
            output = await ErrorHandler.handle_error(
                e, node_config, input_data, logger
            )
            return output, metrics
            
        finally:
            execution_time = (time.time() - start_time) * 1000
            metrics["execution_time_ms"] = execution_time
            metrics["completed_at"] = time.time()
    
    def get_registered_types(self) -> List[str]:
        """Get list of registered node types"""
        return list(self._executor_registry.keys())