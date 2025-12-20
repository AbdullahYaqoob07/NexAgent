"""
Logic Node Executors
"""
import asyncio
from typing import Any, Dict, List
from datetime import datetime
import logging
from ..nodes.base import BaseNodeExecutor
from ..conditional_routing import ConditionalRouter, ConditionParser

logger = logging.getLogger(__name__)


class IfConditionExecutor(BaseNodeExecutor):
    """
    If Condition Node - Conditional branching
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["condition"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        condition = config.get("condition")
        if not condition:
            errors.append("Condition expression is required")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Evaluate condition and return result.
        """
        config = self.config.config
        condition = config.get("condition")
        
        # Use conditional router to evaluate
        router = ConditionalRouter()
        result = router.evaluate_route(condition, input_data, default=False)
        
        return {
            "condition": condition,
            "result": result,
            "branch": "true" if result else "false",
            "evaluated_at": datetime.utcnow().isoformat()
        }


class SwitchExecutor(BaseNodeExecutor):
    """
    Switch Node - Multi-case branching
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["value", "cases"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        cases = config.get("cases", [])
        if not isinstance(cases, list):
            errors.append("'cases' must be a list")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Evaluate switch cases.
        """
        config = self.config.config
        value = config.get("value")
        cases = config.get("cases", [])
        default_case = config.get("default")
        
        # Find matching case
        matched_case = None
        for case in cases:
            case_value = case.get("value")
            if case_value == value:
                matched_case = case
                break
        
        if not matched_case and default_case:
            matched_case = {"value": "default", "output": default_case}
        
        return {
            "input_value": value,
            "matched_case": matched_case.get("value") if matched_case else None,
            "output": matched_case.get("output") if matched_case else None,
            "evaluated_at": datetime.utcnow().isoformat()
        }


class LoopExecutor(BaseNodeExecutor):
    """
    Loop Node - Iterate over items
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["items"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Execute loop over items.
        """
        config = self.config.config
        items = config.get("items", [])
        
        if not isinstance(items, (list, dict)):
            # Try to extract items from input_data
            items_path = config.get("itemsPath", "")
            if items_path:
                items = self.extract_value(input_data, items_path, [])
            else:
                items = input_data if isinstance(input_data, (list, dict)) else []
        
        results = []
        if isinstance(items, list):
            for i, item in enumerate(items):
                results.append({
                    "index": i,
                    "item": item,
                    "is_first": i == 0,
                    "is_last": i == len(items) - 1
                })
        elif isinstance(items, dict):
            for i, (key, value) in enumerate(items.items()):
                results.append({
                    "index": i,
                    "key": key,
                    "item": value,
                    "is_first": i == 0,
                    "is_last": i == len(items) - 1
                })
        
        return {
            "items": items,
            "results": results,
            "count": len(results),
            "executed_at": datetime.utcnow().isoformat()
        }


class BooleanExecutor(BaseNodeExecutor):
    """
    Boolean Node - Evaluates conditions and returns true/false values
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["left_value", "operator", "right_value"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        operator = config.get("operator")
        valid_operators = ["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]
        
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
        left_value = config.get("left_value")
        operator = config.get("operator")
        right_value = config.get("right_value")
        
        # Perform comparison
        try:
            result = self._evaluate_condition(left_value, operator, right_value)
            
            return {
                "result": result,
                "left_value": left_value,
                "operator": operator,
                "right_value": right_value,
                "evaluated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error evaluating boolean condition: {str(e)}")
            raise ValueError(f"Failed to evaluate condition: {str(e)}")
    
    def _evaluate_condition(self, left, op, right) -> bool:
        """
        Evaluate a condition based on operator.
        """
        if op == "==":
            return left == right
        elif op == "!=":
            return left != right
        elif op == ">":
            return left > right
        elif op == "<":
            return left < right
        elif op == ">=":
            return left >= right
        elif op == "<=":
            return left <= right
        elif op == "in":
            return left in right
        elif op == "not_in":
            return left not in right
        else:
            raise ValueError(f"Unsupported operator: {op}")


class CounterExecutor(BaseNodeExecutor):
    """
    Counter Node - Increments or decrements a numerical counter
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["counter_name"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        counter_name = config.get("counter_name")
        if not counter_name:
            errors.append("Counter name is required")
        elif not isinstance(counter_name, str):
            errors.append("Counter name must be a string")
        
        operation = config.get("operation", "increment")
        if operation not in ["increment", "decrement"]:
            errors.append("Operation must be either 'increment' or 'decrement'")
        
        step = config.get("step", 1)
        if not isinstance(step, (int, float)):
            errors.append("Step must be a number")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Increment or decrement a counter.
        """
        config = self.config.config
        counter_name = config.get("counter_name")
        operation = config.get("operation", "increment")
        step = config.get("step", 1)
        
        # In a real implementation, this would access shared state
        # For now, we'll simulate by returning the operation details
        logger.info(f"{operation.capitalize()} counter '{counter_name}' by {step}")
        
        return {
            "counter_name": counter_name,
            "operation": operation,
            "step": step,
            "input": input_data,
            "executed_at": datetime.utcnow().isoformat()
        }


class TimerExecutor(BaseNodeExecutor):
    """
    Timer Node - Measures execution time between nodes or workflow segments
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["timer_name"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        timer_name = config.get("timer_name")
        if not timer_name:
            errors.append("Timer name is required")
        elif not isinstance(timer_name, str):
            errors.append("Timer name must be a string")
        
        action = config.get("action", "start")
        if action not in ["start", "stop", "lap"]:
            errors.append("Action must be either 'start', 'stop', or 'lap'")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Start, stop, or lap a timer.
        """
        config = self.config.config
        timer_name = config.get("timer_name")
        action = config.get("action", "start")
        
        # In a real implementation, this would access shared timer state
        # For now, we'll simulate by returning the operation details
        timestamp = datetime.utcnow().isoformat()
        logger.info(f"{action.capitalize()} timer '{timer_name}' at {timestamp}")
        
        return {
            "timer_name": timer_name,
            "action": action,
            "timestamp": timestamp,
            "input": input_data,
            "executed_at": timestamp
        }


class MergeExecutor(BaseNodeExecutor):
    """
    Merge Node - Combines data from multiple branches
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Merge input data.
        """
        config = self.config.config
        strategy = config.get("strategy", "combine")  # combine, array, first, last
        
        # In a real workflow, this would merge data from parallel branches
        # For now, we just return the input data
        return {
            "merged": True,
            "strategy": strategy,
            "data": input_data,
            "merged_at": datetime.utcnow().isoformat()
        }


class DelayExecutor(BaseNodeExecutor):
    """
    Delay Node - Waits for specified duration
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
        await asyncio.sleep(duration_sec)
        end_time = datetime.utcnow()
        
        actual_duration = (end_time - start_time).total_seconds() * 1000
        
        return {
            "requested_duration_ms": duration_ms,
            "actual_duration_ms": actual_duration,
            "started_at": start_time.isoformat(),
            "completed_at": end_time.isoformat(),
            "input": input_data
        }

