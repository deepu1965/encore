"""Redis-backed waiting-room queue.

DATA STRUCTURES
───────────────
Queue (sorted set):
    Key:    waiting:queue:{event_id}
    Member: {user_id}
    Score:  Unix timestamp in milliseconds at join time (FIFO ordering)
            Using ms-timestamp (not a Snowflake ID) to avoid 64-bit float
            precision issues in Redis sorted set scores. Two users joining in
            the same millisecond on different workers will have the same score;
            tie-breaking is then arbitrary but acceptable for admission fairness.

Admitted flag (simple key):
    Key:    waiting:admitted:{event_id}:{user_id}
    Value:  "1"
    TTL:    admission_token_ttl_secs (default 600s / 10 min)

Admission token (maps token → user|event):
    Key:    waiting:token:{token}
    Value:  "{user_id}|{event_id}"
    TTL:    admission_token_ttl_secs
    NOTE:   consumed atomically by GETDEL when validated at the hold endpoint.
            Once consumed, the user must re-queue if their hold attempt fails.

Reverse-lookup (user → token, for status queries):
    Key:    waiting:user_token:{event_id}:{user_id}
    Value:  "{token}"
    TTL:    admission_token_ttl_secs
    Allows GET /status to return the user's current token without scanning
    all token keys.

ATOMICITY
─────────
- join():        ZADD NX (only adds if not already a member → idempotent)
- admit_batch(): ZPOPMIN N (atomically removes N members)
- consume_token(): GETDEL (atomically reads + deletes; Redis 6.2+ required)

All operations are single Redis commands — no Lua script needed.
"""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass

import redis as redis_lib

# ──────────────────────────────────────────────────────────────────────────────
# Key helpers
# ──────────────────────────────────────────────────────────────────────────────

def _queue_key(event_id: str) -> str:
    return f"waiting:queue:{event_id}"

def _admitted_key(event_id: str, user_id: str) -> str:
    return f"waiting:admitted:{event_id}:{user_id}"

def _token_key(token: str) -> str:
    return f"waiting:token:{token}"

def _user_token_key(event_id: str, user_id: str) -> str:
    return f"waiting:user_token:{event_id}:{user_id}"

def _token_value(user_id: str, event_id: str) -> str:
    return f"{user_id}|{event_id}"

def _parse_token_value(raw: str) -> tuple[str, str]:
    """Parse '{user_id}|{event_id}' → (user_id, event_id)."""
    parts = raw.split("|", 1)
    if len(parts) != 2:
        raise ValueError(f"Malformed token value: {raw!r}")
    return parts[0], parts[1]


# ──────────────────────────────────────────────────────────────────────────────
# Result types
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class QueueStatus:
    """Result of a join or status query."""
    admitted: bool
    position: int      # 0-based rank in queue; 0 means "next to be admitted" or "already admitted"
    queue_size: int    # total users currently in queue (not including admitted users)
    token: str | None  # only set when admitted=True


# ──────────────────────────────────────────────────────────────────────────────
# WaitingRoomQueue
# ──────────────────────────────────────────────────────────────────────────────

class WaitingRoomQueue:
    """All Redis operations for the waiting-room queue.

    Designed for easy unit testing: accepts a redis.Redis (or fakeredis.FakeRedis)
    in the constructor so tests can inject a fake without patching globals.
    """

    def __init__(self, redis_client: redis_lib.Redis, token_ttl_secs: int = 600) -> None:
        self._r = redis_client
        self._ttl = token_ttl_secs

    # ── Public interface ───────────────────────────────────────────────────────

    def join(self, event_id: str, user_id: str) -> QueueStatus:
        """Add user to the queue for event_id (idempotent).

        If the user is already admitted, returns their current token.
        If the user is already in the queue, returns their current position.
        If the user is new, assigns a score = current ms timestamp and adds them.
        """
        # Check admitted first (fast path for returning admitted users)
        existing_token = self._get_user_token(event_id, user_id)
        if existing_token is not None:
            queue_size = self._queue_size(event_id)
            return QueueStatus(admitted=True, position=0, queue_size=queue_size, token=existing_token)  # noqa: E501

        # ZADD NX: only add if not already present (idempotent join)
        score = int(time.time() * 1000)  # ms since epoch
        self._r.zadd(_queue_key(event_id), {user_id: score}, nx=True)

        # Position is 0-based rank
        rank = self._r.zrank(_queue_key(event_id), user_id)
        position = int(rank) if rank is not None else 0
        queue_size = self._queue_size(event_id)

        return QueueStatus(admitted=False, position=position, queue_size=queue_size, token=None)

    def get_status(self, event_id: str, user_id: str) -> QueueStatus:
        """Return current queue status for a user (non-mutating)."""
        # Check admitted
        existing_token = self._get_user_token(event_id, user_id)
        if existing_token is not None:
            queue_size = self._queue_size(event_id)
            return QueueStatus(admitted=True, position=0, queue_size=queue_size, token=existing_token)  # noqa: E501

        rank = self._r.zrank(_queue_key(event_id), user_id)
        queue_size = self._queue_size(event_id)
        if rank is None:
            # User not in queue and not admitted — they never joined or were evicted
            return QueueStatus(admitted=False, position=-1, queue_size=queue_size, token=None)

        return QueueStatus(admitted=False, position=int(rank), queue_size=queue_size, token=None)

    def admit_batch(self, event_id: str, batch_size: int) -> list[str]:
        """Atomically pop up to batch_size users from the queue and admit them.

        Returns the list of admitted user_ids.
        Callers (the ticker) are responsible for emitting Kafka events per user.
        """
        # ZPOPMIN returns [(member, score), ...] for decode_responses=True
        # or [(bytes, float), ...] for binary mode.
        popped = self._r.zpopmin(_queue_key(event_id), batch_size)
        admitted_users = []
        for member, _score in popped:
            user_id = str(member)
            self._admit_user(event_id, user_id)
            admitted_users.append(user_id)
        return admitted_users

    def consume_token(self, token: str) -> tuple[str, str] | None:
        """Atomically read and delete a single-use admission token.

        Returns (user_id, event_id) if the token is valid, None if expired or
        never existed.

        ATOMICITY: Uses Redis GETDEL (Redis 6.2+). A token can only be consumed
        once — the second caller always gets None. This prevents replay attacks.
        """
        raw = self._r.getdel(_token_key(token))
        if raw is None:
            return None
        try:
            return _parse_token_value(str(raw))
        except ValueError:
            return None

    def validate_token_no_consume(self, token: str) -> tuple[str, str] | None:
        """Read a token without consuming it (for internal debugging / tests)."""
        raw = self._r.get(_token_key(token))
        if raw is None:
            return None
        try:
            return _parse_token_value(str(raw))
        except ValueError:
            return None

    def queue_size(self, event_id: str) -> int:
        return self._queue_size(event_id)

    # ── Private helpers ────────────────────────────────────────────────────────

    def _admit_user(self, event_id: str, user_id: str) -> str:
        """Mark a user as admitted and create their single-use token."""
        token = secrets.token_hex(32)  # 64 hex chars, 256 bits of entropy
        pipe = self._r.pipeline()
        pipe.set(_admitted_key(event_id, user_id), "1", ex=self._ttl)
        pipe.set(_token_key(token), _token_value(user_id, event_id), ex=self._ttl)
        pipe.set(_user_token_key(event_id, user_id), token, ex=self._ttl)
        pipe.execute()
        return token

    def _get_user_token(self, event_id: str, user_id: str) -> str | None:
        """Return the user's current admission token, or None if not admitted."""
        token = self._r.get(_user_token_key(event_id, user_id))
        return str(token) if token is not None else None

    def _queue_size(self, event_id: str) -> int:
        return int(self._r.zcard(_queue_key(event_id)) or 0)
