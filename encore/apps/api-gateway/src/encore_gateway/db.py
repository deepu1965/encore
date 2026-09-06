"""SQLAlchemy engine, session factory, and the FastAPI DB dependency.

Synchronous SQLAlchemy on purpose — see docs/architecture/... tech stack
note ("keep the hot checkout path in one language/runtime, optimize for
clarity before adding unnecessary polyglot complexity"). Async can be
revisited with real load-test numbers behind the decision (Week 17), not
speculatively now.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
import uuid
import hashlib

from .config import settings

write_engine = create_engine(settings.database_write_url, pool_pre_ping=True, future=True)
read_engine = create_engine(settings.database_read_url, pool_pre_ping=True, future=True)

SessionWrite = sessionmaker(bind=write_engine, autoflush=False, autocommit=False, future=True)
SessionRead = sessionmaker(bind=read_engine, autoflush=False, autocommit=False, future=True)

class ShardManager:
    def __init__(self, shard_urls: list[str]):
        self.engines = []
        self.session_factories = []
        for url in shard_urls:
            engine = create_engine(url, pool_pre_ping=True, future=True)
            self.engines.append(engine)
            self.session_factories.append(sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True))

    def get_shard_index(self, event_id: uuid.UUID | str) -> int:
        if not self.engines:
            return 0
        # Deterministic hash of event_id
        h = hashlib.sha256(str(event_id).encode("utf-8")).hexdigest()
        return int(h, 16) % len(self.engines)

    def get_session(self, event_id: uuid.UUID | str) -> Session:
        if not self.engines:
            # Fallback to primary if no shards configured
            return SessionWrite()
        idx = self.get_shard_index(event_id)
        return self.session_factories[idx]()

shard_manager = ShardManager(settings.shard_urls)

# For backwards compatibility during transition
engine = write_engine


class Base(DeclarativeBase):
    """Shared declarative base for every ORM model in models.py."""


def get_db_write() -> Generator[Session, None, None]:
    """Yields a Session bound to the primary (write) database."""
    db = SessionWrite()
    try:
        yield db
    finally:
        db.close()

def get_db_read() -> Generator[Session, None, None]:
    """Yields a Session bound to the read replica (or read pool)."""
    db = SessionRead()
    try:
        yield db
    finally:
        db.close()

def get_shard_db(event_id: uuid.UUID | str) -> Generator[Session, None, None]:
    """Yields a Session bound to the correct shard for the given event_id."""
    db = shard_manager.get_session(event_id)
    try:
        yield db
    finally:
        db.close()

# For backwards compatibility during transition, get_db() acts as get_db_write()
get_db = get_db_write
