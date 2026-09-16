import logging
import time
from enum import Enum
from functools import wraps

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):  # noqa: UP042
    CLOSED = "CLOSED"       # Normal operation
    OPEN = "OPEN"           # Fast-fail
    HALF_OPEN = "HALF_OPEN" # Testing recovery

class CircuitOpenException(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout_sec: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0

    @property
    def state(self) -> CircuitState:
        # Check if we should transition from OPEN to HALF_OPEN based on timeout
        if self._state == CircuitState.OPEN:
            if time.time() - self._last_failure_time > self.recovery_timeout_sec:
                self._state = CircuitState.HALF_OPEN
        return self._state

    def record_success(self):
        if self._state == CircuitState.HALF_OPEN:
            logger.info("Circuit breaker recovered. Transitioning to CLOSED.")
            self._state = CircuitState.CLOSED
            self._failure_count = 0
        elif self._state == CircuitState.CLOSED:
            self._failure_count = 0

    def record_failure(self):
        self._failure_count += 1
        self._last_failure_time = time.time()
        
        if self._state == CircuitState.CLOSED and self._failure_count >= self.failure_threshold:
            logger.warning("Circuit breaker failure threshold reached. Transitioning to OPEN.")
            self._state = CircuitState.OPEN
        elif self._state == CircuitState.HALF_OPEN:
            logger.warning("Circuit breaker failed during HALF_OPEN. Transitioning back to OPEN.")
            self._state = CircuitState.OPEN

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                raise CircuitOpenException("Circuit is OPEN. Fast-failing request.")
                
            try:
                result = func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                # In a real app we might only record failure for specific exception types (e.g. timeouts/5xx)  # noqa: E501
                self.record_failure()
                raise e
        return wrapper
