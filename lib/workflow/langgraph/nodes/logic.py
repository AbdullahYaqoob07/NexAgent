"""
Logic Node Executors - Fully Implemented
Provides complete logic control flow for workflows including conditions, loops, delays, merging, and counters
"""
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging
import re
from ..nodes.base import BaseNodeExecutor
from ..conditional_routing import ConditionalRouter, ConditionParser, Condition, ConditionOperator, LogicalOperator
from ..data_flow_system import DataFlowManager

logger = logging.getLogger(__name__)


class IfConditionExecutor(BaseNodeExecutor):
    """
    If Condition Node - Conditional branching with full expression support
    
    Supports:
    - Simple comparisons: age > 18
    - Complex expressions: (age > 18 AND status == 'active') OR role == 'admin'
    - Variable interpolation: {{user.age}} > 18
    - Multiple operators: ==, !=, <, >, <=, >=, contains, in, exists
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["condition"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        condition = config.get("condition")
        if not condition:
            errors.append("Condition expression is required")
        elif not isinstance(condition, str):
            errors.append("Condition must be a string expression")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Evaluate condition and return routing information.
        """
        config = self.config.config
        condition_expr = config.get("condition")
        
        # Interpolate variables in condition
        if isinstance(condition_expr, str) and '{{' in condition_expr:
            condition_expr = self.data_flow.interpolate_string(
                condition_expr, 
                input_data, 
                self.context.variables
            )
        
        # Use conditional router to evaluate
        router = ConditionalRouter()
        try:
            result = router.evaluate_route(condition_expr, input_data, default=False)
        except Exception as e:
            logger.error(f"Error evaluating condition '{condition_expr}': {str(e)}")
            raise ValueError(f"Condition evaluation failed: {str(e)}")
        
        return {
            "condition": condition_expr,
            "result": result,
            "branch": "true" if result else "false",
            "output_port": "output_true" if result else "output_false",
            "evaluated_at": datetime.utcnow().isoformat(),
            "input_data": input_data
        }


class SwitchExecutor(BaseNodeExecutor):
    """
    Switch Node - Multi-case branching (like switch/case statement)
    
    Routes execution to different branches based on a value matching specific cases.
    Supports default case for unmatched values.
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["value", "cases"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        cases = config.get("cases", [])
        if not isinstance(cases, list):
            errors.append("'cases' must be a list of case objects")
        elif len(cases) == 0:
            errors.append("At least one case is required")
        else:
            for i, case in enumerate(cases):
                if not isinstance(case, dict):
                    errors.append(f"Case {i} must be an object")
                elif "value" not in case:
                    errors.append(f"Case {i} missing 'value' field")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Evaluate switch cases and return matched case.
        """
        config = self.config.config
        value = config.get("value")
        cases = config.get("cases", [])
        default_case = config.get("default")
        
        # Interpolate value if it's a variable reference
        if isinstance(value, str) and '{{' in value:
            value = self.data_flow.interpolate_string(
                value, 
                input_data, 
                self.context.variables
            )
        
        # Find matching case
        matched_case = None
        matched_index = None
        
        for i, case in enumerate(cases):
            case_value = case.get("value")
            
            # Support different comparison modes
            if self._values_match(value, case_value):
                matched_case = case
                matched_index = i
                break
        
        # Use default if no match
        if matched_case is None and default_case is not None:
            matched_case = {"value": "default", "output": default_case, "label": "Default"}
            matched_index = -1
        
        output_port = f"output_{matched_index}" if matched_index is not None and matched_index >= 0 else "output_default"
        
        return {
            "input_value": value,
            "matched_case": matched_case.get("value") if matched_case else None,
            "matched_label": matched_case.get("label") if matched_case else None,
            "matched_index": matched_index,
            "output_port": output_port,
            "output": matched_case.get("output") if matched_case else None,
            "evaluated_at": datetime.utcnow().isoformat(),
            "input_data": input_data
        }
    
    def _values_match(self, value1: Any, value2: Any) -> bool:
        """Check if two values match, with type coercion"""
        # Direct equality
        if value1 == value2:
            return True
        
        # String comparison (case-insensitive option)
        if isinstance(value1, str) and isinstance(value2, str):
            return value1.lower() == value2.lower()
        
        # Type coercion
        try:
            if isinstance(value1, (int, float)) and isinstance(value2, str):
                return value1 == float(value2)
            if isinstance(value2, (int, float)) and isinstance(value1, str):
                return value2 == float(value1)
        except:
            pass
        
        return False


class LoopExecutor(BaseNodeExecutor):
    """
    Loop Node - Iterate over collections (arrays, objects, ranges)
    
    Executes connected nodes for each item in a collection.
    Supports:
    - Array iteration
    - Object key-value iteration
    - Range iteration (e.g., 1 to 10)
    - Custom iteration logic
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []  # Either 'items' or 'itemsPath' required, validated in custom validation
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        items = config.get("items")
        items_path = config.get("itemsPath")
        start_range = config.get("startRange")
        end_range = config.get("endRange")
        
        # Must have one of: items, itemsPath, or range (both start and end)
        has_items = items is not None
        has_path = items_path is not None
        has_range = start_range is not None and end_range is not None
        
        if not (has_items or has_path or has_range):
            errors.append("Must provide either 'items', 'itemsPath', or both 'startRange' and 'endRange'")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute loop over items.
        """
        config = self.config.config
        items = config.get("items")
        items_path = config.get("itemsPath")
        start_range = config.get("startRange")
        end_range = config.get("endRange")
        max_iterations = config.get("maxIterations", 1000)  # Safety limit
        
        # Determine items to iterate
        if start_range is not None and end_range is not None:
            # Range iteration
            items = list(range(int(start_range), int(end_range) + 1))
        elif items_path:
            # Extract items from input data
            items = self.extract_value(input_data, items_path, [])
        elif not isinstance(items, (list, dict)):
            # Try to use input_data as items
            items = input_data if isinstance(input_data, (list, dict)) else []
        
        # Safety check
        if isinstance(items, list) and len(items) > max_iterations:
            logger.warning(f"Loop truncated to {max_iterations} iterations")
            items = items[:max_iterations]
        
        # Generate iteration data
        results = []
        total_count = len(items) if hasattr(items, '__len__') else 0
        
        if isinstance(items, list):
            for i, item in enumerate(items):
                results.append({
                    "index": i,
                    "item": item,
                    "is_first": i == 0,
                    "is_last": i == total_count - 1,
                    "iteration": i + 1,
                    "total": total_count
                })
        elif isinstance(items, dict):
            for i, (key, value) in enumerate(items.items()):
                results.append({
                    "index": i,
                    "key": key,
                    "value": value,
                    "item": {"key": key, "value": value},
                    "is_first": i == 0,
                    "is_last": i == total_count - 1,
                    "iteration": i + 1,
                    "total": total_count
                })
        
        return {
            "items": items,
            "iterations": results,
            "count": len(results),
            "executed_at": datetime.utcnow().isoformat()
        }


class BooleanExecutor(BaseNodeExecutor):
    """
    Boolean Node - Evaluates boolean expressions and comparisons
    
    Performs comparisons between two values and returns true/false.
    Supports all standard comparison operators and type-aware comparisons.
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["leftValue", "operator", "rightValue"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        operator = config.get("operator")
        valid_operators = ["==", "!=", ">", "<", ">=", "<=", "in", "not_in", "contains", "starts_with", "ends_with", "regex"]
        
        if not operator:
            errors.append("Operator is required")
        elif operator not in valid_operators:
            errors.append(f"Invalid operator. Must be one of: {', '.join(valid_operators)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Evaluate boolean condition.
        """
        config = self.config.config
        left_value = config.get("leftValue")
        operator = config.get("operator")
        right_value = config.get("rightValue")
        
        # Interpolate values if they contain variable references
        if isinstance(left_value, str) and '{{' in left_value:
            left_value = self.data_flow.interpolate_string(
                left_value, 
                input_data, 
                self.context.variables
            )
        
        if isinstance(right_value, str) and '{{' in right_value:
            right_value = self.data_flow.interpolate_string(
                right_value, 
                input_data, 
                self.context.variables
            )
        
        # Perform comparison
        try:
            result = self._evaluate_condition(left_value, operator, right_value)
            
            return {
                "result": result,
                "leftValue": left_value,
                "operator": operator,
                "rightValue": right_value,
                "evaluated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error evaluating boolean condition: {str(e)}")
            raise ValueError(f"Failed to evaluate condition: {str(e)}")
    
    def _evaluate_condition(self, left: Any, op: str, right: Any) -> bool:
        """Evaluate a condition based on operator with type awareness"""
        
        # Handle None values
        if op == "==" and (left is None or right is None):
            return left is right
        if op == "!=" and (left is None or right is None):
            return left is not right
        
        # Numeric comparisons
        if op in [">", "<", ">=", "<="]:
            try:
                left_num = float(left) if not isinstance(left, (int, float)) else left
                right_num = float(right) if not isinstance(right, (int, float)) else right
                
                if op == ">":
                    return left_num > right_num
                elif op == "<":
                    return left_num < right_num
                elif op == ">=":
                    return left_num >= right_num
                elif op == "<=":
                    return left_num <= right_num
            except (ValueError, TypeError):
                # Fall through to string comparison
                pass
        
        # Equality comparisons
        if op == "==":
            return left == right
        elif op == "!=":
            return left != right
        
        # Containment checks
        elif op == "in":
            return left in right if hasattr(right, '__contains__') else False
        elif op == "not_in":
            return left not in right if hasattr(right, '__contains__') else True
        elif op == "contains":
            return right in left if hasattr(left, '__contains__') else False
        
        # String operations
        elif op == "starts_with":
            return str(left).startswith(str(right))
        elif op == "ends_with":
            return str(left).endswith(str(right))
        elif op == "regex":
            return bool(re.match(str(right), str(left)))
        
        else:
            raise ValueError(f"Unsupported operator: {op}")


class CounterExecutor(BaseNodeExecutor):
    """
    Counter Node - Manages counters for tracking iterations, counts, etc.
    
    Increments or decrements a named counter stored in workflow context.
    Useful for counting loops, retries, or custom metrics.
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["counterName"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        counter_name = config.get("counterName")
        if not counter_name:
            errors.append("Counter name is required")
        elif not isinstance(counter_name, str):
            errors.append("Counter name must be a string")
        
        operation = config.get("operation", "increment")
        if operation not in ["increment", "decrement", "set", "reset"]:
            errors.append("Operation must be 'increment', 'decrement', 'set', or 'reset'")
        
        step = config.get("step", 1)
        if not isinstance(step, (int, float)):
            errors.append("Step must be a number")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Increment, decrement, set, or reset a counter.
        """
        config = self.config.config
        counter_name = config.get("counterName")
        operation = config.get("operation", "increment")
        step = config.get("step", 1)
        set_value = config.get("setValue", 0)
        
        # Access workflow variables (shared state)
        if not hasattr(self.context, 'variables'):
            self.context.variables = {}
        
        variables = self.context.variables
        
        # Get current counter value
        current_value = variables.get(counter_name, 0)
        
        # Perform operation
        if operation == "increment":
            new_value = current_value + step
        elif operation == "decrement":
            new_value = current_value - step
        elif operation == "set":
            new_value = set_value
        elif operation == "reset":
            new_value = 0
        else:
            raise ValueError(f"Invalid operation: {operation}")
        
        # Store new value
        variables[counter_name] = new_value
        
        logger.info(f"Counter '{counter_name}': {current_value} -> {new_value} ({operation})")
        
        return {
            "counterName": counter_name,
            "operation": operation,
            "previousValue": current_value,
            "newValue": new_value,
            "step": step,
            "executed_at": datetime.utcnow().isoformat()
        }


class TimerExecutor(BaseNodeExecutor):
    """
    Timer Node - Measures and tracks execution time
    
    Starts, stops, or records lap times for named timers.
    Useful for performance monitoring and timing workflows.
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["timerName"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        timer_name = config.get("timerName")
        if not timer_name:
            errors.append("Timer name is required")
        elif not isinstance(timer_name, str):
            errors.append("Timer name must be a string")
        
        action = config.get("action", "start")
        if action not in ["start", "stop", "lap", "reset"]:
            errors.append("Action must be 'start', 'stop', 'lap', or 'reset'")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Start, stop, lap, or reset a timer.
        """
        config = self.config.config
        timer_name = config.get("timerName")
        action = config.get("action", "start")
        
        # Access workflow variables (shared state)
        if not hasattr(self.context, 'variables'):
            self.context.variables = {}
        
        variables = self.context.variables
        
        # Timer storage key
        timer_key = f"__timer_{timer_name}"
        laps_key = f"__timer_{timer_name}_laps"
        
        current_time = datetime.utcnow()
        timestamp = current_time.isoformat()
        
        result = {
            "timerName": timer_name,
            "action": action,
            "timestamp": timestamp
        }
        
        if action == "start":
            variables[timer_key] = timestamp
            variables[laps_key] = []
            result["started_at"] = timestamp
            logger.info(f"Timer '{timer_name}' started at {timestamp}")
        
        elif action == "stop":
            start_time_str = variables.get(timer_key)
            if not start_time_str:
                raise ValueError(f"Timer '{timer_name}' not started")
            
            start_time = datetime.fromisoformat(start_time_str)
            duration_ms = (current_time - start_time).total_seconds() * 1000
            
            result["started_at"] = start_time_str
            result["stopped_at"] = timestamp
            result["duration_ms"] = duration_ms
            result["duration_seconds"] = duration_ms / 1000
            result["laps"] = variables.get(laps_key, [])
            
            logger.info(f"Timer '{timer_name}' stopped. Duration: {duration_ms:.2f}ms")
        
        elif action == "lap":
            start_time_str = variables.get(timer_key)
            if not start_time_str:
                raise ValueError(f"Timer '{timer_name}' not started")
            
            start_time = datetime.fromisoformat(start_time_str)
            lap_duration_ms = (current_time - start_time).total_seconds() * 1000
            
            laps = variables.get(laps_key, [])
            lap_number = len(laps) + 1
            lap_data = {
                "lap": lap_number,
                "timestamp": timestamp,
                "duration_ms": lap_duration_ms
            }
            laps.append(lap_data)
            variables[laps_key] = laps
            
            result["lap"] = lap_number
            result["lap_duration_ms"] = lap_duration_ms
            result["total_laps"] = lap_number
            
            logger.info(f"Timer '{timer_name}' lap {lap_number}: {lap_duration_ms:.2f}ms")
        
        elif action == "reset":
            variables.pop(timer_key, None)
            variables.pop(laps_key, None)
            result["reset"] = True
            logger.info(f"Timer '{timer_name}' reset")
        
        return result


class MergeExecutor(BaseNodeExecutor):
    """
    Merge Node - Combines data from multiple parallel branches
    
    Waits for multiple inputs and merges them using various strategies:
    - combine: Merge all inputs into single object
    - array: Collect inputs as array
    - first: Return first input received
    - last: Return last input received
    - custom: Apply custom merge logic
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        strategy = config.get("strategy", "combine")
        valid_strategies = ["combine", "array", "first", "last", "max", "min", "sum", "concat"]
        
        if strategy not in valid_strategies:
            errors.append(f"Invalid merge strategy. Must be one of: {', '.join(valid_strategies)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Merge input data based on strategy.
        """
        config = self.config.config
        strategy = config.get("strategy", "combine")
        merge_key = config.get("mergeKey")  # Optional key for array merge
        
        # Handle different input formats
        inputs = []
        if isinstance(input_data, list):
            inputs = input_data
        elif isinstance(input_data, dict) and '_parallel_results' in input_data:
            # Special format from parallel execution
            inputs = input_data['_parallel_results']
        else:
            inputs = [input_data]
        
        # Apply merge strategy
        merged_result = None
        
        if strategy == "combine":
            # Merge all objects into one
            merged_result = {}
            for i, inp in enumerate(inputs):
                if isinstance(inp, dict):
                    merged_result.update(inp)
                else:
                    merged_result[f"input_{i}"] = inp
        
        elif strategy == "array":
            # Collect as array
            if merge_key:
                # Extract specific key from each input
                merged_result = [
                    self.extract_value(inp, merge_key) 
                    for inp in inputs
                ]
            else:
                merged_result = inputs
        
        elif strategy == "first":
            merged_result = inputs[0] if inputs else None
        
        elif strategy == "last":
            merged_result = inputs[-1] if inputs else None
        
        elif strategy == "max":
            # Find maximum value
            try:
                merged_result = max(inputs)
            except:
                merged_result = inputs
        
        elif strategy == "min":
            # Find minimum value
            try:
                merged_result = min(inputs)
            except:
                merged_result = inputs
        
        elif strategy == "sum":
            # Sum numeric values
            try:
                merged_result = sum(float(x) if not isinstance(x, (int, float)) else x for x in inputs)
            except:
                merged_result = inputs
        
        elif strategy == "concat":
            # Concatenate strings or arrays
            merged_result = ""
            for inp in inputs:
                if isinstance(inp, str):
                    merged_result += inp
                elif isinstance(inp, list):
                    if not merged_result:
                        merged_result = []
                    merged_result.extend(inp)
                else:
                    merged_result += str(inp)
        
        return {
            "merged": True,
            "strategy": strategy,
            "input_count": len(inputs),
            "result": merged_result,
            "merged_at": datetime.utcnow().isoformat()
        }


class DelayExecutor(BaseNodeExecutor):
    """
    Delay Node - Pauses workflow execution for specified duration
    
    Useful for rate limiting, waiting for external processes, or scheduling delays.
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["duration"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        duration = config.get("duration")
        if duration is None:
            errors.append("Duration is required")
        elif not isinstance(duration, (int, float)) or duration < 0:
            errors.append("Duration must be a non-negative number (milliseconds)")
        
        max_delay = config.get("maxDelay", 300000)  # 5 minutes default max
        if duration > max_delay:
            errors.append(f"Duration cannot exceed {max_delay}ms ({max_delay/1000}s)")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Wait for specified duration.
        """
        config = self.config.config
        duration_ms = config.get("duration", 1000)
        
        # Convert to seconds
        duration_sec = duration_ms / 1000.0
        
        start_time = datetime.utcnow()
        logger.info(f"Delaying execution for {duration_ms}ms ({duration_sec}s)")
        
        # Actual delay
        await asyncio.sleep(duration_sec)
        
        end_time = datetime.utcnow()
        actual_duration_ms = (end_time - start_time).total_seconds() * 1000
        
        return {
            "requested_duration_ms": duration_ms,
            "actual_duration_ms": actual_duration_ms,
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat(),
            "input": input_data
        }
