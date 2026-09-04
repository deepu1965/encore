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

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Shared declarative base for every ORM model in models.py."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a Session, always closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
