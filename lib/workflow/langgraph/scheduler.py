"""
Workflow Scheduler Service
Manages scheduled workflow executions using cron expressions
"""
import asyncio
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
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
    last_execution_result: Optional[Dict[str, Any]] = None  # Store last execution result
    _execution_lock: asyncio.Lock = field(default_factory=asyncio.Lock)  # Lock to prevent concurrent executions


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
    
    @staticmethod
    def normalize_cron(cron: str) -> str:
        """
        Normalize cron expression to 5-field format.
        Converts 6-field cron (with seconds) to 5-field by removing seconds.
        
        Args:
            cron: Cron expression (5 or 6 fields)
            
        Returns:
            Normalized 5-field cron expression
        """
        fields = cron.strip().split()
        
        if len(fields) == 6:
            # 6-field cron: second minute hour day month weekday
            # Remove seconds field to get 5-field: minute hour day month weekday
            logger.info(f"Converting 6-field cron to 5-field: {cron} -> {' '.join(fields[1:])}")
            return ' '.join(fields[1:])
        elif len(fields) == 5:
            # Already 5-field, return as-is
            return cron
        else:
            raise ValueError(f"Invalid cron format: expected 5 or 6 fields, got {len(fields)} fields")
    
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
        
        # Get timezone for this job
        try:
            import pytz
            tz = pytz.timezone(job.timezone)
        except Exception:
            import pytz
            tz = pytz.UTC
            logger.warning(f"Invalid timezone '{job.timezone}' for job {job_id}, using UTC")
        
        # Minimum buffer between executions (1 second) to prevent rapid-fire executions
        MIN_EXECUTION_BUFFER_SECONDS = 1.0
        
        try:
            while not self._shutdown and job.status == SchedulerStatus.RUNNING:
                # Calculate next run time in the job's timezone
                if job.next_run is None:
                    now = datetime.now(tz)
                    cron_obj = croniter(job.cron, now)
                    job.next_run = cron_obj.get_next(datetime)
                    logger.info(f"Job {job_id} next run scheduled for: {job.next_run} (timezone: {job.timezone})")
                
                # Wait until next run time (compare timezone-aware datetimes)
                now = datetime.now(tz)
                if job.next_run > now:
                    wait_seconds = (job.next_run - now).total_seconds()
                    logger.debug(f"Job {job_id} waiting {wait_seconds:.1f} seconds until next run")
                    await asyncio.sleep(wait_seconds)
                
                # Check if still running
                if job.status != SchedulerStatus.RUNNING:
                    break
                
                # Try to acquire lock (non-blocking check to prevent concurrent executions)
                lock_acquired = False
                try:
                    lock_acquired = job._execution_lock.acquire(blocking=False)
                    if not lock_acquired:
                        logger.warning(f"Job {job_id} execution already in progress, skipping this run")
                        # Recalculate next_run and continue
                        if CRONITER_AVAILABLE:
                            now = datetime.now(tz)
                            cron_obj = croniter(job.cron, now)
                            job.next_run = cron_obj.get_next(datetime)
                        continue
                    
                    # Execute the workflow (lock is now acquired)
                    logger.info(f"Executing scheduled workflow for job {job_id}")
                    job.last_run = datetime.now(tz)
                    job.run_count += 1
                    
                    try:
                        if job.executor_func:
                            execution_result = await job.executor_func(job.workflow_data, {})
                            # Convert node_logs from snake_case to camelCase for frontend
                            node_logs = execution_result.get("node_logs", [])
                            converted_logs = []
                            for log in node_logs:
                                converted_log = {
                                    "nodeId": log.get("node_id", ""),
                                    "nodeName": log.get("node_name", log.get("node_id", "Unknown")),
                                    "nodeType": log.get("node_type", "unknown"),
                                    "status": log.get("status", "unknown"),
                                    "output": log.get("output"),
                                    "error": log.get("error"),
                                    "executionTimeMs": log.get("execution_time_ms", 0),
                                    "startedAt": log.get("started_at", ""),
                                    "completedAt": log.get("completed_at", ""),
                                    "metadata": log.get("metadata", {})
                                }
                                converted_logs.append(converted_log)
                            
                            # Store execution result for frontend to display
                            job.last_execution_result = {
                                "status": execution_result.get("status", "completed"),
                                "node_logs": converted_logs,
                                "execution_time_ms": execution_result.get("execution_time_ms", 0),
                                "error": execution_result.get("error"),
                                "timestamp": job.last_run.isoformat()
                            }
                            logger.info(f"Job {job_id} execution completed: {execution_result.get('status', 'unknown')}")
                        else:
                            logger.warning(f"No executor function set for job {job_id}")
                    
                    except Exception as e:
                        logger.error(f"Error executing scheduled workflow {job_id}: {str(e)}")
                        # Continue scheduling even if execution fails
                    
                    # Calculate next run time in the job's timezone (outside try/except so it always runs)
                    if CRONITER_AVAILABLE:
                        now = datetime.now(tz)
                        cron_obj = croniter(job.cron, now)
                        next_run_candidate = cron_obj.get_next(datetime)
                        
                        # Ensure next_run is always in the future with minimum buffer
                        if next_run_candidate <= now:
                            # If calculated time is in the past or now, get the next occurrence
                            next_run_candidate = cron_obj.get_next(datetime)
                        
                        # Add minimum buffer to prevent rapid executions
                        min_next_run = now + timedelta(seconds=MIN_EXECUTION_BUFFER_SECONDS)
                        if next_run_candidate < min_next_run:
                            job.next_run = min_next_run
                            logger.info(f"Job {job_id} next run adjusted to minimum buffer: {job.next_run}")
                        else:
                            job.next_run = next_run_candidate
                        
                        logger.info(f"Job {job_id} completed. Next run: {job.next_run} (timezone: {job.timezone})")
                    else:
                        logger.error("croniter not available, cannot calculate next run")
                        break
                finally:
                    # Always release the lock
                    if lock_acquired:
                        job._execution_lock.release()
                
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
            cron: Cron expression (5 or 6 fields)
            timezone: Timezone (default: UTC)
            executor_func: Function to execute the workflow
            
        Returns:
            Job ID
        """
        # Validate cron expression
        if not CRONITER_AVAILABLE:
            raise ValueError("croniter library not installed. Install it with: pip install croniter")
        
        # Normalize cron to 5-field format
        try:
            normalized_cron = self.normalize_cron(cron)
            # Validate normalized cron
            croniter(normalized_cron)
            cron = normalized_cron  # Use normalized version
        except ValueError as e:
            raise ValueError(f"Invalid cron expression: {str(e)}")
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {str(e)}")
        
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        
        # Calculate initial next run time in the specified timezone
        if not CRONITER_AVAILABLE:
            raise ValueError("croniter library not installed. Install it with: pip install croniter")
        
        # Use timezone-aware datetime for cron calculation
        try:
            import pytz
            tz = pytz.timezone(timezone)
            now = datetime.now(tz)
        except Exception:
            # Fallback to UTC if timezone is invalid
            import pytz
            tz = pytz.UTC
            now = datetime.now(tz)
            logger.warning(f"Invalid timezone '{timezone}', using UTC")
        
        cron_obj = croniter(cron, now)
        next_run = cron_obj.get_next(datetime)
        
        # Log the calculation for debugging
        logger.info(f"Calculated next run: {next_run} (from now: {now}, cron: {cron}, timezone: {timezone})")
        
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

