"""Alembic environment script.

Reads the DB URL from the same Settings class the app uses
(encore_gateway.config.settings) rather than duplicating connection logic
here — one source of truth for "where's the database."

Imports encore_gateway.models so Base.metadata is populated, which enables
`alembic revision --autogenerate` for future migrations (Week 2's initial
migration was hand-written instead, since this is the very first one and
autogenerate has nothing to diff against yet).
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from encore_gateway.config import settings
from encore_gateway.db import Base
from encore_gateway.models import (  # noqa: F401 - populates Base.metadata
    Event,
    IdempotencyRecord,
    Inventory,
    Order,
    Seat,
    Ticket,
    User,
    Venue,
)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
