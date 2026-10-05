"""Add wallets and resale tables

Revision ID: 48d1e2f3a4b5
Revises: 34c19fda3b6a
Create Date: 2026-09-29 13:30:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '48d1e2f3a4b5'
down_revision: str | None = '34c19fda3b6a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Wallets table
    op.create_table(
        'wallets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('balance_cents', sa.Integer(), server_default='0', nullable=False),
        sa.Column('escrow_cents', sa.Integer(), server_default='0', nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_wallets_user_id'), 'wallets', ['user_id'], unique=True)

    # 2. Wallet Ledger table
    op.create_table(
        'wallet_ledger',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('wallet_id', sa.UUID(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column(
            'transaction_type',
            sa.Enum('CREDIT', 'DEBIT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND', name='wallet_transaction_type'),
            nullable=False,
        ),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'COMPLETED', 'FAILED', name='wallet_ledger_status'),
            server_default='COMPLETED',
            nullable=False,
        ),
        sa.Column('reference_id', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_wallet_ledger_wallet_id'), 'wallet_ledger', ['wallet_id'], unique=False)
    op.create_index(op.f('ix_wallet_ledger_reference_id'), 'wallet_ledger', ['reference_id'], unique=False)

    # 3. Resale Listings table
    op.create_table(
        'resale_listings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('ticket_id', sa.UUID(), nullable=False),
        sa.Column('seller_id', sa.UUID(), nullable=False),
        sa.Column('ask_price_cents', sa.Integer(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('ACTIVE', 'MATCHED', 'CANCELLED', name='resale_listing_status'),
            server_default='ACTIVE',
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resale_listings_event_id'), 'resale_listings', ['event_id'], unique=False)
    op.create_index(op.f('ix_resale_listings_ticket_id'), 'resale_listings', ['ticket_id'], unique=True)
    op.create_index(op.f('ix_resale_listings_seller_id'), 'resale_listings', ['seller_id'], unique=False)

    # 4. Resale Orders table
    op.create_table(
        'resale_orders',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('buyer_id', sa.UUID(), nullable=False),
        sa.Column('bid_price_cents', sa.Integer(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('ACTIVE', 'MATCHED', 'CANCELLED', name='resale_order_status'),
            server_default='ACTIVE',
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resale_orders_event_id'), 'resale_orders', ['event_id'], unique=False)
    op.create_index(op.f('ix_resale_orders_buyer_id'), 'resale_orders', ['buyer_id'], unique=False)

    # 5. Resale Trades table
    op.create_table(
        'resale_trades',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('listing_id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.UUID(), nullable=False),
        sa.Column('price_cents', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['listing_id'], ['resale_listings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['order_id'], ['resale_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_resale_trades_event_id'), 'resale_trades', ['event_id'], unique=False)
    op.create_index(op.f('ix_resale_trades_listing_id'), 'resale_trades', ['listing_id'], unique=True)
    op.create_index(op.f('ix_resale_trades_order_id'), 'resale_trades', ['order_id'], unique=True)


def downgrade() -> None:
    op.drop_table('resale_trades')
    op.drop_table('resale_orders')
    op.drop_table('resale_listings')
    op.drop_table('wallet_ledger')
    op.drop_table('wallets')

    # Drop enums
    sa.Enum(name='resale_order_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='resale_listing_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='wallet_ledger_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='wallet_transaction_type').drop(op.get_bind(), checkfirst=True)
