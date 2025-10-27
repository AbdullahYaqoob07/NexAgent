import logging
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from fastapi import Request
from pydantic import BaseModel
import asyncio
from collections import deque
import threading
import os


class APIEvent(BaseModel):
    """Model for API event logging"""
    timestamp: datetime
    user_id: Optional[str]
    action: str
    resource_id: Optional[str]
    method: str
    endpoint: str
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    ip_address: Optional[str]
    user_agent: Optional[str]
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class SecurityEvent(BaseModel):
    """Model for security event logging"""
    timestamp: datetime
    event_type: str  # login_attempt, rate_limit_exceeded, unauthorized_access, etc.
    user_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    severity: str  # low, medium, high, critical
    description: str
    metadata: Optional[Dict[str, Any]] = None


class PerformanceMetric(BaseModel):
    """Model for performance metrics"""
    timestamp: datetime
    endpoint: str
    method: str
    duration_ms: float
    status_code: int
    user_id: Optional[str]
    memory_usage: Optional[float] = None
    cpu_usage: Optional[float] = None


# In-memory storage for events (in production, use proper logging infrastructure)
api_events: deque = deque(maxlen=10000)
security_events: deque = deque(maxlen=5000)
performance_metrics: deque = deque(maxlen=10000)
events_lock = threading.Lock()


class StructuredLogger:
    """
    Structured logger for industrial-grade logging
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.setup_logger()
    
    def setup_logger(self):
        """Setup structured logging configuration"""
        # Create custom formatter for structured logging
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno,
                }
                
                # Add extra fields if present
                if hasattr(record, 'user_id'):
                    log_entry['user_id'] = record.user_id
                if hasattr(record, 'request_id'):
                    log_entry['request_id'] = record.request_id
                if hasattr(record, 'trace_id'):
                    log_entry['trace_id'] = record.trace_id
                if hasattr(record, 'metadata'):
                    log_entry['metadata'] = record.metadata
                
                # Add exception info if present
                if record.exc_info:
                    log_entry['exception'] = self.formatException(record.exc_info)
                
                return json.dumps(log_entry, ensure_ascii=False)
        
        # Only setup if not already configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(JSONFormatter())
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def info(self, message: str, **kwargs):
        """Log info message with metadata"""
        extra = {k: v for k, v in kwargs.items() if k not in ['message']}
        self.logger.info(message, extra=extra)
    
    def error(self, message: str, **kwargs):
        """Log error message with metadata"""
        extra = {k: v for k, v in kwargs.items() if k not in ['message']}
        self.logger.error(message, extra=extra)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with metadata"""
        extra = {k: v for k, v in kwargs.items() if k not in ['message']}
        self.logger.warning(message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with metadata"""
        extra = {k: v for k, v in kwargs.items() if k not in ['message']}
        self.logger.debug(message, extra=extra)


# Global structured logger instance
structured_logger = StructuredLogger(__name__)


async def log_api_event(
    request: Request,
    user_id: Optional[str] = None,
    action: str = "unknown",
    resource_id: Optional[str] = None,
    status_code: Optional[int] = None,
    duration_ms: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
):
    """
    Log API event with structured data
    
    Args:
        request: FastAPI request object
        user_id: ID of the user making the request
        action: Action being performed
        resource_id: ID of the resource being accessed
        status_code: HTTP status code
        duration_ms: Request duration in milliseconds
        metadata: Additional metadata
        error: Error message if applicable
    """
    try:
        event = APIEvent(
            timestamp=datetime.utcnow(),
            user_id=user_id,
            action=action,
            resource_id=resource_id,
            method=request.method,
            endpoint=str(request.url.path),
            status_code=status_code,
            duration_ms=duration_ms,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            metadata=metadata,
            error=error
        )
        
        with events_lock:
            api_events.append(event)
        
        # Log to structured logger
        structured_logger.info(
            f"API Event: {action}",
            user_id=user_id,
            action=action,
            resource_id=resource_id,
            method=request.method,
            endpoint=str(request.url.path),
            status_code=status_code,
            duration_ms=duration_ms,
            metadata=metadata,
            error=error
        )
        
    except Exception as e:
        structured_logger.error(f"Failed to log API event: {str(e)}")


async def log_security_event(
    event_type: str,
    description: str,
    severity: str = "medium",
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log security event
    
    Args:
        event_type: Type of security event
        description: Description of the event
        severity: Event severity (low, medium, high, critical)
        user_id: ID of the user involved
        ip_address: IP address involved
        user_agent: User agent string
        metadata: Additional metadata
    """
    try:
        event = SecurityEvent(
            timestamp=datetime.utcnow(),
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
            description=description,
            metadata=metadata
        )
        
        with events_lock:
            security_events.append(event)
        
        # Log to structured logger with appropriate level
        log_level = {
            "low": structured_logger.info,
            "medium": structured_logger.warning,
            "high": structured_logger.error,
            "critical": structured_logger.error
        }.get(severity, structured_logger.warning)
        
        log_level(
            f"Security Event: {event_type} - {description}",
            event_type=event_type,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
        
        # Alert on critical events
        if severity == "critical":
            await alert_critical_security_event(event)
        
    except Exception as e:
        structured_logger.error(f"Failed to log security event: {str(e)}")


async def log_performance_metric(
    endpoint: str,
    method: str,
    duration_ms: float,
    status_code: int,
    user_id: Optional[str] = None,
    memory_usage: Optional[float] = None,
    cpu_usage: Optional[float] = None
):
    """
    Log performance metric
    
    Args:
        endpoint: API endpoint
        method: HTTP method
        duration_ms: Request duration in milliseconds
        status_code: HTTP status code
        user_id: ID of the user making the request
        memory_usage: Memory usage in MB
        cpu_usage: CPU usage percentage
    """
    try:
        metric = PerformanceMetric(
            timestamp=datetime.utcnow(),
            endpoint=endpoint,
            method=method,
            duration_ms=duration_ms,
            status_code=status_code,
            user_id=user_id,
            memory_usage=memory_usage,
            cpu_usage=cpu_usage
        )
        
        with events_lock:
            performance_metrics.append(metric)
        
        # Log slow requests
        if duration_ms > 5000:  # Slower than 5 seconds
            structured_logger.warning(
                f"Slow request detected: {method} {endpoint} took {duration_ms:.2f}ms",
                endpoint=endpoint,
                method=method,
                duration_ms=duration_ms,
                status_code=status_code,
                user_id=user_id
            )
        
    except Exception as e:
        structured_logger.error(f"Failed to log performance metric: {str(e)}")


async def alert_critical_security_event(event: SecurityEvent):
    """
    Alert on critical security events
    This should integrate with your alerting system (email, Slack, PagerDuty, etc.)
    
    Args:
        event: Critical security event
    """
    try:
        # In production, send alerts via email, Slack, PagerDuty, etc.
        alert_message = f"""
        CRITICAL SECURITY ALERT
        
        Event Type: {event.event_type}
        Time: {event.timestamp}
        User ID: {event.user_id}
        IP Address: {event.ip_address}
        Description: {event.description}
        Metadata: {json.dumps(event.metadata, indent=2) if event.metadata else 'None'}
        """
        
        structured_logger.error(
            "CRITICAL SECURITY ALERT",
            alert_message=alert_message,
            event_type=event.event_type,
            user_id=event.user_id,
            ip_address=event.ip_address
        )
        
        # TODO: Implement actual alerting mechanisms
        # - Send email to security team
        # - Post to Slack security channel
        # - Create PagerDuty incident
        # - Store in security incident database
        
    except Exception as e:
        structured_logger.error(f"Failed to send critical security alert: {str(e)}")


def get_api_events(
    limit: int = 100,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> List[APIEvent]:
    """
    Retrieve API events with filtering
    
    Args:
        limit: Maximum number of events to return
        user_id: Filter by user ID
        action: Filter by action
        start_time: Filter by start time
        end_time: Filter by end time
    
    Returns:
        List of filtered API events
    """
    try:
        with events_lock:
            events = list(api_events)
        
        # Apply filters
        filtered_events = []
        for event in reversed(events):  # Most recent first
            if len(filtered_events) >= limit:
                break
            
            # Apply filters
            if user_id and event.user_id != user_id:
                continue
            if action and event.action != action:
                continue
            if start_time and event.timestamp < start_time:
                continue
            if end_time and event.timestamp > end_time:
                continue
            
            filtered_events.append(event)
        
        return filtered_events
        
    except Exception as e:
        structured_logger.error(f"Failed to retrieve API events: {str(e)}")
        return []


def get_security_events(
    limit: int = 100,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    user_id: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> List[SecurityEvent]:
    """
    Retrieve security events with filtering
    
    Args:
        limit: Maximum number of events to return
        event_type: Filter by event type
        severity: Filter by severity
        user_id: Filter by user ID
        start_time: Filter by start time
        end_time: Filter by end time
    
    Returns:
        List of filtered security events
    """
    try:
        with events_lock:
            events = list(security_events)
        
        # Apply filters
        filtered_events = []
        for event in reversed(events):  # Most recent first
            if len(filtered_events) >= limit:
                break
            
            # Apply filters
            if event_type and event.event_type != event_type:
                continue
            if severity and event.severity != severity:
                continue
            if user_id and event.user_id != user_id:
                continue
            if start_time and event.timestamp < start_time:
                continue
            if end_time and event.timestamp > end_time:
                continue
            
            filtered_events.append(event)
        
        return filtered_events
        
    except Exception as e:
        structured_logger.error(f"Failed to retrieve security events: {str(e)}")
        return []


def get_performance_metrics(
    limit: int = 100,
    endpoint: Optional[str] = None,
    min_duration: Optional[float] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None
) -> List[PerformanceMetric]:
    """
    Retrieve performance metrics with filtering
    
    Args:
        limit: Maximum number of metrics to return
        endpoint: Filter by endpoint
        min_duration: Filter by minimum duration
        start_time: Filter by start time
        end_time: Filter by end time
    
    Returns:
        List of filtered performance metrics
    """
    try:
        with events_lock:
            metrics = list(performance_metrics)
        
        # Apply filters
        filtered_metrics = []
        for metric in reversed(metrics):  # Most recent first
            if len(filtered_metrics) >= limit:
                break
            
            # Apply filters
            if endpoint and metric.endpoint != endpoint:
                continue
            if min_duration and metric.duration_ms < min_duration:
                continue
            if start_time and metric.timestamp < start_time:
                continue
            if end_time and metric.timestamp > end_time:
                continue
            
            filtered_metrics.append(metric)
        
        return filtered_metrics
        
    except Exception as e:
        structured_logger.error(f"Failed to retrieve performance metrics: {str(e)}")
        return []


def cleanup_old_events():
    """
    Clean up old events from memory
    Should be called periodically
    """
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=24)  # Keep last 24 hours
        
        with events_lock:
            # Clean API events
            api_events_to_keep = deque(maxlen=api_events.maxlen)
            for event in api_events:
                if event.timestamp > cutoff_time:
                    api_events_to_keep.append(event)
            api_events.clear()
            api_events.extend(api_events_to_keep)
            
            # Clean security events
            security_events_to_keep = deque(maxlen=security_events.maxlen)
            for event in security_events:
                if event.timestamp > cutoff_time:
                    security_events_to_keep.append(event)
            security_events.clear()
            security_events.extend(security_events_to_keep)
            
            # Clean performance metrics
            metrics_to_keep = deque(maxlen=performance_metrics.maxlen)
            for metric in performance_metrics:
                if metric.timestamp > cutoff_time:
                    metrics_to_keep.append(metric)
            performance_metrics.clear()
            performance_metrics.extend(metrics_to_keep)
        
        structured_logger.info("Cleaned up old logging events")
        
    except Exception as e:
        structured_logger.error(f"Failed to cleanup old events: {str(e)}")


# Background task for periodic cleanup
async def periodic_cleanup():
    """
    Periodic cleanup of old logging events
    """
    while True:
        try:
            cleanup_old_events()
            await asyncio.sleep(3600)  # Clean up every hour
        except Exception as e:
            structured_logger.error(f"Error in periodic logging cleanup: {str(e)}")
            await asyncio.sleep(300)  # Wait 5 minutes before retrying


# Context manager for request timing
class RequestTimer:
    """Context manager for timing requests"""
    
    def __init__(self, request: Request, user_id: Optional[str] = None):
        self.request = request
        self.user_id = user_id
        self.start_time = None
        self.end_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.time()
        duration_ms = (self.end_time - self.start_time) * 1000
        
        # Log performance metric
        asyncio.create_task(log_performance_metric(
            endpoint=str(self.request.url.path),
            method=self.request.method,
            duration_ms=duration_ms,
            status_code=200 if not exc_type else 500,
            user_id=self.user_id
        ))