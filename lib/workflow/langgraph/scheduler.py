"""
Workflow Scheduler Service
Manages scheduled workflow executions using cron expressions
"""
import asyncio
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import uuid

try:
    from croniter import croniter
    CRONITER_AVAILABLE = True
except ImportError:
    CRONITER_AVAILABLE = False
    logging.warning("croniter not available. Scheduler will have limited functionality.")

logger = logging.getLogger(__name__)


class SchedulerStatus(str, Enum):
    """Scheduler status"""
    RUNNING = "running"
    STOPPED = "stopped"
    PAUSED = "paused"


@dataclass
class ScheduledJob:
    """Represents a scheduled workflow job"""
    job_id: str
    workflow_id: str
    workflow_data: Dict[str, Any]
    cron: str
    timezone: str
    status: SchedulerStatus
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    run_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    executor_func: Optional[Callable] = None


class WorkflowScheduler:
    """
    Manages scheduled workflow executions.
    Uses cron expressions to schedule recurring workflow runs.
    """
    
    def __init__(self):
        self.jobs: Dict[str, ScheduledJob] = {}
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._shutdown = False
    
    async def start_scheduler(self, job_id: str):
        """Start the scheduler task for a specific job"""
        async with self._lock:
            if job_id in self.running_tasks:
                logger.warning(f"Job {job_id} is already running")
                return
            
            job = self.jobs.get(job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            if job.status == SchedulerStatus.RUNNING:
                logger.warning(f"Job {job_id} is already running")
                return
            
            job.status = SchedulerStatus.RUNNING
            task = asyncio.create_task(self._scheduler_loop(job_id))
            self.running_tasks[job_id] = task
            logger.info(f"Started scheduler for job {job_id} with cron: {job.cron}")
    
    async def stop_scheduler(self, job_id: str):
        """Stop the scheduler task for a specific job"""
        async with self._lock:
            job = self.jobs.get(job_id)
            if job:
                job.status = SchedulerStatus.STOPPED
            
            task = self.running_tasks.pop(job_id, None)
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                logger.info(f"Stopped scheduler for job {job_id}")
    
    async def _scheduler_loop(self, job_id: str):
        """Main scheduler loop for a job"""
        job = self.jobs.get(job_id)
        if not job:
            return
        
        try:
            while not self._shutdown and job.status == SchedulerStatus.RUNNING:
                # Calculate next run time
                if job.next_run is None:
                    cron_obj = croniter(job.cron, datetime.utcnow())
                    job.next_run = cron_obj.get_next(datetime)
                    logger.info(f"Job {job_id} next run scheduled for: {job.next_run}")
                
                # Wait until next run time
                now = datetime.utcnow()
                if job.next_run > now:
                    wait_seconds = (job.next_run - now).total_seconds()
                    logger.debug(f"Job {job_id} waiting {wait_seconds:.1f} seconds until next run")
                    await asyncio.sleep(wait_seconds)
                
                # Check if still running
                if job.status != SchedulerStatus.RUNNING:
                    break
                
                # Execute the workflow
                try:
                    logger.info(f"Executing scheduled workflow for job {job_id}")
                    job.last_run = datetime.utcnow()
                    job.run_count += 1
                    
                    if job.executor_func:
                        await job.executor_func(job.workflow_data, {})
                    else:
                        logger.warning(f"No executor function set for job {job_id}")
                    
                    # Calculate next run time
                    if CRONITER_AVAILABLE:
                        cron_obj = croniter(job.cron, job.last_run)
                        job.next_run = cron_obj.get_next(datetime)
                        logger.info(f"Job {job_id} completed. Next run: {job.next_run}")
                    else:
                        logger.error("croniter not available, cannot calculate next run")
                        break
                    
                except Exception as e:
                    logger.error(f"Error executing scheduled workflow {job_id}: {str(e)}")
                    # Continue scheduling even if execution fails
                    if CRONITER_AVAILABLE:
                        cron_obj = croniter(job.cron, datetime.utcnow())
                        job.next_run = cron_obj.get_next(datetime)
                    else:
                        logger.error("croniter not available, cannot reschedule")
                        break
                
        except asyncio.CancelledError:
            logger.info(f"Scheduler loop for job {job_id} cancelled")
        except Exception as e:
            logger.error(f"Scheduler loop error for job {job_id}: {str(e)}")
        finally:
            async with self._lock:
                self.running_tasks.pop(job_id, None)
                if job:
                    job.status = SchedulerStatus.STOPPED
    
    def register_job(
        self,
        workflow_id: str,
        workflow_data: Dict[str, Any],
        cron: str,
        timezone: str = "UTC",
        executor_func: Optional[Callable] = None
    ) -> str:
        """
        Register a new scheduled job.
        
        Args:
            workflow_id: Workflow identifier
            workflow_data: Complete workflow definition
            cron: Cron expression
            timezone: Timezone (default: UTC)
            executor_func: Function to execute the workflow
            
        Returns:
            Job ID
        """
        # Validate cron expression
        if not CRONITER_AVAILABLE:
            raise ValueError("croniter library not installed. Install it with: pip install croniter")
        
        try:
            croniter(cron)
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {str(e)}")
        
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        
        # Calculate initial next run time
        if not CRONITER_AVAILABLE:
            raise ValueError("croniter library not installed. Install it with: pip install croniter")
        
        cron_obj = croniter(cron, datetime.utcnow())
        next_run = cron_obj.get_next(datetime)
        
        job = ScheduledJob(
            job_id=job_id,
            workflow_id=workflow_id,
            workflow_data=workflow_data,
            cron=cron,
            timezone=timezone,
            status=SchedulerStatus.STOPPED,
            next_run=next_run,
            executor_func=executor_func
        )
        
        self.jobs[job_id] = job
        logger.info(f"Registered scheduled job {job_id} for workflow {workflow_id} with cron: {cron}")
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[ScheduledJob]:
        """Get job by ID"""
        return self.jobs.get(job_id)
    
    def get_job_by_workflow_id(self, workflow_id: str) -> Optional[ScheduledJob]:
        """Get job by workflow ID"""
        for job in self.jobs.values():
            if job.workflow_id == workflow_id:
                return job
        return None
    
    def remove_job(self, job_id: str):
        """Remove a job"""
        async def _remove():
            await self.stop_scheduler(job_id)
            self.jobs.pop(job_id, None)
        
        # Run in background if we're in async context
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_remove())
            else:
                loop.run_until_complete(_remove())
        except:
            # Fallback for sync context
            self.jobs.pop(job_id, None)
    
    def get_all_jobs(self) -> Dict[str, ScheduledJob]:
        """Get all registered jobs"""
        return self.jobs.copy()
    
    async def shutdown(self):
        """Shutdown all schedulers"""
        self._shutdown = True
        job_ids = list(self.running_tasks.keys())
        for job_id in job_ids:
            await self.stop_scheduler(job_id)
        logger.info("Scheduler service shutdown complete")


# Global scheduler instance
_scheduler_instance: Optional[WorkflowScheduler] = None


def get_scheduler() -> WorkflowScheduler:
    """Get global scheduler instance"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = WorkflowScheduler()
    return _scheduler_instance

