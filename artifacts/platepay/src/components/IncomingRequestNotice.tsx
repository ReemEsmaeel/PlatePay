import { Bell, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { getListPaymentRequestsQueryKey, useListPaymentRequests } from '@workspace/api-client-react';

// Keep drivers informed even when they are viewing their wallet or vehicles.
// Fetch only pending requests; do not load unrelated page data in the background.
export function IncomingRequestNotice({ arabic }: { arabic: boolean }) {
  const requests = useListPaymentRequests({ status: 'pending' }, {
    query: { queryKey: getListPaymentRequestsQueryKey({ status: 'pending' }), refetchInterval: 5000, refetchOnWindowFocus: 'always', staleTime: 0 },
  });
  const count = requests.data?.filter(request => request.status === 'pending').length ?? 0;
  if (requests.isError) return <aside className="notice-banner" style={{ margin: '16px 24px 0' }} role="status">
    <Bell size={18}/>
    <span>{arabic ? 'تعذر التحقق من طلبات الدفع الجديدة.' : 'Could not check for new payment requests.'}</span>
    <button className="btn btn-quiet" onClick={() => void requests.refetch()}>{arabic ? 'إعادة المحاولة' : 'Retry'}</button>
  </aside>;
  if (!count) return null;
  return <aside className="notice-banner" style={{ margin: '16px 24px 0' }} role="status" aria-live="polite" data-testid="incoming-payment-notice">
    <Bell size={20}/>
    <div><strong>{arabic ? `لديك ${count} طلب دفع بانتظار موافقتك` : `${count} payment request${count === 1 ? '' : 's'} awaiting your approval`}</strong>
      <span>{arabic ? 'لن يتم خصم أي مبلغ دون موافقتك.' : 'No money is deducted without your approval.'}</span></div>
    <Link className="btn btn-quiet" href="/driver/requests" data-testid="review-incoming-requests">{arabic ? 'مراجعة الطلبات' : 'Review requests'}<ArrowRight size={15}/></Link>
  </aside>;
}
