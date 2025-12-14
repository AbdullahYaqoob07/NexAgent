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

