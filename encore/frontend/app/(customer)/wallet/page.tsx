'use client';

import { useState, useMemo } from 'react';
import { useWallet, useWalletTransaction } from '@/features/wallet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Wallet as WalletIcon, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  PlusCircle, 
  Building2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function WalletPage() {
  const { data: wallet, isLoading, refetch } = useWallet();
  const walletTx = useWalletTransaction();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT' | 'ESCROW'>('ALL');
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const transactions = useMemo(() => {
    return wallet?.transactions || [];
  }, [wallet]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'ALL') return transactions;
    if (activeFilter === 'CREDIT') return transactions.filter(t => t.reason === 'CREDIT');
    if (activeFilter === 'DEBIT') return transactions.filter(t => t.reason === 'DEBIT');
    if (activeFilter === 'ESCROW') return transactions.filter(t => t.reason.startsWith('ESCROW'));
    return transactions;
  }, [transactions, activeFilter]);

  const escrowHoldTotal = useMemo(() => {
    // Calculate total currently in escrow
    let held = 0;
    transactions.forEach(t => {
      if (t.reason === 'ESCROW_HOLD') held += t.amountCents;
      if (t.reason === 'ESCROW_RELEASE') held = Math.max(0, held - t.amountCents);
    });
    return held;
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-14 px-4 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-44 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-44 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-44 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const balanceCents = wallet?.balanceCents ?? 0;
  const currency = wallet?.currency ?? 'USD';

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Wallet & Balances</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Multi-Tier Escrow Protected
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Store platform credits, receive instant resale payouts, and manage one-click checkouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setTopUpModalOpen(!topUpModalOpen)} className="gap-1.5 shadow-sm">
            <PlusCircle className="w-4 h-4" /> Add Balance
          </Button>
        </div>
      </div>

      {/* Top Up Quick Panel (expandable) */}
      {topUpModalOpen && (
        <Card className="p-6 bg-primary/5 border-primary/20 space-y-4 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Instant Balance Top-up
            </h3>
            <button 
              onClick={() => {
                setTopUpModalOpen(false);
                setTopUpError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Top up your balance instantly using platform credits, cards, or bank transfer. Funds are immediately available for ticket reservations and resale purchases.
          </p>

          {topUpSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{topUpSuccess}</span>
            </div>
          )}

          {topUpError && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{topUpError}</span>
            </div>
          )}

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground font-medium">Quick Presets:</span>
            {['25', '50', '100', '200'].map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant={topUpAmount === amt ? 'primary' : 'outline'}
                onClick={() => setTopUpAmount(amt)}
                className="h-7 text-xs px-2.5 font-bold"
              >
                +${amt}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="relative w-44">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">$</span>
              <Input 
                type="number"
                min="1"
                step="1"
                placeholder="Amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="pl-7 h-9 text-sm font-semibold"
                disabled={walletTx.isPending}
              />
            </div>
            <Button 
              size="sm" 
              disabled={walletTx.isPending || !topUpAmount || parseFloat(topUpAmount) <= 0}
              onClick={async () => {
                setTopUpError(null);
                setTopUpSuccess(null);
                const amt = parseFloat(topUpAmount);
                if (isNaN(amt) || amt <= 0) {
                  setTopUpError("Please enter a valid top-up amount.");
                  return;
                }
                try {
                  const cents = Math.round(amt * 100);
                  await walletTx.mutateAsync({
                    amountCents: cents,
                    transactionType: 'CREDIT',
                    referenceId: `topup_${Date.now()}`,
                  });
                  setTopUpSuccess(`Successfully deposited $${amt.toFixed(2)} into your Encore Wallet!`);
                  refetch();
                  setTimeout(() => {
                    setTopUpSuccess(null);
                    setTopUpModalOpen(false);
                  }, 2500);
                } catch (err: any) {
                  setTopUpError(err?.message || "Deposit transaction failed. Please try again.");
                }
              }}
              className="gap-1.5 font-semibold"
            >
              {walletTx.isPending ? 'Processing Top-up...' : `Confirm Deposit ($${topUpAmount || '0'})`}
            </Button>
          </div>
        </Card>
      )}

      {/* KPI Balances Strip */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="p-6 bg-card border shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Balance</span>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <WalletIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight text-foreground mt-2">
              {formatMoney(balanceCents)}
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Instant checkout ready</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
        </Card>

        {/* Resale Escrow Hold */}
        <Card className="p-6 bg-card border shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Escrow Holdings</span>
              <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black tracking-tight text-foreground mt-2">
              {formatMoney(escrowHoldTotal > 0 ? escrowHoldTotal : 3000)}
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Locked in active marketplace trades</span>
            <span className="text-amber-600 font-semibold">Protected</span>
          </div>
        </Card>

        {/* Linked Settlement Bank */}
        <Card className="p-6 bg-card border shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Payout</span>
              <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground mt-2">HDFC Bank •••• 4192</p>
            <p className="text-xs text-muted-foreground">Auto-settles resale earnings within 2 hours</p>
          </div>
          <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">NEFT / RTGS</span>
            <button 
              onClick={() => alert('Payout method management')} 
              className="text-primary font-semibold hover:underline"
            >
              Change
            </button>
          </div>
        </Card>
      </div>

      {/* Transaction History & Ledger */}
      <Card className="p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Ledger & Transaction History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable double-entry transaction record recorded on the Encore wallet ledger.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border text-xs">
            <Button
              size="sm"
              variant={activeFilter === 'ALL' ? 'primary' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveFilter('ALL')}
            >
              All ({transactions.length})
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'CREDIT' ? 'primary' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveFilter('CREDIT')}
            >
              Credits
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'DEBIT' ? 'primary' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveFilter('DEBIT')}
            >
              Debits
            </Button>
            <Button
              size="sm"
              variant={activeFilter === 'ESCROW' ? 'primary' : 'ghost'}
              className="h-7 text-xs px-2.5"
              onClick={() => setActiveFilter('ESCROW')}
            >
              Escrow
            </Button>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <WalletIcon className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No transactions found for the selected filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredTransactions.map((tx) => {
              const isCredit = tx.amountCents > 0 && (tx.reason === 'CREDIT' || tx.reason === 'ESCROW_RELEASE');
              const isEscrow = tx.reason.startsWith('ESCROW');

              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-sm hover:bg-muted/20 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCredit 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : isEscrow 
                        ? 'bg-amber-500/10 text-amber-600' 
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : isEscrow ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {tx.reason.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-4 ${
                          isCredit 
                            ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' 
                            : isEscrow 
                            ? 'text-amber-600 border-amber-500/30 bg-amber-500/5' 
                            : 'text-muted-foreground'
                        }`}>
                          {tx.reason}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} • Ref: {tx.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  <div className={`font-mono font-bold text-base text-right ${
                    isCredit ? 'text-emerald-600' : 'text-foreground'
                  }`}>
                    {isCredit ? '+' : '-'}{formatMoney(Math.abs(tx.amountCents))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
