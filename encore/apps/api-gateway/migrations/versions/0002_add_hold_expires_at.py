"""Add hold_expires_at to inventory table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-29

Manual revision.
"""

from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable TIMESTAMPTZ column
    op.add_column(
        'inventory',
        sa.Column('hold_expires_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Create a partial index for the expiry worker to quickly find expired holds.
    # We only care about rows where status = 'HELD', which makes this index very small.
    op.execute(
        "CREATE INDEX ix_inventory_hold_expires_at ON inventory (hold_expires_at) "
        "WHERE status = 'HELD'"
    )


def downgrade() -> None:
    op.drop_index('ix_inventory_hold_expires_at', table_name='inventory')
    op.drop_column('inventory', 'hold_expires_at')
