import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import {
  getGetWalletQueryKey, getListTransactionsQueryKey,
  useConfirmWalletTopUp, useCreateWalletTopUpCheckout,
} from '@workspace/api-client-react';

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}

export function WalletFundingPanel({ available, unavailableReason, demoUsdCentsPerKwd, arabic }: { available: boolean; unavailableReason?: string | null; demoUsdCentsPerKwd: number; arabic: boolean }) {
  const qc = useQueryClient();
  const checkout = useCreateWalletTopUpCheckout();
  const confirmation = useConfirmWalletTopUp();
  const [amount, setAmount] = useState('10.000');
  const attempt = useRef(crypto.randomUUID());
  const checkedReturn = useRef(false);
  const [message, setMessage] = useState('');
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    void qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
  };
  const verify = (sessionId: string) => {
    setMessage('Checking the payment with Stripe. Do not pay again…');
    confirmation.mutate({ data: { sessionId } }, {
      onSuccess: result => {
        refresh();
        if (result.status === 'completed') {
          attempt.current = crypto.randomUUID();
          checkout.reset();
        }
        setMessage(result.status === 'completed'
          ? 'Test payment confirmed. Your wallet and transaction history have been updated.'
          : result.status === 'expired'
            ? 'This checkout expired. No funds were added.'
            : 'Payment is not confirmed yet. No funds have been added. Check payment status again shortly; do not pay again.');
        if (result.status !== 'pending') {
          const url = new URL(window.location.href);
          url.searchParams.delete('checkout');
          url.searchParams.delete('session_id');
          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        }
      },
    });
  };
  useEffect(() => {
    if (checkedReturn.current) return;
    checkedReturn.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'cancelled') setMessage('Checkout cancelled. No funds were added.');
    if (params.get('checkout') === 'success' && params.get('session_id')) verify(params.get('session_id')!);
  }, []);
  const changeAmount = (value: string) => {
    if (value !== amount) attempt.current = crypto.randomUUID();
    setAmount(value);
    checkout.reset();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!available || checkout.isPending || confirmation.isPending) return;
    const value = Number(amount);
    const fils = Math.round(value * 1000);
    if (!Number.isFinite(value) || fils < 1000 || fils > 1_000_000) return;
    checkout.mutate({ data: { amountFils: fils, idempotencyKey: attempt.current } }, {
      onSuccess: result => {
        // A redirect is not a credit. The server verifies Stripe before fulfillment.
        window.location.assign(result.checkoutUrl);
      },
    });
  };
  const returnedSession = new URLSearchParams(window.location.search).get('session_id');
  const amountFils = Math.round(Number(amount) * 1000);
  const quoteCents = Math.floor((amountFils * demoUsdCentsPerKwd + 500) / 1000);
  const validQuote = Number.isSafeInteger(amountFils) && amountFils >= 1000 && amountFils <= 1_000_000 && demoUsdCentsPerKwd > 0;
  const awaitingConfirmation = !!returnedSession && confirmation.data?.status !== 'completed' && confirmation.data?.status !== 'expired';
  return <section className="panel topup-panel">
    <div className="eyebrow">STRIPE · TEST MODE ONLY</div>
    <h2>{arabic ? 'أضف رصيداً تجريبياً إلى محفظتك' : 'Add test funds to your wallet'}</h2>
    <p>{arabic ? 'يتم الدفع عبر Stripe بوضع الاختبار فقط. لا تستخدم بطاقة حقيقية. يُضاف الرصيد بعد تأكيد الدفع من الخادم.' : 'Pay through Stripe test checkout only. Do not use a real card. Funds are added only after the server confirms payment.'}</p>
    {!available && <p role="status">{unavailableReason || 'Stripe test checkout is being configured or is temporarily unavailable. No funds have been added.'}</p>}
    <form onSubmit={submit}>
      <label className="field"><span>{arabic ? 'مبلغ التعبئة (د.ك)' : 'Top-up amount (KWD)'}</span><div className="currency-input">
        <input className="input" required type="number" min="1" max="1000" step="0.001" value={amount} disabled={checkout.isPending} onChange={e => changeAmount(e.target.value)} data-testid="input-topup-amount"/><span>KWD</span>
      </div></label>
      <div className="quick-amounts">{['5.000', '10.000', '20.000'].map(n => <button type="button" disabled={checkout.isPending} className={`amount-choice ${amount === n ? 'picked' : ''}`} key={n} onClick={() => changeAmount(n)}>{n}</button>)}</div>
      {validQuote && <p data-testid="demo-conversion">
        {arabic
          ? `دفع تجريبي بقيمة USD ${(quoteCents / 100).toFixed(2)} يضيف KWD ${(amountFils / 1000).toFixed(3)} إلى محفظتك التجريبية. سعر تجريبي ثابت: 1 KWD = USD ${(demoUsdCentsPerKwd / 100).toFixed(2)}، وليس سعر صرف حقيقي.`
          : `Stripe test payment: USD ${(quoteCents / 100).toFixed(2)} → KWD ${(amountFils / 1000).toFixed(3)} in demo wallet funds. Fixed demo rate: 1 KWD = USD ${(demoUsdCentsPerKwd / 100).toFixed(2)} — not a live exchange rate.`}
      </p>}
      <button className="btn btn-primary full-btn" disabled={!available || !validQuote || awaitingConfirmation || checkout.isPending || confirmation.isPending} data-testid="button-topup">
        {checkout.isPending ? 'Preparing Stripe test checkout…' : arabic ? 'متابعة إلى الدفع التجريبي' : 'Continue to test checkout'}<ArrowRight size={15}/>
      </button>
      {checkout.isError && <p className="form-error" role="alert">{errorMessage(checkout.error, 'Stripe test checkout could not be opened. No funds were added.')}</p>}
    </form>
    {message && <p role="status" data-testid="topup-status">{message}</p>}
    {confirmation.isError && <p className="form-error" role="alert">{errorMessage(confirmation.error, 'Could not verify payment. Do not pay again. Check payment status shortly.')}</p>}
    {returnedSession && !confirmation.isPending && <button className="btn btn-quiet" type="button" onClick={() => verify(returnedSession)} data-testid="button-check-topup">Check payment status</button>}
  </section>;
}
