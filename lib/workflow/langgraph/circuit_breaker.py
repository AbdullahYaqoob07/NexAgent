"""
Circuit Breaker Pattern Implementation
Prevents cascading failures in distributed workflow execution
"""
import asyncio
import time
from typing import Dict, Any, Optional, Callable, Awaitable, List
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import logging

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"          # Normal operation
    OPEN = "open"              # Failing, rejecting requests
    HALF_OPEN = "half_open"    # Testing if service recovered

@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    failure_threshold: int = 5              # Failures before opening
    success_threshold: int = 2              # Successes to close from half-open
    timeout_ms: float = 60000               # Time before trying half-open
    half_open_max_calls: int = 3            # Max calls in half-open state
    expected_exception: type = Exception    # Exception type to track
    sliding_window_size: int = 10           # Size of failure tracking window
    volume_threshold: int = 5               # Min calls before evaluation
    error_rate_threshold: float = 0.5      # Error rate to trigger (0.0-1.0)
    
    # Monitoring
    track_latency: bool = True
    latency_threshold_ms: Optional[float] = 5000  # Consider slow calls as failures

@dataclass
class CircuitBreakerMetrics:
    """Metrics tracked by circuit breaker"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    
    # Timing
    total_latency_ms: float = 0.0
    min_latency_ms: float = float('inf')
    max_latency_ms: float = 0.0
    
    # State transitions
    last_state_change: Optional[float] = None
    state_change_count: int = 0
    time_in_open_ms: float = 0.0
    
    # Sliding window
    recent_results: deque = field(default_factory=lambda: deque(maxlen=10))
    
    def get_error_rate(self) -> float:
        """Calculate current error rate from sliding window"""
        if not self.recent_results:
            return 0.0
        failures = sum(1 for success in self.recent_results if not success)
        return failures / len(self.recent_results)
    
    def get_avg_latency_ms(self) -> float:
        """Calculate average latency"""
        if self.total_calls == 0:
            return 0.0
        return self.total_latency_ms / self.total_calls
    
    def record_call(self, success: bool, latency_ms: float):
        """Record a call result"""
        self.total_calls += 1
        self.recent_results.append(success)
        
        if success:
            self.successful_calls += 1
        else:
            self.failed_calls += 1
        
        # Track latency
        self.total_latency_ms += latency_ms
        self.min_latency_ms = min(self.min_latency_ms, latency_ms)
        self.max_latency_ms = max(self.max_latency_ms, latency_ms)

class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open"""
    def __init__(self, breaker_name: str, state: CircuitState):
        self.breaker_name = breaker_name
        self.state = state
        super().__init__(
            f"Circuit breaker '{breaker_name}' is {state}. "
            f"Request rejected to prevent cascading failure."
        )

class CircuitBreaker:
    """
    Implements circuit breaker pattern to handle failures gracefully.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests rejected immediately
    - HALF_OPEN: Testing recovery, limited requests allowed
    """
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        
        # State management
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._opened_at: Optional[float] = None
        self._half_open_calls = 0
        
        # Thread safety
        self._lock = asyncio.Lock()
        
        # Callbacks
        self._on_state_change: List[Callable] = []
        
        logger.info(f"Circuit breaker '{name}' initialized in CLOSED state")
    
    def on_state_change(self, callback: Callable[[CircuitState, CircuitState], None]):
        """Register callback for state changes"""
        self._on_state_change.append(callback)
    
    async def _change_state(self, new_state: CircuitState):
        """Change circuit breaker state"""
        old_state = self.state
        
        if old_state == new_state:
            return
        
        self.state = new_state
        self.metrics.last_state_change = time.time()
        self.metrics.state_change_count += 1
        
        if new_state == CircuitState.OPEN:
            self._opened_at = time.time()
        
        logger.info(
            f"Circuit breaker '{self.name}': {old_state} -> {new_state}"
        )
        
        # Trigger callbacks
        for callback in self._on_state_change:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(old_state, new_state)
                else:
                    callback(old_state, new_state)
            except Exception as e:
                logger.error(f"Error in state change callback: {e}")
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to try half-open state"""
        if self.state != CircuitState.OPEN:
            return False
        
        if self._opened_at is None:
            return False
        
        elapsed_ms = (time.time() - self._opened_at) * 1000
        return elapsed_ms >= self.config.timeout_ms
    
    async def _record_success(self, latency_ms: float):
        """Record successful call"""
        self.metrics.record_call(True, latency_ms)
        
        if self.state == CircuitState.HALF_OPEN:
            self._success_count += 1
            
            if self._success_count >= self.config.success_threshold:
                # Recovered! Close the circuit
                await self._change_state(CircuitState.CLOSED)
                self._failure_count = 0
                self._success_count = 0
                self._half_open_calls = 0
    
    async def _record_failure(self, latency_ms: float):
        """Record failed call"""
        self.metrics.record_call(False, latency_ms)
        self._failure_count += 1
        self._last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            # Failed during recovery test - back to open
            await self._change_state(CircuitState.OPEN)
            self._success_count = 0
            self._half_open_calls = 0
            return
        
        if self.state == CircuitState.CLOSED:
            # Check if we should open the circuit
            should_open = False
            
            # Method 1: Simple failure count
            if self._failure_count >= self.config.failure_threshold:
                should_open = True
            
            # Method 2: Error rate in sliding window
            if len(self.metrics.recent_results) >= self.config.volume_threshold:
                error_rate = self.metrics.get_error_rate()
                if error_rate >= self.config.error_rate_threshold:
                    should_open = True
            
            if should_open:
                await self._change_state(CircuitState.OPEN)
                logger.warning(
                    f"Circuit breaker '{self.name}' opened due to failures. "
                    f"Failure count: {self._failure_count}, "
                    f"Error rate: {self.metrics.get_error_rate():.2%}"
                )
    
    async def call(
        self,
        func: Callable[..., Awaitable[Any]],
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Async function to execute
            *args, **kwargs: Arguments to pass to function
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerError: If circuit is open
            Original exception: If call fails and circuit allows
        """
        async with self._lock:
            # Check if we should attempt reset
            if self._should_attempt_reset():
                await self._change_state(CircuitState.HALF_OPEN)
                self._half_open_calls = 0
            
            # Check current state
            if self.state == CircuitState.OPEN:
                self.metrics.rejected_calls += 1
                raise CircuitBreakerError(self.name, self.state)
            
            if self.state == CircuitState.HALF_OPEN:
                if self._half_open_calls >= self.config.half_open_max_calls:
                    self.metrics.rejected_calls += 1
                    raise CircuitBreakerError(self.name, self.state)
                self._half_open_calls += 1
        
        # Execute the call
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            
            # Record success
            latency_ms = (time.time() - start_time) * 1000
            
            # Check if latency is too high (treat as soft failure)
            if (self.config.track_latency and 
                self.config.latency_threshold_ms and
                latency_ms > self.config.latency_threshold_ms):
                logger.warning(
                    f"Circuit breaker '{self.name}': High latency "
                    f"{latency_ms:.2f}ms (threshold: {self.config.latency_threshold_ms}ms)"
                )
                async with self._lock:
                    await self._record_failure(latency_ms)
            else:
                async with self._lock:
                    await self._record_success(latency_ms)
            
            return result
            
        except self.config.expected_exception as e:
            # Record failure
            latency_ms = (time.time() - start_time) * 1000
            
            async with self._lock:
                await self._record_failure(latency_ms)
            
            raise e
    
    def get_state(self) -> CircuitState:
        """Get current circuit state"""
        return self.state
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics"""
        return {
            "name": self.name,
            "state": self.state,
            "total_calls": self.metrics.total_calls,
            "successful_calls": self.metrics.successful_calls,
            "failed_calls": self.metrics.failed_calls,
            "rejected_calls": self.metrics.rejected_calls,
            "error_rate": self.metrics.get_error_rate(),
            "avg_latency_ms": self.metrics.get_avg_latency_ms(),
            "min_latency_ms": self.metrics.min_latency_ms if self.metrics.min_latency_ms != float('inf') else 0,
            "max_latency_ms": self.metrics.max_latency_ms,
            "state_changes": self.metrics.state_change_count,
            "last_state_change": self.metrics.last_state_change
        }
    
    async def reset(self):
        """Manually reset circuit breaker to CLOSED state"""
        async with self._lock:
            await self._change_state(CircuitState.CLOSED)
            self._failure_count = 0
            self._success_count = 0
            self._half_open_calls = 0
            self._last_failure_time = None
            self._opened_at = None
            logger.info(f"Circuit breaker '{self.name}' manually reset")

class CircuitBreakerRegistry:
    """
    Registry to manage multiple circuit breakers.
    Useful for having separate breakers for different services/nodes.
    """
    
    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._default_config = CircuitBreakerConfig()
    
    def get_or_create(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get existing breaker or create new one"""
        if name not in self._breakers:
            breaker_config = config or self._default_config
            self._breakers[name] = CircuitBreaker(name, breaker_config)
            logger.info(f"Created circuit breaker: {name}")
        
        return self._breakers[name]
    
    def get(self, name: str) -> Optional[CircuitBreaker]:
        """Get breaker by name"""
        return self._breakers.get(name)
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics from all breakers"""
        return {
            name: breaker.get_metrics()
            for name, breaker in self._breakers.items()
        }
    
    async def reset_all(self):
        """Reset all circuit breakers"""
        for breaker in self._breakers.values():
            await breaker.reset()
    
    def list_breakers(self) -> List[str]:
        """List all registered breaker names"""
        return list(self._breakers.keys())

# Integration with Node Executor
class CircuitBreakerNodeExecutor:
    """
    Wrapper that adds circuit breaker to node execution.
    """
    
    def __init__(
        self,
        base_executor,
        circuit_breaker: CircuitBreaker
    ):
        self.base_executor = base_executor
        self.circuit_breaker = circuit_breaker
    
    async def execute(self, input_data: Any) -> Any:
        """Execute with circuit breaker protection"""
        try:
            result = await self.circuit_breaker.call(
                self.base_executor.execute,
                input_data
            )
            return result
        
        except CircuitBreakerError as e:
            # Circuit is open - return error response
            logger.error(f"Circuit breaker prevented execution: {e}")
            return {
                "error": "service_unavailable",
                "message": str(e),
                "circuit_breaker": self.circuit_breaker.name,
                "state": self.circuit_breaker.get_state()
            }