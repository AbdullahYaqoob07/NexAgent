"""
Base Node Executor
Provides common functionality for all node executors
"""
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod
import logging
from ..executor_factory import NodeExecutor, NodeConfig, NodeExecutionContext
from ..data_flow_system import DataFlowManager

logger = logging.getLogger(__name__)


class BaseNodeExecutor(NodeExecutor):
    """
    Base class for all node executors.
    Provides common functionality like validation, variable interpolation, and error handling.
    """
    
    def __init__(self, config: NodeConfig, context: NodeExecutionContext):
        super().__init__(config, context)
        self.data_flow = DataFlowManager()
    
    @abstractmethod
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Implement node-specific execution logic.
        This method should be overridden by subclasses.
        """
        pass
    
    def get_required_config_fields(self) -> List[str]:
        """
        Return list of required configuration fields.
        Override in subclasses to specify required fields.
        """
        return []
    
    def validate_config(self) -> tuple[bool, List[str]]:
        """
        Validate node configuration.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        required_fields = self.get_required_config_fields()
        
        for field in required_fields:
            if field not in self.config.config:
                errors.append(f"Missing required config field: '{field}'")
        
        # Additional validation can be added by subclasses
        custom_errors = self._validate_custom_config()
        errors.extend(custom_errors)
        
        return len(errors) == 0, errors
    
    def _validate_custom_config(self) -> List[str]:
        """
        Override in subclasses for custom validation logic.
        Returns list of error messages.
        """
        return []
    
    def interpolate_config(self, config: Dict[str, Any], input_data: Any) -> Dict[str, Any]:
        """
        Interpolate variables in configuration using {{variable}} syntax.
        
        Args:
            config: Configuration dictionary
            input_data: Input data for interpolation
            
        Returns:
            Interpolated configuration
        """
        return self.data_flow.interpolate_object(config, input_data, self.context.variables)
    
    def extract_value(self, data: Any, path: str, default: Any = None) -> Any:
        """
        Extract value from data using dot notation.
        
        Args:
            data: Data to extract from
            path: Dot notation path (e.g., "user.name")
            default: Default value if path not found
            
        Returns:
            Extracted value
        """
        return self.data_flow.extract_value(data, path, default)
    
    async def execute(self, input_data: Any) -> Any:
        """
        Main execution method with validation and error handling.
        """
        # Validate configuration first
        is_valid, errors = self.validate_config()
        if not is_valid:
            error_msg = f"Node '{self.config.node_id}' ({self.config.node_type}) configuration invalid: {', '.join(errors)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Interpolate variables in config
        interpolated_config = self.interpolate_config(self.config.config, input_data)
        
        # Store original config and use interpolated for execution
        original_config = self.config.config
        self.config.config = interpolated_config
        
        try:
            # Execute the node
            result = await self._execute_impl(input_data)
            return result
        finally:
            # Restore original config
            self.config.config = original_config

