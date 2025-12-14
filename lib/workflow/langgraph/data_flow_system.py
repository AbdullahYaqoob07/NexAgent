"""
Advanced Data Flow and Variable Interpolation System
Handles data transformation, variable extraction, and type conversion across workflow nodes
"""
import re
import json
from typing import Any, Dict, List, Optional, Union, Callable
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class DataType(str, Enum):
    """Supported data types for conversion"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    NULL = "null"

@dataclass
class VariableReference:
    """Reference to a variable in the data flow"""
    path: str                          # Dot notation path (e.g., "user.profile.name")
    default: Any = None                # Default value if not found
    transform: Optional[str] = None    # Transform to apply (e.g., "upper", "lower")
    type_cast: Optional[DataType] = None  # Type to cast to

class DataFlowManager:
    """
    Manages data flow between workflow nodes.
    Handles variable extraction, interpolation, and transformation.
    """
    
    # Supported variable patterns
    VAR_PATTERN = re.compile(r'\{\{([^}]+)\}\}')
    
    # Supported transforms
    TRANSFORMS = {
        "upper": lambda x: str(x).upper(),
        "lower": lambda x: str(x).lower(),
        "trim": lambda x: str(x).strip(),
        "capitalize": lambda x: str(x).capitalize(),
        "length": lambda x: len(x) if hasattr(x, '__len__') else 0,
        "reverse": lambda x: x[::-1] if isinstance(x, (str, list)) else x,
        "json": lambda x: json.dumps(x),
        "parse_json": lambda x: json.loads(x) if isinstance(x, str) else x,
        "first": lambda x: x[0] if isinstance(x, (list, tuple)) and len(x) > 0 else None,
        "last": lambda x: x[-1] if isinstance(x, (list, tuple)) and len(x) > 0 else None,
        "keys": lambda x: list(x.keys()) if isinstance(x, dict) else [],
        "values": lambda x: list(x.values()) if isinstance(x, dict) else [],
        "sum": lambda x: sum(x) if isinstance(x, (list, tuple)) else 0,
        "join": lambda x: ','.join(str(i) for i in x) if isinstance(x, (list, tuple)) else str(x),
        "split": lambda x: str(x).split(',') if isinstance(x, str) else [x],
    }
    
    @staticmethod
    def extract_value(
        data: Any,
        path: str,
        default: Any = None,
        create_missing: bool = False
    ) -> Any:
        """
        Extract value from nested data structure using dot notation.
        
        Supports:
        - Dot notation: "user.profile.name"
        - Array indexing: "users[0].name"
        - Array wildcards: "users[*].name" (returns list)
        - Nested objects: "data.items[0].metadata.id"
        
        Args:
            data: Data structure to extract from
            path: Path to value (dot notation)
            default: Default value if path not found
            create_missing: Create missing intermediate objects
            
        Returns:
            Extracted value or default
        """
        if not path:
            return data
        
        # Handle special keywords
        if path == "$":
            return data
        if path == "$root":
            return data
        
        # Handle array wildcard [*]
        if '[*]' in path:
            return DataFlowManager._extract_wildcard(data, path)
        
        # Parse path into components
        components = DataFlowManager._parse_path(path)
        
        current = data
        for i, component in enumerate(components):
            if current is None:
                return default
            
            if isinstance(component, int):
                # Array index
                if isinstance(current, (list, tuple)):
                    if 0 <= component < len(current):
                        current = current[component]
                    else:
                        return default
                else:
                    return default
            
            elif isinstance(component, str):
                # Object key
                if isinstance(current, dict):
                    if component in current:
                        current = current[component]
                    elif create_missing and i < len(components) - 1:
                        current[component] = {}
                        current = current[component]
                    else:
                        return default
                elif hasattr(current, component):
                    current = getattr(current, component)
                else:
                    return default
        
        return current
    
    @staticmethod
    def _parse_path(path: str) -> List[Union[str, int]]:
        """Parse path into components (keys and indices)"""
        components = []
        
        # Split by dots and brackets
        parts = re.split(r'\.|\[|\]', path)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            # Try to parse as integer (array index)
            try:
                components.append(int(part))
            except ValueError:
                components.append(part)
        
        return components
    
    @staticmethod
    def _extract_wildcard(data: Any, path: str) -> List[Any]:
        """Handle wildcard extraction (e.g., users[*].name)"""
        parts = path.split('[*]', 1)
        prefix = parts[0]
        suffix = parts[1].lstrip('.') if len(parts) > 1 else ""
        
        # Get array
        array = DataFlowManager.extract_value(data, prefix, default=[])
        
        if not isinstance(array, (list, tuple)):
            return []
        
        # Extract from each item
        if suffix:
            return [
                DataFlowManager.extract_value(item, suffix)
                for item in array
            ]
        else:
            return list(array)
    
    @staticmethod
    def set_value(data: Dict, path: str, value: Any, create_missing: bool = True):
        """
        Set value in nested data structure.
        
        Args:
            data: Data structure to modify
            path: Path to set (dot notation)
            value: Value to set
            create_missing: Create missing intermediate objects
        """
        if not path or not isinstance(data, dict):
            return
        
        components = DataFlowManager._parse_path(path)
        
        current = data
        for i, component in enumerate(components[:-1]):
            if isinstance(component, str):
                if component not in current:
                    if not create_missing:
                        return
                    # Determine if next component is index or key
                    next_component = components[i + 1]
                    if isinstance(next_component, int):
                        current[component] = []
                    else:
                        current[component] = {}
                current = current[component]
        
        # Set final value
        final_component = components[-1]
        if isinstance(final_component, str):
            current[final_component] = value
        elif isinstance(final_component, int) and isinstance(current, list):
            # Extend list if necessary
            while len(current) <= final_component:
                current.append(None)
            current[final_component] = value
    
    @staticmethod
    def interpolate_string(
        template: str,
        data: Any,
        variables: Optional[Dict[str, Any]] = None,
        strict: bool = False
    ) -> str:
        """
        Interpolate variables in template string.
        
        Supports:
        - Simple variables: {{user.name}}
        - With default: {{user.name | default="Unknown"}}
        - With transform: {{user.name | upper}}
        - Multiple transforms: {{user.name | trim | upper}}
        
        Args:
            template: Template string with {{variable}} placeholders
            data: Data for interpolation
            variables: Additional variables
            strict: Raise error if variable not found
            
        Returns:
            Interpolated string
        """
        def replacer(match):
            var_expr = match.group(1).strip()
            
            try:
                # Parse variable expression
                ref = DataFlowManager._parse_variable_reference(var_expr)
                
                # Try to get from variables first
                if variables and ref.path in variables:
                    value = variables[ref.path]
                else:
                    # Extract from data
                    value = DataFlowManager.extract_value(
                        data, ref.path, default=ref.default
                    )
                
                if value is None:
                    if strict:
                        raise ValueError(f"Variable not found: {ref.path}")
                    return match.group(0)  # Keep original placeholder
                
                # Apply transform if specified
                if ref.transform:
                    value = DataFlowManager._apply_transform(
                        value, ref.transform
                    )
                
                # Apply type cast if specified
                if ref.type_cast:
                    value = DataFlowManager.convert_type(value, ref.type_cast)
                
                return str(value)
                
            except Exception as e:
                logger.warning(f"Error interpolating variable: {str(e)}")
                if strict:
                    raise
                return match.group(0)
        
        return DataFlowManager.VAR_PATTERN.sub(replacer, template)
    
    @staticmethod
    def _parse_variable_reference(expr: str) -> VariableReference:
        """
        Parse variable reference expression.
        
        Examples:
        - "user.name" -> VariableReference(path="user.name")
        - "user.name | upper" -> VariableReference(path="user.name", transform="upper")
        - "user.name | default='Unknown'" -> VariableReference(path="user.name", default="Unknown")
        """
        # Split by pipe for transforms/defaults
        parts = [p.strip() for p in expr.split('|')]
        path = parts[0]
        
        ref = VariableReference(path=path)
        
        # Parse modifiers
        for part in parts[1:]:
            if '=' in part:
                # Key=value modifier (e.g., default="value")
                key, value = part.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                
                if key == 'default':
                    ref.default = value
                elif key == 'type':
                    try:
                        ref.type_cast = DataType(value)
                    except ValueError:
                        pass
            else:
                # Transform (e.g., upper, lower)
                ref.transform = part
        
        return ref
    
    @staticmethod
    def _apply_transform(value: Any, transform: str) -> Any:
        """Apply transformation to value"""
        # Handle chained transforms (e.g., "trim | upper")
        transforms = [t.strip() for t in transform.split('|')]
        
        result = value
        for trans in transforms:
            if trans in DataFlowManager.TRANSFORMS:
                try:
                    result = DataFlowManager.TRANSFORMS[trans](result)
                except Exception as e:
                    logger.warning(
                        f"Error applying transform '{trans}': {str(e)}"
                    )
            else:
                logger.warning(f"Unknown transform: {trans}")
        
        return result
    
    @staticmethod
    def convert_type(value: Any, target_type: DataType) -> Any:
        """
        Convert value to target type.
        
        Args:
            value: Value to convert
            target_type: Target data type
            
        Returns:
            Converted value
        """
        try:
            if target_type == DataType.STRING:
                return str(value)
            
            elif target_type == DataType.INTEGER:
                if isinstance(value, bool):
                    return 1 if value else 0
                return int(float(value))
            
            elif target_type == DataType.FLOAT:
                if isinstance(value, bool):
                    return 1.0 if value else 0.0
                return float(value)
            
            elif target_type == DataType.BOOLEAN:
                if isinstance(value, str):
                    return value.lower() in ('true', '1', 'yes', 'on')
                return bool(value)
            
            elif target_type == DataType.ARRAY:
                if isinstance(value, (list, tuple)):
                    return list(value)
                elif isinstance(value, str):
                    return json.loads(value)
                return [value]
            
            elif target_type == DataType.OBJECT:
                if isinstance(value, dict):
                    return value
                elif isinstance(value, str):
                    return json.loads(value)
                return {"value": value}
            
            elif target_type == DataType.NULL:
                return None
            
            return value
            
        except Exception as e:
            logger.warning(
                f"Error converting {value} to {target_type}: {str(e)}"
            )
            return value
    
    @staticmethod
    def interpolate_object(
        obj: Any,
        data: Any,
        variables: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Recursively interpolate variables in nested object.
        
        Args:
            obj: Object to interpolate (dict, list, or string)
            data: Data for interpolation
            variables: Additional variables
            
        Returns:
            Interpolated object
        """
        if isinstance(obj, str):
            return DataFlowManager.interpolate_string(obj, data, variables)
        
        elif isinstance(obj, dict):
            return {
                key: DataFlowManager.interpolate_object(value, data, variables)
                for key, value in obj.items()
            }
        
        elif isinstance(obj, list):
            return [
                DataFlowManager.interpolate_object(item, data, variables)
                for item in obj
            ]
        
        else:
            return obj
    
    @staticmethod
    def merge_data(
        *sources: Dict[str, Any],
        strategy: str = "deep"
    ) -> Dict[str, Any]:
        """
        Merge multiple data sources.
        
        Args:
            *sources: Data sources to merge
            strategy: Merge strategy ("shallow" or "deep")
            
        Returns:
            Merged data
        """
        if not sources:
            return {}
        
        if strategy == "shallow":
            result = {}
            for source in sources:
                if isinstance(source, dict):
                    result.update(source)
            return result
        
        else:  # deep merge
            result = {}
            for source in sources:
                if isinstance(source, dict):
                    DataFlowManager._deep_merge(result, source)
            return result
    
    @staticmethod
    def _deep_merge(target: Dict, source: Dict):
        """Deep merge source into target"""
        for key, value in source.items():
            if key in target:
                if isinstance(target[key], dict) and isinstance(value, dict):
                    DataFlowManager._deep_merge(target[key], value)
                elif isinstance(target[key], list) and isinstance(value, list):
                    target[key].extend(value)
                else:
                    target[key] = value
            else:
                target[key] = value

class CrossNodeDataBus:
    """
    Manages data passing between nodes in a workflow.
    Provides a centralized data store with versioning.
    """
    
    def __init__(self):
        self.data_store: Dict[str, Any] = {}
        self.node_outputs: Dict[str, Any] = {}  # node_id -> output
        self.history: List[Dict[str, Any]] = []
        self.variables: Dict[str, Any] = {}
    
    def set_node_output(self, node_id: str, output: Any):
        """Store output from a node"""
        self.node_outputs[node_id] = output
        self.history.append({
            "node_id": node_id,
            "output": output,
            "timestamp": DataFlowManager.extract_value({}, "now")
        })
    
    def get_node_output(self, node_id: str, default: Any = None) -> Any:
        """Get output from a specific node"""
        return self.node_outputs.get(node_id, default)
    
    def set_variable(self, name: str, value: Any):
        """Set a global variable"""
        self.variables[name] = value
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get a global variable"""
        return self.variables.get(name, default)
    
    def get_context_for_node(self, current_node_id: str) -> Dict[str, Any]:
        """
        Get complete context available to a node.
        Includes outputs from all previous nodes and global variables.
        """
        return {
            "node_outputs": self.node_outputs.copy(),
            "variables": self.variables.copy(),
            "current_node": current_node_id,
            "execution_history": self.history.copy()
        }
    
    def clear(self):
        """Clear all stored data"""
        self.data_store.clear()
        self.node_outputs.clear()
        self.history.clear()
        self.variables.clear()