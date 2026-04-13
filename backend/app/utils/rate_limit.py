from collections import deque
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import HTTPException

from app.config import settings


_lock = Lock()
_failures_by_key = {}
_blocked_until_by_key = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _principal_key(ip: str, principal: str) -> str:
    return f"{ip}:{principal.strip().lower()}"


def _prune_old_attempts(queue: deque, now: datetime) -> None:
    window = timedelta(seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)
    cutoff = now - window
    while queue and queue[0] < cutoff:
        queue.popleft()


def check_login_rate_limit(ip: str, principal: str) -> None:
    """Raise HTTP 429 when the login key is currently blocked."""
    key = _principal_key(ip, principal)
    now = _now()

    with _lock:
        blocked_until = _blocked_until_by_key.get(key)
        if blocked_until and blocked_until > now:
            retry_after = int((blocked_until - now).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed login attempts. Try again in {retry_after} seconds.",
            )

        if blocked_until and blocked_until <= now:
            _blocked_until_by_key.pop(key, None)
            _failures_by_key.pop(key, None)


def record_failed_login_attempt(ip: str, principal: str) -> None:
    """Track failed login attempts and place key into temporary block when threshold is hit."""
    key = _principal_key(ip, principal)
    now = _now()

    with _lock:
        queue = _failures_by_key.get(key)
        if queue is None:
            queue = deque()
            _failures_by_key[key] = queue

        _prune_old_attempts(queue, now)
        queue.append(now)

        if len(queue) >= settings.LOGIN_RATE_LIMIT_ATTEMPTS:
            _blocked_until_by_key[key] = now + timedelta(seconds=settings.LOGIN_RATE_LIMIT_BLOCK_SECONDS)
            queue.clear()


def clear_failed_login_attempts(ip: str, principal: str) -> None:
    key = _principal_key(ip, principal)
    with _lock:
        _failures_by_key.pop(key, None)
        _blocked_until_by_key.pop(key, None)
