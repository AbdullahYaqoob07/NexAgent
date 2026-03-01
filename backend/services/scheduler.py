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
        logger.info(f"Attempting to stop scheduler for job {job_id}")
        async with self._lock:
            job = self.jobs.get(job_id)
            if job:
                logger.info(f"Setting job {job_id} status to STOPPED")
                job.status = SchedulerStatus.STOPPED
            else:
                logger.warning(f"Job {job_id} not found in jobs dict when trying to stop")
            
            task = self.running_tasks.pop(job_id, None)
            if task:
                logger.info(f"Cancelling task for job {job_id}")
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                logger.info(f"Stopped scheduler for job {job_id}")
            else:
                logger.info(f"No running task found for job {job_id}")
    
    async def _scheduler_loop(self, job_id: str):
        """Main scheduler loop for a job"""
        job = self.jobs.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found in scheduler loop")
            return
        
        logger.info(f"Starting scheduler loop for job {job_id} with workflow {job.workflow_id}")
        
        # Get timezone for this job
        try:
            import pytz
            tz = pytz.timezone(job.timezone)
            logger.info(f"Using timezone {job.timezone} for job {job_id}")
        except Exception as e:
            import pytz
            tz = pytz.UTC
            logger.warning(f"Invalid timezone '{job.timezone}' for job {job_id}, using UTC. Error: {str(e)}")
        
        def _make_tz_aware(dt: datetime, tz_obj) -> datetime:
            """Ensure a datetime is tz-aware using the given pytz timezone."""
            if dt.tzinfo is None:
                return tz_obj.localize(dt)
            return dt

        def _next_cron_run(cron: str, after: datetime, tz_obj) -> datetime:
            """Return the next tz-aware cron occurrence strictly after `after`."""
            # Always work with a tz-aware base
            base = _make_tz_aware(after, tz_obj)
            cron_obj = croniter(cron, base)
            candidate = cron_obj.get_next(datetime)
            candidate = _make_tz_aware(candidate, tz_obj)
            # Guarantee it's strictly in the future
            while candidate <= base:
                candidate = cron_obj.get_next(datetime)
                candidate = _make_tz_aware(candidate, tz_obj)
            return candidate

        try:
            while not self._shutdown and job.status == SchedulerStatus.RUNNING:
                try:
                    # ── 1. Determine next_run ──────────────────────────────────
                    now = _make_tz_aware(datetime.now(tz), tz)
                    if job.next_run is None:
                        job.next_run = _next_cron_run(job.cron, now, tz)
                        logger.info(f"Job {job_id} first next_run: {job.next_run}")

                    # Ensure stored next_run is tz-aware (defensive)
                    job.next_run = _make_tz_aware(job.next_run, tz)

                    # ── 2. Sleep until next_run ────────────────────────────────
                    now = _make_tz_aware(datetime.now(tz), tz)
                    if job.next_run > now:
                        wait_seconds = (job.next_run - now).total_seconds()
                        logger.info(f"Job {job_id} sleeping {wait_seconds:.1f}s until {job.next_run}")
                        await asyncio.sleep(wait_seconds)
                    else:
                        logger.warning(f"Job {job_id} next_run {job.next_run} is in the past; recalculating")
                        now = _make_tz_aware(datetime.now(tz), tz)
                        job.next_run = _next_cron_run(job.cron, now, tz)
                        wait_seconds = max(1.0, (job.next_run - now).total_seconds())
                        await asyncio.sleep(wait_seconds)

                    # ── 3. Stop check ──────────────────────────────────────────
                    if job.status != SchedulerStatus.RUNNING:
                        break

                    # ── 4. Execute ─────────────────────────────────────────────
                    lock_acquired = False
                    try:
                        await job._execution_lock.acquire()
                        lock_acquired = True

                        job.last_run = _make_tz_aware(datetime.now(tz), tz)
                        job.run_count += 1
                        logger.info(f"Executing scheduled workflow for job {job_id} (run #{job.run_count})")

                        try:
                            if job.executor_func:
                                workflow_data_with_flag = job.workflow_data.copy()
                                workflow_data_with_flag.setdefault('global_config', {})['_is_scheduled_execution'] = True

                                execution_result = await job.executor_func(workflow_data_with_flag, {})

                                converted_logs = [
                                    {
                                        "nodeId": log.get("node_id", ""),
                                        "nodeName": log.get("node_name", log.get("node_id", "Unknown")),
                                        "nodeType": log.get("node_type", "unknown"),
                                        "status": log.get("status", "unknown"),
                                        "output": log.get("output"),
                                        "error": log.get("error"),
                                        "executionTimeMs": log.get("execution_time_ms", 0),
                                        "startedAt": log.get("started_at", ""),
                                        "completedAt": log.get("completed_at", ""),
                                        "metadata": log.get("metadata", {}),
                                    }
                                    for log in execution_result.get("node_logs", [])
                                ]

                                job.last_execution_result = {
                                    "status": execution_result.get("status", "completed"),
                                    "node_logs": converted_logs,
                                    "execution_time_ms": execution_result.get("execution_time_ms", 0),
                                    "error": execution_result.get("error"),
                                    "timestamp": job.last_run.isoformat(),
                                }
                                logger.info(f"Job {job_id} execution completed: {execution_result.get('status', 'unknown')}")
                            else:
                                logger.warning(f"No executor function set for job {job_id}")

                        except Exception as exec_err:
                            import traceback as _tb
                            logger.error(f"Execution error for job {job_id}: {exec_err}\n{_tb.format_exc()}")

                    finally:
                        if lock_acquired:
                            try:
                                job._execution_lock.release()
                            except RuntimeError:
                                pass

                    # ── 5. Schedule next run ───────────────────────────────────
                    now = _make_tz_aware(datetime.now(tz), tz)
                    job.next_run = _next_cron_run(job.cron, now, tz)
                    logger.info(f"Job {job_id} next run: {job.next_run}")

                except asyncio.CancelledError:
                    raise  # propagate to outer handler
                except Exception as iter_err:
                    import traceback as _tb
                    logger.error(f"Scheduler loop iteration error for job {job_id}: {iter_err}\n{_tb.format_exc()}")
                    # Sleep briefly and retry — do NOT exit the loop
                    await asyncio.sleep(5)

        except asyncio.CancelledError:
            logger.info(f"Scheduler loop for job {job_id} cancelled")
        except Exception as e:
            logger.error(f"Scheduler loop fatal error for job {job_id}: {str(e)}")
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
        # Validate workflow data
        if not isinstance(workflow_data, dict):
            raise ValueError(f"Invalid workflow_data type: {type(workflow_data)}. Expected dict.")
        
        logger.info(f"Registering job for workflow {workflow_id} with data keys: {list(workflow_data.keys())}")
        
        # Stop and remove ALL existing jobs for this workflow before registering a new one.
        # This is the primary guard against duplicate job accumulation — the execute endpoint
        # also does a stop+pop, but only for the first match; this catches any stragglers.
        existing_jobs = [job for job in list(self.jobs.values()) if job.workflow_id == workflow_id]
        if existing_jobs:
            logger.warning(
                f"Purging {len(existing_jobs)} stale job(s) for workflow {workflow_id} before re-registering: "
                f"{[j.job_id for j in existing_jobs]}"
            )
            for stale in existing_jobs:
                stale.status = SchedulerStatus.STOPPED  # loop condition guard
                task = self.running_tasks.pop(stale.job_id, None)
                if task:
                    task.cancel()
                self.jobs.pop(stale.job_id, None)
        
        # Validate required workflow data structure
        required_keys = ['id', 'name', 'nodes', 'connections']
        for key in required_keys:
            if key not in workflow_data:
                logger.warning(f"Missing required key '{key}' in workflow_data for workflow {workflow_id}")
        
        # Log workflow structure for debugging
        logger.info(f"Workflow nodes count: {len(workflow_data.get('nodes', []))}")
        logger.info(f"Workflow connections count: {len(workflow_data.get('connections', []))}")
        
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
    
    def get_jobs_by_workflow_id(self, workflow_id: str) -> list:
        """Return ALL jobs for a workflow_id."""
        return [job for job in self.jobs.values() if job.workflow_id == workflow_id]

    def get_job_by_workflow_id(self, workflow_id: str) -> Optional[ScheduledJob]:
        """Return the active (running) job for a workflow, or the most-recent one."""
        matches = self.get_jobs_by_workflow_id(workflow_id)
        if not matches:
            return None
        # Prefer a running job so the 'already running' check works correctly
        for job in matches:
            if job.status == SchedulerStatus.RUNNING:
                return job
        return matches[-1]  # fallback: most recently inserted
    
    def remove_job(self, job_id: str):
        """Remove a job"""
        logger.info(f"Removing job {job_id}")
        if job_id not in self.jobs:
            logger.warning(f"Job {job_id} not found in jobs dict")
            return
            
        async def _remove():
            logger.info(f"Stopping scheduler for job {job_id}")
            await self.stop_scheduler(job_id)
            logger.info(f"Removing job {job_id} from jobs dict")
            self.jobs.pop(job_id, None)
        
        # Run in background if we're in async context
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                logger.info(f"Creating async task to remove job {job_id}")
                asyncio.create_task(_remove())
            else:
                logger.info(f"Running remove job {job_id} in sync context")
                loop.run_until_complete(_remove())
        except Exception as e:
            # Fallback for sync context
            logger.error(f"Error removing job {job_id}: {str(e)}")
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

