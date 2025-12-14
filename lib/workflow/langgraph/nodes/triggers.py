"""
Trigger Node Executors
"""
import asyncio
from typing import Any, Dict, List
from datetime import datetime
import logging

try:
    from croniter import croniter
    CRONITER_AVAILABLE = True
except ImportError:
    CRONITER_AVAILABLE = False
    logging.warning("croniter not available. Schedule node will have limited functionality.")

from ..nodes.base import BaseNodeExecutor

logger = logging.getLogger(__name__)


class ScheduleTriggerExecutor(BaseNodeExecutor):
    """
    Schedule Trigger Node - Executes based on cron expression
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["cron"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        cron = self.config.config.get("cron", "")
        
        if not CRONITER_AVAILABLE:
            errors.append("croniter library not installed. Install it with: pip install croniter")
            return errors
        
        if cron:
            try:
                # Validate cron expression
                croniter(cron)
            except Exception as e:
                errors.append(f"Invalid cron expression: {str(e)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Schedule trigger execution.
        This registers the workflow with the scheduler service.
        """
        cron = self.config.config.get("cron")
        timezone = self.config.config.get("timezone", "UTC")
        
        # Calculate next execution time
        if not CRONITER_AVAILABLE:
            raise ValueError("croniter library not installed. Install it with: pip install croniter")
        
        try:
            cron_obj = croniter(cron, datetime.now())
            next_run = cron_obj.get_next(datetime)
        except Exception as e:
            raise ValueError(f"Failed to calculate next run time: {str(e)}")
        
        # Get workflow data from context
        workflow_data = self.context.global_config.get("workflow_data")
        workflow_id = self.context.global_config.get("workflow_id", "unknown")
        
        # Register with scheduler if workflow data is available
        scheduler_job_id = None
        if workflow_data:
            from ..scheduler import get_scheduler
            scheduler = get_scheduler()
            
            # Create executor function that will be called by scheduler
            async def execute_scheduled_workflow(wf_data: Dict[str, Any], wf_input: Any):
                from ..orchestrator import WorkflowOrchestrator
                orchestrator = WorkflowOrchestrator(
                    api_keys=self.context.api_keys,
                    enable_checkpointing=True,
                    enable_circuit_breakers=True
                )
                return await orchestrator.execute_workflow(wf_data, wf_input)
            
            scheduler_job_id = scheduler.register_job(
                workflow_id=workflow_id,
                workflow_data=workflow_data,
                cron=cron,
                timezone=timezone,
                executor_func=execute_scheduled_workflow
            )
            
            # Store job_id in context for later reference
            self.context.global_config["scheduler_job_id"] = scheduler_job_id
        
        return {
            "triggered": True,
            "trigger_type": "schedule",
            "cron": cron,
            "timezone": timezone,
            "next_run": next_run.isoformat(),
            "triggered_at": datetime.utcnow().isoformat(),
            "scheduler_job_id": scheduler_job_id,
            "input": input_data
        }


class WebhookTriggerExecutor(BaseNodeExecutor):
    """
    Webhook Trigger Node - Receives webhook data
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []  # Webhook doesn't need config for execution
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Webhook trigger execution.
        The input_data should contain the webhook payload.
        """
        # Extract webhook data from input
        webhook_data = input_data if isinstance(input_data, dict) else {"payload": input_data}
        
        return {
            "triggered": True,
            "trigger_type": "webhook",
            "webhook_data": webhook_data,
            "triggered_at": datetime.utcnow().isoformat(),
            "headers": webhook_data.get("headers", {}),
            "body": webhook_data.get("body", webhook_data.get("payload", {}))
        }


class ManualTriggerExecutor(BaseNodeExecutor):
    """
    Manual Trigger Node - Triggered by user action
    """
    
    def get_required_config_fields(self) -> List[str]:
        return []
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Manual trigger execution.
        """
        return {
            "triggered": True,
            "trigger_type": "manual",
            "triggered_at": datetime.utcnow().isoformat(),
            "input": input_data,
            "triggered_by": self.context.global_config.get("user_id", "unknown")
        }

