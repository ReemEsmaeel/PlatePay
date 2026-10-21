import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import {
  getGetWalletQueryKey, getListTransactionsQueryKey,
  useConfirmWalletTopUp, useSimulateWalletDemoTopUp,
} from '@workspace/api-client-react';

function errorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string' ? data.error : fallback;
}

export function WalletFundingPanel({ available, unavailableReason, demoUsdCentsPerKwd, arabic }: { available: boolean; unavailableReason?: string | null; demoUsdCentsPerKwd: number; arabic: boolean }) {
  const qc = useQueryClient();
  const demoTopUp = useSimulateWalletDemoTopUp();
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
          demoTopUp.reset();
        }
        setMessage(result.status === 'completed'
          ? 'A previous test checkout was confirmed. Your wallet and transaction history have been updated.'
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
    demoTopUp.reset();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!available || demoTopUp.isPending || confirmation.isPending) return;
    const value = Number(amount);
    const fils = Math.round(value * 1000);
    if (!Number.isFinite(value) || fils < 1000 || fils > 1_000_000) return;
    demoTopUp.mutate({ data: { amountFils: fils, idempotencyKey: attempt.current } }, {
      onSuccess: result => {
        refresh();
        attempt.current = crypto.randomUUID();
        setMessage(arabic
          ? `تمت محاكاة الدفع وإضافة ${(result.amountFils / 1000).toFixed(3)} د.ك. إلى المحفظة. الرصيد الجديد ${(result.balanceFils / 1000).toFixed(3)} د.ك. لم يتم خصم أي مبلغ حقيقي.`
          : `Demo payment simulated: KWD ${(result.amountFils / 1000).toFixed(3)} credited. New balance: KWD ${(result.balanceFils / 1000).toFixed(3)}. No real payment was taken.`);
      },
    });
  };
  const returnedSession = new URLSearchParams(window.location.search).get('session_id');
  const amountFils = Math.round(Number(amount) * 1000);
  const quoteCents = Math.floor((amountFils * demoUsdCentsPerKwd + 500) / 1000);
  const validQuote = Number.isSafeInteger(amountFils) && amountFils >= 1000 && amountFils <= 1_000_000 && demoUsdCentsPerKwd > 0;
  const awaitingConfirmation = !!returnedSession && confirmation.data?.status !== 'completed' && confirmation.data?.status !== 'expired';
  return <section className="panel topup-panel">
    <div className="eyebrow">{arabic ? 'دفع تجريبي · بدون خصم حقيقي' : 'DEMO PAYMENT · NO REAL CHARGE'}</div>
    <h2>{arabic ? 'أضف رصيداً تجريبياً إلى محفظتك' : 'Add demo funds to your wallet'}</h2>
    <p>{arabic ? 'محاكاة دفع تضيف الرصيد مباشرة إلى محفظتك التجريبية. لا حاجة لبطاقة، ولن يتم خصم أي أموال حقيقية.' : 'Simulate a payment to credit your demo wallet. No card is needed and no real money is charged.'}</p>
    {!available && <p role="status">{unavailableReason || (arabic ? 'تعبئة المحفظة التجريبية غير متاحة مؤقتاً.' : 'Demo wallet top-ups are temporarily unavailable.')}</p>}
    <form onSubmit={submit}>
      <label className="field"><span>{arabic ? 'مبلغ التعبئة (د.ك)' : 'Top-up amount (KWD)'}</span><div className="currency-input">
        <input className="input" required type="number" min="1" max="1000" step="0.001" value={amount} disabled={demoTopUp.isPending || confirmation.isPending} onChange={e => changeAmount(e.target.value)} data-testid="input-topup-amount"/><span>KWD</span>
      </div></label>
      <div className="quick-amounts">{['5.000', '10.000', '20.000'].map(n => <button type="button" disabled={demoTopUp.isPending || confirmation.isPending} className={`amount-choice ${amount === n ? 'picked' : ''}`} key={n} onClick={() => changeAmount(n)}>{n}</button>)}</div>
      {validQuote && <p data-testid="demo-conversion">
        {arabic
          ? `قيمة توضيحية للمحاكاة: USD ${(quoteCents / 100).toFixed(2)} ← KWD ${(amountFils / 1000).toFixed(3)} رصيداً تجريبياً. لا يتم دفع USD أو خصم أموال حقيقية. السعر التوضيحي الثابت: 1 KWD = USD ${(demoUsdCentsPerKwd / 100).toFixed(2)} — ليس سعر صرف حقيقياً.`
          : `Simulated value: USD ${(quoteCents / 100).toFixed(2)} → KWD ${(amountFils / 1000).toFixed(3)} demo credit. No USD is paid and no real money is charged. Fixed demo rate: 1 KWD = USD ${(demoUsdCentsPerKwd / 100).toFixed(2)} — not a live exchange rate.`}
      </p>}
      <button className="btn btn-primary full-btn" disabled={!available || !validQuote || awaitingConfirmation || demoTopUp.isPending || confirmation.isPending} data-testid="button-topup">
        {demoTopUp.isPending ? (arabic ? 'جارٍ إضافة الرصيد التجريبي…' : 'Adding demo credit…') : arabic ? 'محاكاة الدفع وإضافة الرصيد' : 'Simulate payment and add credit'}<ArrowRight size={15}/>
      </button>
      {demoTopUp.isError && <p className="form-error" role="alert">{errorMessage(demoTopUp.error, 'Demo top-up could not be confirmed. Refresh your wallet before retrying.')}</p>}
    </form>
    {message && <p role="status" data-testid="topup-status">{message}</p>}
    {confirmation.isError && <p className="form-error" role="alert">{errorMessage(confirmation.error, 'Could not verify payment. Do not pay again. Check payment status shortly.')}</p>}
    {returnedSession && !confirmation.isPending && <button className="btn btn-quiet" type="button" onClick={() => verify(returnedSession)} data-testid="button-check-topup">Check payment status</button>}
  </section>;
}
