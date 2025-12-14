"""
Advanced Conditional Routing Engine
Supports complex condition evaluation, multi-condition logic, and dynamic routing
"""
import re
from typing import Any, Dict, List, Optional, Union, Callable
from enum import Enum
from dataclasses import dataclass
import operator
import logging

logger = logging.getLogger(__name__)

class ConditionOperator(str, Enum):
    """Supported comparison operators"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_OR_EQUAL = "greater_or_equal"
    LESS_OR_EQUAL = "less_or_equal"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    REGEX_MATCH = "regex_match"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"
    IN = "in"
    NOT_IN = "not_in"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"
    TYPE_IS = "type_is"

class LogicalOperator(str, Enum):
    """Logical operators for combining conditions"""
    AND = "AND"
    OR = "OR"
    NOT = "NOT"

@dataclass
class Condition:
    """Single condition definition"""
    field: str                           # Field path (e.g., "user.age")
    operator: ConditionOperator          # Comparison operator
    value: Any = None                    # Value to compare against
    case_sensitive: bool = True          # For string comparisons
    regex_flags: int = 0                 # For regex matching
    
    def __str__(self):
        return f"{self.field} {self.operator.value} {self.value}"

@dataclass
class ConditionGroup:
    """Group of conditions with logical operator"""
    conditions: List[Union[Condition, 'ConditionGroup']]
    operator: LogicalOperator = LogicalOperator.AND
    
    def __str__(self):
        cond_strs = [str(c) for c in self.conditions]
        return f"({f' {self.operator.value} '.join(cond_strs)})"

class ConditionParser:
    """
    Parses condition strings into structured Condition objects.
    Supports multiple formats:
    - Simple: "field operator value"
    - JSON: {"field": "user.age", "operator": "greater_than", "value": 18}
    - Complex: "(field1 > 10 AND field2 == 'active') OR field3 exists"
    """
    
    # Operator mapping from string to enum
    OPERATOR_MAP = {
        "==": ConditionOperator.EQUALS,
        "equals": ConditionOperator.EQUALS,
        "!=": ConditionOperator.NOT_EQUALS,
        "not_equals": ConditionOperator.NOT_EQUALS,
        ">": ConditionOperator.GREATER_THAN,
        "greater_than": ConditionOperator.GREATER_THAN,
        "<": ConditionOperator.LESS_THAN,
        "less_than": ConditionOperator.LESS_THAN,
        ">=": ConditionOperator.GREATER_OR_EQUAL,
        "greater_or_equal": ConditionOperator.GREATER_OR_EQUAL,
        "<=": ConditionOperator.LESS_OR_EQUAL,
        "less_or_equal": ConditionOperator.LESS_OR_EQUAL,
        "contains": ConditionOperator.CONTAINS,
        "not_contains": ConditionOperator.NOT_CONTAINS,
        "starts_with": ConditionOperator.STARTS_WITH,
        "ends_with": ConditionOperator.ENDS_WITH,
        "regex": ConditionOperator.REGEX_MATCH,
        "exists": ConditionOperator.EXISTS,
        "not_exists": ConditionOperator.NOT_EXISTS,
        "in": ConditionOperator.IN,
        "not_in": ConditionOperator.NOT_IN,
        "is_empty": ConditionOperator.IS_EMPTY,
        "is_not_empty": ConditionOperator.IS_NOT_EMPTY,
        "type_is": ConditionOperator.TYPE_IS,
    }
    
    @staticmethod
    def parse_simple(condition_str: str) -> Condition:
        """
        Parse simple condition string: "field operator value"
        Example: "user.age > 18"
        """
        # Try to find operator
        for op_str, op_enum in ConditionParser.OPERATOR_MAP.items():
            if op_str in condition_str:
                parts = condition_str.split(op_str, 1)
                if len(parts) == 2:
                    field = parts[0].strip()
                    value_str = parts[1].strip()
                    
                    # Try to parse value
                    value = ConditionParser._parse_value(value_str)
                    
                    return Condition(
                        field=field,
                        operator=op_enum,
                        value=value
                    )
        
        # Special case for exists/not_exists
        if condition_str.endswith("exists"):
            field = condition_str.replace("exists", "").strip()
            return Condition(field=field, operator=ConditionOperator.EXISTS)
        
        if condition_str.endswith("not_exists"):
            field = condition_str.replace("not_exists", "").strip()
            return Condition(field=field, operator=ConditionOperator.NOT_EXISTS)
        
        raise ValueError(f"Cannot parse condition: {condition_str}")
    
    @staticmethod
    def _parse_value(value_str: str) -> Any:
        """Parse value string to appropriate type"""
        value_str = value_str.strip()
        
        # Remove quotes if present
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        # Try to parse as number
        try:
            if '.' in value_str:
                return float(value_str)
            return int(value_str)
        except ValueError:
            pass
        
        # Boolean
        if value_str.lower() == 'true':
            return True
        if value_str.lower() == 'false':
            return False
        
        # Null
        if value_str.lower() in ('null', 'none'):
            return None
        
        # Array notation [1, 2, 3]
        if value_str.startswith('[') and value_str.endswith(']'):
            import json
            try:
                return json.loads(value_str)
            except:
                pass
        
        return value_str
    
    @staticmethod
    def parse_json(condition_dict: Dict[str, Any]) -> Condition:
        """Parse condition from JSON/dict format"""
        field = condition_dict.get("field", "")
        operator_str = condition_dict.get("operator", "equals")
        value = condition_dict.get("value")
        
        operator = ConditionParser.OPERATOR_MAP.get(
            operator_str, ConditionOperator.EQUALS
        )
        
        return Condition(
            field=field,
            operator=operator,
            value=value,
            case_sensitive=condition_dict.get("case_sensitive", True),
            regex_flags=condition_dict.get("regex_flags", 0)
        )

class ConditionEvaluator:
    """Evaluates conditions against data"""
    
    @staticmethod
    def get_nested_value(data: Any, path: str) -> Any:
        """
        Extract value from nested data structure using dot notation.
        Supports arrays with [index] notation.
        
        Examples:
            - "user.name" -> data["user"]["name"]
            - "users[0].name" -> data["users"][0]["name"]
            - "data.items[*].id" -> [item["id"] for item in data["items"]]
        """
        if not path:
            return data
        
        # Handle array wildcard [*]
        if '[*]' in path:
            parts = path.split('[*]', 1)
            prefix = parts[0]
            suffix = parts[1].lstrip('.')
            
            array = ConditionEvaluator.get_nested_value(data, prefix)
            if not isinstance(array, (list, tuple)):
                return None
            
            return [
                ConditionEvaluator.get_nested_value(item, suffix)
                for item in array
            ]
        
        # Regular path traversal
        keys = re.split(r'\.|\[|\]', path)
        keys = [k for k in keys if k]  # Remove empty strings
        
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, (list, tuple)):
                try:
                    index = int(key)
                    value = value[index] if index < len(value) else None
                except (ValueError, IndexError):
                    return None
            elif hasattr(value, key):
                value = getattr(value, key)
            else:
                return None
        
        return value
    
    @staticmethod
    def evaluate_condition(condition: Condition, data: Any) -> bool:
        """
        Evaluate a single condition against data.
        
        Args:
            condition: Condition to evaluate
            data: Data to evaluate against
            
        Returns:
            True if condition is met, False otherwise
        """
        try:
            # Get field value
            field_value = ConditionEvaluator.get_nested_value(data, condition.field)
            target_value = condition.value
            
            # Handle case sensitivity for strings
            if isinstance(field_value, str) and isinstance(target_value, str):
                if not condition.case_sensitive:
                    field_value = field_value.lower()
                    target_value = target_value.lower()
            
            # Evaluate based on operator
            op = condition.operator
            
            if op == ConditionOperator.EXISTS:
                return field_value is not None
            
            if op == ConditionOperator.NOT_EXISTS:
                return field_value is None
            
            if op == ConditionOperator.EQUALS:
                return field_value == target_value
            
            if op == ConditionOperator.NOT_EQUALS:
                return field_value != target_value
            
            if op == ConditionOperator.GREATER_THAN:
                return field_value > target_value
            
            if op == ConditionOperator.LESS_THAN:
                return field_value < target_value
            
            if op == ConditionOperator.GREATER_OR_EQUAL:
                return field_value >= target_value
            
            if op == ConditionOperator.LESS_OR_EQUAL:
                return field_value <= target_value
            
            if op == ConditionOperator.CONTAINS:
                return target_value in str(field_value)
            
            if op == ConditionOperator.NOT_CONTAINS:
                return target_value not in str(field_value)
            
            if op == ConditionOperator.STARTS_WITH:
                return str(field_value).startswith(str(target_value))
            
            if op == ConditionOperator.ENDS_WITH:
                return str(field_value).endswith(str(target_value))
            
            if op == ConditionOperator.REGEX_MATCH:
                pattern = re.compile(target_value, condition.regex_flags)
                return pattern.search(str(field_value)) is not None
            
            if op == ConditionOperator.IN:
                return field_value in target_value
            
            if op == ConditionOperator.NOT_IN:
                return field_value not in target_value
            
            if op == ConditionOperator.IS_EMPTY:
                return not field_value or len(field_value) == 0
            
            if op == ConditionOperator.IS_NOT_EMPTY:
                return bool(field_value) and len(field_value) > 0
            
            if op == ConditionOperator.TYPE_IS:
                return type(field_value).__name__ == target_value
            
            return False
            
        except Exception as e:
            logger.warning(
                f"Error evaluating condition {condition}: {str(e)}"
            )
            return False
    
    @staticmethod
    def evaluate_group(group: ConditionGroup, data: Any) -> bool:
        """
        Evaluate a group of conditions with logical operators.
        
        Args:
            group: ConditionGroup to evaluate
            data: Data to evaluate against
            
        Returns:
            True if group condition is met, False otherwise
        """
        results = []
        
        for condition in group.conditions:
            if isinstance(condition, Condition):
                result = ConditionEvaluator.evaluate_condition(condition, data)
            elif isinstance(condition, ConditionGroup):
                result = ConditionEvaluator.evaluate_group(condition, data)
            else:
                result = False
            
            results.append(result)
        
        # Apply logical operator
        if group.operator == LogicalOperator.AND:
            return all(results)
        elif group.operator == LogicalOperator.OR:
            return any(results)
        elif group.operator == LogicalOperator.NOT:
            return not any(results)
        
        return False

class ConditionalRouter:
    """
    Routes workflow execution based on conditions.
    Determines which nodes to execute next based on connection conditions.
    """
    
    def __init__(self, enable_caching: bool = True):
        self.enable_caching = enable_caching
        self._condition_cache: Dict[str, Union[Condition, ConditionGroup]] = {}
    
    def parse_condition(
        self,
        condition_spec: Union[str, Dict, Condition, ConditionGroup, None]
    ) -> Optional[Union[Condition, ConditionGroup]]:
        """
        Parse condition from various formats.
        
        Args:
            condition_spec: Condition specification in various formats
            
        Returns:
            Parsed Condition or ConditionGroup, or None if no condition
        """
        if condition_spec is None:
            return None
        
        if isinstance(condition_spec, (Condition, ConditionGroup)):
            return condition_spec
        
        # Check cache
        cache_key = str(condition_spec)
        if self.enable_caching and cache_key in self._condition_cache:
            return self._condition_cache[cache_key]
        
        # Parse based on type
        if isinstance(condition_spec, str):
            parsed = ConditionParser.parse_simple(condition_spec)
        elif isinstance(condition_spec, dict):
            parsed = ConditionParser.parse_json(condition_spec)
        else:
            return None
        
        # Cache result
        if self.enable_caching:
            self._condition_cache[cache_key] = parsed
        
        return parsed
    
    def evaluate_route(
        self,
        condition_spec: Union[str, Dict, Condition, ConditionGroup, None],
        data: Any,
        default: bool = True
    ) -> bool:
        """
        Evaluate if a route should be taken.
        
        Args:
            condition_spec: Condition specification
            data: Data to evaluate against
            default: Default value if no condition or evaluation fails
            
        Returns:
            True if route should be taken, False otherwise
        """
        try:
            condition = self.parse_condition(condition_spec)
            
            if condition is None:
                return default
            
            if isinstance(condition, Condition):
                return ConditionEvaluator.evaluate_condition(condition, data)
            elif isinstance(condition, ConditionGroup):
                return ConditionEvaluator.evaluate_group(condition, data)
            
            return default
            
        except Exception as e:
            logger.error(f"Error evaluating route condition: {str(e)}")
            return default
    
    def route_connections(
        self,
        connections: List[Dict[str, Any]],
        current_node_id: str,
        data: Any,
        variables: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        Determine which target nodes to execute based on conditions.
        
        Args:
            connections: List of connection definitions
            current_node_id: Current node ID
            data: Current data for evaluation
            variables: Additional variables for interpolation
            
        Returns:
            List of target node IDs to execute
        """
        targets = []
        
        # Prepare evaluation context
        eval_context = {
            "data": data,
            "variables": variables or {}
        }
        
        for conn in connections:
            if conn.get("sourceNodeId") != current_node_id:
                continue
            
            condition = conn.get("condition")
            
            # Interpolate variables in condition if it's a string
            if isinstance(condition, str) and variables:
                for var_name, var_value in variables.items():
                    condition = condition.replace(f"{{{{{var_name}}}}}", str(var_value))
            
            # Evaluate condition
            should_route = self.evaluate_route(condition, data, default=True)
            
            if should_route:
                target_id = conn.get("targetNodeId")
                if target_id:
                    targets.append(target_id)
                    logger.debug(
                        f"Route from {current_node_id} to {target_id} "
                        f"(condition: {condition})"
                    )
        
        return targets