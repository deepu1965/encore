'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface WalletTransaction {
  id: string;
  amountCents: number;
  reason: string;
  createdAt: string;
}

export interface Wallet {
  balanceCents: number;
  currency: string;
  transactions: WalletTransaction[];
}

export const walletKeys = {
  all: () => ['wallet'] as const,
};

export function useWallet() {
  return useQuery({
    queryKey: walletKeys.all(),
    queryFn: async (): Promise<Wallet> => {
      const res = await apiClient.get<any>('/api/v1/wallet');
      const d = res.data ?? {};
      const txs = (d.transactions ?? []).map((t: any) => ({
        id: t.id || String(Math.random()),
        amountCents: t.amount_cents ?? t.amountCents ?? 0,
        reason: t.reason || 'TRANSACTION',
        createdAt: t.created_at || t.createdAt || new Date().toISOString(),
      }));

      return {
        balanceCents: d.balance_cents ?? d.balanceCents ?? 0,
        currency: d.currency || 'USD',
        transactions: txs,
      };
    },
  });
}

export interface CreateWalletTransactionPayload {
  amountCents: number;
  transactionType: 'CREDIT' | 'DEBIT';
  referenceId?: string;
  idempotencyKey?: string;
}

export function useWalletTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWalletTransactionPayload) => {
      const body = {
        amount_cents: payload.amountCents,
        transaction_type: payload.transactionType,
        reference_id: payload.referenceId,
        idempotency_key: payload.idempotencyKey,
      };
      const res = await apiClient.post<any>('/api/v1/wallet/transaction', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all() });
    },
  });
}

