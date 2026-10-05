'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useSeatSelectionStore } from '@/stores/seat-selection';
import { useCheckoutStore } from '@/stores/checkout';
import { useCreateOrder, useSubmitPayment, usePaymentStatus } from '@/features/checkout';
import { useWallet, useWalletTransaction } from '@/features/wallet';
import { getWebSocketManager } from '@/lib/websocket-manager';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HoldCountdown } from '@/components/shared/hold-countdown';
import { HoldExpiredModal } from '@/components/shared/hold-expired-modal';
import { AlertCircle, CreditCard, Loader2, Wallet as WalletIcon, CheckCircle2, Plus } from 'lucide-react';

const paymentSchema = z.object({
  cardName: z.string().optional(),
  cardNumber: z.string().optional(),
  expiry: z.string().optional(),
  cvc: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const isCompletedRef = useRef(false);
  
  // Stores
  const { activeHold, holdExpiresAt, eventId, clearActiveHold, setExpired } = useSeatSelectionStore();
  const { step, setStep, idempotencyKey, ensureIdempotencyKey, orderId, setOrderId, reset: resetCheckoutStore } = useCheckoutStore();
  
  // Wallet
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const walletTx = useWalletTransaction();

  // Local state
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');
  const [isHoldExpired, setIsHoldExpired] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Form
  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
  });

  // Mutations & Queries
  const createOrder = useCreateOrder();
  const submitPayment = useSubmitPayment();

  // Polling for UNKNOWN state recovery
  const { data: recoveredPayment } = usePaymentStatus(idempotencyKey);

  // Computed Pricing
  const ticketPriceCents = activeHold?.priceCents || 8000;
  const serviceFeeCents = Math.round(ticketPriceCents * 0.05);
  const totalCents = ticketPriceCents + serviceFeeCents;

  const walletBalanceCents = walletData?.balanceCents ?? 0;
  const hasSufficientWalletBalance = walletBalanceCents >= totalCents;

  // 1. Initialize idempotency key and hold guard
  useEffect(() => {
    ensureIdempotencyKey();
  }, [ensureIdempotencyKey]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (!activeHold || !eventId)) {
      const stored = window.sessionStorage.getItem('active_hold');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.eventId) {
            useSeatSelectionStore.getState().setEvent(parsed.eventId);
            useSeatSelectionStore.getState().setActiveHold({
              holdId: parsed.holdId,
              inventoryId: parsed.inventoryId,
              eventId: parsed.eventId,
              seatId: parsed.seatId || parsed.inventoryId,
              userId: 'user_mock',
              expiresAt: parsed.expiresAt,
              holdExpiresAt: parsed.expiresAt || parsed.holdExpiresAt,
              seatNumber: parsed.seatNumber || 'A-12',
              section: parsed.section || '101',
              row: parsed.row || 'A',
              priceCents: parsed.priceCents || 8000,
              status: 'ACTIVE',
            } as any);
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
    }
    if (!activeHold || !eventId) {
      if (!isHoldExpired && !isCompletedRef.current) router.push('/explore');
    }
  }, [activeHold, eventId, router, isHoldExpired]);

  // 2. WebSocket for Hold Expiration
  useEffect(() => {
    if (!activeHold) return;
    
    const ws = getWebSocketManager();
    const channel = `hold.${activeHold.inventoryId}`;
    
    const unsub = ws.subscribe(channel, 'hold.expired', () => {
      setIsHoldExpired(true);
      setExpired();
    });

    return () => unsub();
  }, [activeHold, setExpired]);

  // 3. Background Recovery & Unknown State Polling
  useEffect(() => {
    if (step === 'unknown' || (idempotencyKey && step === 'review' && recoveredPayment)) {
      if (recoveredPayment?.status === 'SUCCESS') {
        clearActiveHold();
        resetCheckoutStore();
        router.push(`/orders/${recoveredPayment.orderId}/confirmation`);
      } else if (recoveredPayment?.status === 'FAILED') {
        setStep('review');
        setRetryMode(true);
        setErrorMsg('Previous payment attempt failed. You can safely try again.');
      }
    }
  }, [recoveredPayment, step, idempotencyKey, router, clearActiveHold, resetCheckoutStore, setStep]);

  // 4. Back-button / BeforeUnload interception during PROCESSING
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === 'processing' || step === 'unknown') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  const handleTopUp = async () => {
    setIsToppingUp(true);
    try {
      await walletTx.mutateAsync({
        amountCents: 10000, // Top up $100
        transactionType: 'CREDIT',
        referenceId: `topup_${Date.now()}`,
      });
      await refetchWallet();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to top up wallet');
    } finally {
      setIsToppingUp(false);
    }
  };

  const processPayment = async (data: PaymentFormValues) => {
    if (!activeHold || !eventId) return;

    setErrorMsg(null);
    setStep('processing');
    const idemKey = ensureIdempotencyKey();

    try {
      // 1. Create order
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const order = await createOrder.mutateAsync({
          eventId,
          inventoryIds: [activeHold.seatId || activeHold.inventoryId],
        });
        currentOrderId = order.orderId;
        setOrderId(currentOrderId);
      }

      // 2. If Wallet payment: Debit wallet first
      if (paymentMethod === 'wallet') {
        if (!hasSufficientWalletBalance) {
          setStep('review');
          setErrorMsg('Insufficient wallet balance. Please add funds or use card payment.');
          return;
        }

        try {
          await walletTx.mutateAsync({
            amountCents: totalCents,
            transactionType: 'DEBIT',
            referenceId: `order_${currentOrderId}_wallet_debit`,
          });
        } catch (wErr: any) {
          setStep('review');
          setErrorMsg(wErr?.message || 'Wallet debit failed. Please check your balance.');
          return;
        }
      }

      // 3. Submit payment
      const payment = await submitPayment.mutateAsync({
        payload: {
          orderId: currentOrderId,
          token: paymentMethod === 'wallet' ? 'tok_wallet' : 'tok_mock',
        },
        idempotencyKey: idemKey,
      });

      if (payment.status === 'SUCCESS') {
        isCompletedRef.current = true;
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('active_hold');
        }
        router.push(`/orders/${currentOrderId}/confirmation`);
        clearActiveHold();
        resetCheckoutStore();
      } else {
        setStep('review');
        setRetryMode(true);
        setErrorMsg(payment.errorMessage || 'Payment failed. Please try again.');
      }
    } catch (err: any) {
      if (err?.kind === 'conflict' || err?.status === 409) {
        setStep('review');
        setErrorMsg(err?.message || 'This seat hold expired or is no longer available. Please select another seat.');
      } else if (err?.kind === 'validation' || err?.status === 400 || err?.status === 422) {
        setStep('review');
        setErrorMsg(err?.message || 'Order validation failed. Please try again.');
      } else {
        // True network timeout or server error
        setStep('unknown');
        setErrorMsg('We are confirming your payment status with the bank. Please do not refresh.');
      }
    }
  };

  // Rendering logic
  if (isHoldExpired) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <HoldExpiredModal eventId={eventId!} />
      </div>
    );
  }

  if (!activeHold) return null;

  const isProcessing = step === 'processing';
  const isUnknown = step === 'unknown';
  const disabled = isProcessing || isUnknown;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 grid md:grid-cols-2 gap-8 relative">
      {/* Payment Form */}
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-h3 font-bold">Secure Checkout</h1>
          <p className="text-muted-foreground text-sm">Select your payment method and confirm purchase.</p>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-muted/30 rounded-xl border">
          <button
            type="button"
            onClick={() => setPaymentMethod('wallet')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
              paymentMethod === 'wallet'
                ? 'bg-background text-foreground shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <WalletIcon className="w-4 h-4 text-primary" />
            <span>Pay from Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
              paymentMethod === 'card'
                ? 'bg-background text-foreground shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Card Payment</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{isUnknown ? 'Verifying payment...' : 'Payment Notice'}</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {retryMode && !errorMsg && !isUnknown && (
          <div className="bg-primary/10 text-primary px-4 py-3 rounded-md text-sm font-medium">
            Your previous attempt was not charged. You won't be charged twice for retrying.
          </div>
        )}

        <form onSubmit={handleSubmit(processPayment)} className="space-y-5 relative">
          {paymentMethod === 'wallet' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Encore Wallet Balance</span>
                  <span className="font-mono text-lg font-bold text-foreground">
                    ${(walletBalanceCents / 100).toFixed(2)}
                  </span>
                </div>
                
                {hasSufficientWalletBalance ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Sufficient balance to complete this purchase immediately.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Need ${( (totalCents - walletBalanceCents) / 100).toFixed(2)} more to cover this order.
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTopUp}
                      disabled={isToppingUp || disabled}
                      className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      {isToppingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Top-up $100 to Wallet
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Payment will be debited instantly from your Encore balance. No card fees or foreign exchange markups.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Name on card</Label>
                <Input id="cardName" disabled={disabled} defaultValue="Alex Hunter" placeholder="Jane Doe" {...register('cardName')} />
                {errors.cardName && <p className="text-error text-xs">{errors.cardName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" disabled={disabled} defaultValue="4242 •••• •••• 4242" placeholder="4242 4242 4242 4242" {...register('cardNumber')} />
                {errors.cardNumber && <p className="text-error text-xs">{errors.cardNumber.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" disabled={disabled} defaultValue="12/28" placeholder="MM/YY" {...register('expiry')} />
                  {errors.expiry && <p className="text-error text-xs">{errors.expiry.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" disabled={disabled} defaultValue="888" placeholder="123" {...register('cvc')} />
                  {errors.cvc && <p className="text-error text-xs">{errors.cvc.message}</p>}
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={disabled || (paymentMethod === 'wallet' && !hasSufficientWalletBalance)}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUnknown && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUnknown
              ? 'Verifying...'
              : isProcessing
              ? 'Processing Payment...'
              : paymentMethod === 'wallet'
              ? `Pay $${(totalCents / 100).toFixed(2)} from Wallet`
              : `Pay $${(totalCents / 100).toFixed(2)} with Card`}
          </Button>
        </form>

        {isUnknown && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
             {/* Locks the form visually */}
          </div>
        )}
      </Card>

      {/* Order Summary & Countdown */}
      <div className="space-y-6">
        <Card className="p-6 space-y-4 bg-muted/30">
          <h2 className="font-semibold text-lg border-b pb-2">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">Reserved Seat (1x)</span>
                <p className="text-xs text-muted-foreground">
                  Sec {activeHold.section || 'General'}, Row {activeHold.row || 'A'}, Seat {activeHold.seatNumber || '1'}
                </p>
              </div>
              <span className="font-semibold">${(ticketPriceCents / 100).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Platform Processing Fee (5%)</span>
              <span>${(serviceFeeCents / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-bold text-base border-t pt-3 mt-4">
              <span>Total Amount</span>
              <span className="text-primary font-mono text-xl">${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {holdExpiresAt && (
          <Card className="p-4 flex items-center justify-between border-warning/50 bg-warning/5">
            <span className="text-sm font-medium">Time remaining to buy:</span>
            <HoldCountdown 
              expiresAt={holdExpiresAt} 
              onExpire={() => {
                setIsHoldExpired(true);
                setExpired();
              }}
              className="text-lg font-bold text-primary" 
            />
          </Card>
        )}
      </div>
    </div>
  );
}
