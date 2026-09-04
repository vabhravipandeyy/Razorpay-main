import time
from typing import Dict, List, Tuple
from fastapi import HTTPException, status
from app.core.logging_config import logger


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter.
    Limits request rates per client identifier (IP / User ID).
    """

    def __init__(self):
        self._records: Dict[str, List[float]] = {}

    def check(self, key: str, max_requests: int = 60, window_seconds: int = 60):
        now = time.time()
        timestamps = self._records.get(key, [])

        # Filter timestamps within window
        valid_timestamps = [t for t in timestamps if now - t < window_seconds]

        if len(valid_timestamps) >= max_requests:
            logger.warning(f"Rate limit exceeded for key: {key} (limit={max_requests}/{window_seconds}s)")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds allowed."
            )

        valid_timestamps.append(now)
        self._records[key] = valid_timestamps


rate_limiter = InMemoryRateLimiter()
