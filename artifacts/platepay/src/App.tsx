import { useContext, useEffect, useRef, useState, createContext, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AuthForm } from './auth/AuthForm';
import { Route, Switch, Link, Redirect, Router as WouterRouter, useLocation } from 'wouter';
import {
  useHealthCheck, useGetCurrentProfile, useCreateProfile, useListVehicles, useCreateVehicle,
  useUpdateVehicle, useDeleteVehicle, useListServices, useGetMerchantProfile, useUpdateMerchantProfile,
  useGetMerchantDashboard, useListPaymentRequests, useCreatePaymentRequest, useGetPaymentRequest,
  useApprovePaymentRequest, useRejectPaymentRequest, useGetWallet, useCreateWalletTopUpCheckout,
  useGetSpendingLimits, useUpdateSpendingLimits, useListTransactions, useGetTransactionReceipt,
  useGetAdminOverview, useListAdminAccounts, useUpdateAccountStatus, useListAdminMerchants,
  useUpdateMerchantStatus, useListAdminTransactions, useListAdminAuditLogs,
  getGetCurrentProfileQueryKey, getListVehiclesQueryKey, getGetWalletQueryKey,
  getListPaymentRequestsQueryKey, getGetPaymentRequestQueryKey, getGetSpendingLimitsQueryKey,
  getListTransactionsQueryKey, getGetTransactionReceiptQueryKey, getGetMerchantProfileQueryKey,
  getGetMerchantDashboardQueryKey, getGetAdminOverviewQueryKey, getListAdminAccountsQueryKey,
  getListAdminMerchantsQueryKey, getListAdminTransactionsQueryKey, getListAdminAuditLogsQueryKey,
  getListServicesQueryKey,
} from '@workspace/api-client-react';
import type { AdminAccount, AdminMerchant, AdminTransaction, AuditLogEntry, PaymentRequest, ServiceCategory, Transaction, UserProfile, Vehicle } from '@workspace/api-client-react';
import {
  Activity, ArrowRight, Bell, Camera, CarFront, Check, CheckCircle2,
  ChevronDown, Clock3, CreditCard, FileClock, FileText, Fuel, Gauge,
  History, LayoutDashboard, LogOut, MapPin, Plus, ScanLine, ShieldCheck, SlidersHorizontal,
  Sparkles, Store, WalletCards, X, Languages, Search, UserRound, Upload, ReceiptText, CircleAlert,
} from 'lucide-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path; }

type Locale = 'en' | 'ar';
const LocaleContext = createContext<{ locale: Locale; toggle: () => void }>({ locale: 'en', toggle: () => undefined });
const useLocale = () => useContext(LocaleContext);
const text = (locale: Locale, en: string, ar: string) => locale === 'ar' ? ar : en;
const arabicNav: Record<string,string> = {
  Overview:'نظرة عامة', Vehicles:'المركبات', Wallet:'المحفظة', 'Pending requests':'الطلبات المعلقة',
  'Spending limits':'حدود الإنفاق', 'Transactions & receipts':'المعاملات والإيصالات',
  'New request':'طلب جديد', 'Request history':'سجل الطلبات', 'Business profile':'ملف النشاط التجاري',
  Accounts:'الحسابات', 'Merchant verification':'التحقق من التجار', Transactions:'المعاملات', 'Audit log':'سجل التدقيق',
};
const arabicTitle: Record<string,string> = {
  Overview:'نظرة عامة', Vehicles:'المركبات', Wallet:'المحفظة', 'Pending requests':'الطلبات المعلقة',
  'Spending limits':'حدود الإنفاق', 'Transactions & receipts':'المعاملات والإيصالات',
  'New payment request':'طلب دفع جديد', 'Request history':'سجل الطلبات', 'Business profile':'ملف النشاط التجاري',
  Accounts:'الحسابات', 'Merchant verification':'التحقق من التجار', 'Platform transactions':'معاملات المنصة', 'Audit log':'سجل التدقيق',
};
const money = (fils?: number) => `KD ${((fils ?? 0) / 1000).toLocaleString('en-KW', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
const categoryLabel = (category?: string | null) => (category ?? 'service').replaceAll('_', ' ').replace(/\b\w/g, (s) => s.toUpperCase());
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString('en-KW', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const invalid = (qc: ReturnType<typeof useQueryClient>, ...keys: readonly (readonly unknown[])[]) => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));

function Brand({ dark = false }: { dark?: boolean }) {
  return <div className={`brand ${dark ? 'brand-light' : ''}`} style={{display:'flex',alignItems:'center',gap:10,fontWeight:800,letterSpacing:'-.04em',fontSize:18}}>
    <span style={{width:31,height:31,borderRadius:9,background:'#078968',display:'grid',placeItems:'center',color:'white'}}><ScanLine size={19}/></span>
    <span>Plate<span style={{color:'#12a77d'}}>Pay</span></span>
  </div>;
}

function LanguageToggle() {
  const { locale, toggle } = useLocale();
  return <button className="language-toggle" data-testid="button-language" onClick={toggle} aria-label="Switch language"><Languages size={15}/><span>{locale === 'en' ? 'EN' : 'عربي'}</span><ChevronDown size={12}/></button>;
}

function SignInPage() {
  const { locale } = useLocale();
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();
  return <AuthFrame><AuthForm mode="sign-in" locale={locale} onSubmit={async data => { await signIn(data); setLocation('/'); }}/></AuthFrame>;
}
function SignUpPage() {
  const { locale } = useLocale();
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  return <AuthFrame><AuthForm mode="sign-up" locale={locale} onSubmit={async data => { await register({ ...data, displayName: data.displayName ?? '' }); setLocation('/onboarding'); }}/></AuthFrame>;
}
function AuthFrame({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  return <main className="auth-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div className="auth-note"><Brand dark/><div className="auth-title">{text(locale, 'A clearer way to pay on the move.', 'طريقة أوضح للدفع أثناء التنقل.')}</div><p>{text(locale, 'Your plate identifies your vehicle. You stay in control of every payment.', 'تعرّف لوحتك مركبتك، وتبقى أنت المتحكم في كل دفعة.')}</p><div className="demo-pill"><span className="pulse-dot"/> {text(locale, 'TEST MODE · No live payments', 'وضع تجريبي · لا توجد مدفوعات حقيقية')}</div></div>
    <div className="auth-card">{children}</div>
    <style>{`.auth-page{min-height:100dvh;display:grid;grid-template-columns:minmax(280px,1fr) minmax(360px,1fr);background:#f4f7fa;align-items:center;padding:6vw;gap:6vw}.auth-note{max-width:460px}.auth-title{font-size:clamp(32px,4vw,54px);font-weight:800;line-height:1.08;letter-spacing:-.055em;margin-top:42px;color:#102b3a}.auth-note p{color:#60727d;line-height:1.8;max-width:390px}.auth-card{display:flex;justify-content:center}.demo-pill{margin-top:26px;display:inline-flex;align-items:center;gap:8px;padding:8px 11px;background:#e6f5ef;color:#14654f;border-radius:99px;font-size:11px;font-weight:800}.pulse-dot{width:7px;height:7px;border-radius:50%;background:#0aa277}@media(max-width:760px){.auth-page{display:flex;flex-direction:column;justify-content:center;padding:28px 16px;gap:26px}.auth-note{width:100%;max-width:440px}.auth-title{font-size:32px;margin-top:20px}.auth-note p{margin:10px 0}.demo-pill{margin-top:8px}}`}</style>
  </main>;
}

function Landing({ accountError, retryAccount }: { accountError?: unknown; retryAccount?: () => void } = {}) {
  const { locale } = useLocale();
  const health = useHealthCheck();
  const { isSignedIn } = useAuth();
  const [loc, setLoc] = useLocation();
  const checkState = health.isLoading ? 'Checking API' : health.isError ? 'API unavailable' : `API ${health.data?.status ?? 'connected'}`;
  return <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="landing-nav"><Link href="/" className="brand-link"><Brand/></Link><nav className="landing-links"><a href="#how">{text(locale,'How it works','كيف تعمل')}</a><a href="#services">{text(locale,'For drivers & merchants','للسائقين والتجار')}</a></nav><div className="landing-actions"><LanguageToggle/><button className="btn btn-quiet signin-link" data-testid="link-sign-in" onClick={() => setLoc(isSignedIn ? '/onboarding' : '/sign-in')}>{isSignedIn ? text(locale,'Open portal','افتح البوابة') : text(locale,'Sign in','دخول')}</button><button className="btn btn-primary" data-testid="link-sign-up" onClick={() => setLoc('/sign-up')}>{text(locale,'Create account','إنشاء حساب')}<ArrowRight size={15}/></button></div></header>
    {accountError != null && retryAccount && <QueryError error={accountError} retry={retryAccount}/>}
    <section className="landing-hero">
      <div className="hero-grid"/><div className="landing-hero-inner">
        <div className="hero-copy fade-up"><div className="eyebrow" style={{color:'#75dfc0'}}>{text(locale,'PLATEPAY · KUWAIT','بليت باي · الكويت')}</div><h1 className="hero-title">{text(locale,'Your plate.\nYour call.','لوحتك.\nقرارك.')}</h1><p>{text(locale,'A considered way to handle vehicle payments. Merchants send a request, you review it, and only you decide what happens next.','طريقة واضحة لإدارة مدفوعات المركبة. يرسل التاجر طلباً، تراجعه، وأنت وحدك تقرر ما يحدث.')}</p><div className="hero-buttons"><button className="btn btn-primary" onClick={() => setLoc('/sign-up')} data-testid="button-get-started">{text(locale,'Get started','ابدأ الآن')}<ArrowRight size={16}/></button><a className="btn btn-outline-light" href="#how" data-testid="link-how-it-works">{text(locale,'See how it works','اكتشف آلية العمل')}</a></div><div className="hero-trust"><span><ShieldCheck size={16}/> {text(locale,'Driver approval required','موافقة السائق مطلوبة')}</span><span><Activity size={16}/> {checkState}</span></div></div>
        <div className="hero-visual fade-up"><div className="visual-top"><span><span className="live-dot"/> {text(locale,'PLATE REVIEW · TEST MODE','مراجعة اللوحة · وضع تجريبي')}</span><span className="mini-chip">KUWAIT · KWD</span></div><div className="viewfinder"><div className="reticle reticle-a"/><div className="reticle reticle-b"/><div className="reticle reticle-c"/><div className="reticle reticle-d"/><div className="car-silhouette"><div className="car-roof"/><div className="car-body"/><div className="wheel left"/><div className="wheel right"/></div><div className="scan-line"/></div><div className="plate-preview"><div className="plate-country">KUWAIT<br/>الكويت</div><strong>٧ · ٨٩٤٢</strong><span className="match-label"><CheckCircle2 size={13}/> REVIEW</span></div><div className="request-preview"><div><span className="eyebrow">REQUEST FOR APPROVAL</span><h3>Seaside Drive‑Thru</h3><p>Vehicle plate · review before paying</p></div><b>KD 3.450</b></div><div className="visual-disclaimer">{text(locale,'Illustrative test-mode interface · recognition never charges automatically','واجهة توضيحية · التعرّف لا ينفذ الدفع تلقائياً')}</div></div>
      </div>
      <div className="hero-bottom"><span><span className="status status-approved">Driver-led</span> {text(locale,'Every request waits for your approval','كل طلب ينتظر موافقتك')}</span><span><span className="status status-pending">KWD</span> {text(locale,'Three decimal places, always','ثلاث منازل عشرية دائماً')}</span><span className="api-health" data-testid="health-status"><i className={health.isError ? 'health-down' : ''}/>{checkState}</span></div>
    </section>
    <section className="section services-section" id="services"><div className="section-head"><div><div className="eyebrow">{text(locale,'MADE FOR THE MOMENTS IN BETWEEN','للحظات اليومية على الطريق')}</div><h2>{text(locale,'Small stops. Clear decisions.','توقفات قصيرة. قرارات واضحة.')}</h2></div><p>{text(locale,'PlatePay is designed around the everyday places your car takes you—not around automatic charges.','صُممت بليت باي للأماكن التي تقصدها بسيارتك، لا للخصم التلقائي.')}</p></div><div className="service-grid">{[
      [Fuel,'01','Fuel & convenience','الوقود والمتاجر','Review a service request linked to your plate.'],[Store,'02','Drive-through','خدمة السيارات','See the amount and merchant before you approve.'],[CarFront,'03','Parking','مواقف السيارات','Keep your vehicle details and payment history together.'],[Gauge,'04','Vehicle services','خدمات المركبات','One wallet view for your KWD account activity.']
    ].map(([Icon,num,en,ar,desc]: any) => <article className="service-card" key={num}><div className="service-card-head"><span className="service-icon"><Icon size={19}/></span><span className="service-number">{num}</span></div><h3>{text(locale,en,ar)}</h3><p>{text(locale,desc,desc)}</p><span className="service-rule"/></article>)}</div></section>
    <section className="steps-section" id="how"><div className="steps-intro"><div className="eyebrow" style={{color:'#71d9b9'}}>{text(locale,'CLEAR BY DESIGN','وضوح في كل خطوة')}</div><h2>{text(locale,'You’re in the driver’s seat.','أنت دائماً في مقعد القيادة.')}</h2><p>{text(locale,'Recognition can identify a plate. It cannot authorize a payment. That decision belongs to you.','يمكن للتعرّف تحديد اللوحة، لكنه لا يستطيع اعتماد الدفع. القرار لك.')}</p></div><div className="steps-list">{[[ '01','Register your plate','سجّل لوحتك','Add the vehicles you want associated with your account.'],['02','A merchant sends a request','يرسل التاجر طلباً','The request shows the service, amount and plate for your review.'],['03','Review and decide','راجع واتخذ القرار','Approve explicitly, or reject. Nothing is charged by recognition alone.'],['04','Keep a clear record','احتفظ بسجل واضح','Review wallet activity, transaction history and receipts in one place.']].map(([n,en,ar,desc])=><article className="step-row" key={n}><span className="step-index">{n}</span><div><h3>{text(locale,en,ar)}</h3><p>{text(locale,desc,desc)}</p></div><ArrowRight size={17}/></article>)}</div></section>
    <section className="principles-section"><div className="principle-symbol"><ShieldCheck size={30}/></div><div><div className="eyebrow">{text(locale,'A SIMPLE PROMISE','وعد بسيط')}</div><h2>{text(locale,'Nothing moves without your say-so.','لا تتم أي عملية دون موافقتك.')}</h2><p>{text(locale,'Plate recognition is used to identify a vehicle for review. It does not create consent, authorize a charge, or replace your approval.','يُستخدم التعرّف على اللوحة لتحديد المركبة للمراجعة فقط. ولا ينشئ موافقة أو يعتمد خصماً.')}</p></div><div className="principle-stamp"><span>01</span><small>DRIVER<br/>CONTROL</small></div></section>
    <section className="mode-section"><div><div className="eyebrow">{text(locale,'BUILT FOR A CAREFUL START','بداية مدروسة')}</div><h2>{text(locale,'A working portal, clearly in test mode.','بوابة فعلية، مع توضيح الوضع التجريبي.')}</h2><p>{text(locale,'Explore driver, merchant and administration tools. Available data and payment actions depend on your connected account and platform setup.','استكشف أدوات السائق والتاجر والإدارة. يعتمد توفر البيانات والدفع على حسابك وإعداد المنصة.')}</p></div><div className="mode-card"><span className="mode-indicator"><i/> DEMO / TEST MODE</span><h3>{text(locale,'No live merchant acceptance is implied.','لا يعني ذلك قبولاً تجارياً مباشراً.')}</h3><p>{text(locale,'Wallet top-ups open the configured checkout experience; they are not initiated by browser-side webhook calls.','تفتح تعبئة المحفظة تجربة الدفع المُعدة، ولا تُنفذ عبر استدعاءات webhook من المتصفح.')}</p><button className="btn btn-primary" onClick={()=>setLoc('/sign-up')} data-testid="button-register-bottom">{text(locale,'Create your PlatePay account','أنشئ حساب بليت باي')}<ArrowRight size={15}/></button></div></section>
    <footer className="landing-footer"><Brand/><span>© PlatePay · Kuwait · {text(locale,'Test-mode experience','تجربة وضع تجريبي')}</span><div><a href="#how">{text(locale,'How it works','كيف تعمل')}</a><button onClick={()=>setLoc('/sign-in')}>{text(locale,'Sign in','دخول')}</button></div></footer>
  </div>;
}

function PageLoading() {
  return <div className="content"><div className="skeleton" style={{height:25,width:210,marginBottom:12}}/><div className="skeleton" style={{height:100,width:'100%',marginBottom:18}}/><div className="skeleton" style={{height:260,width:'100%'}}/></div>;
}
function QueryError({ retry, error, showHome = false }: { retry: () => void; error?: unknown; showHome?: boolean }) {
  const { locale } = useLocale();
  const failure = error as { status?: number; data?: { error?: unknown } } | undefined;
  const unavailable = failure?.status === 503;
  const databaseUnavailable = unavailable && typeof failure?.data?.error === 'string' && failure.data.error.includes('database is unavailable');
  return <div className="empty-state" role="alert" data-testid="error-query"><CircleAlert size={24}/><strong>{databaseUnavailable ? text(locale,'PlatePay’s database is unavailable.','قاعدة بيانات بليت باي غير متاحة.') : unavailable ? text(locale,'PlatePay is temporarily unavailable.','بليت باي غير متاح مؤقتاً.') : text(locale,'We couldn’t load this information.','تعذر تحميل هذه المعلومات.')}</strong><span>{databaseUnavailable ? text(locale,'The website is running, but account and payment features need a working MongoDB connection.','الموقع يعمل، لكن ميزات الحساب والدفع تتطلب اتصالاً بقاعدة بيانات MongoDB.') : unavailable ? text(locale,'This is a server-side issue, not a problem with your internet connection.','هذه مشكلة في الخادم وليست مشكلة في اتصالك بالإنترنت.') : text(locale,'Please try again. If the problem continues, the service may be unavailable.','حاول مرة أخرى. إذا استمرت المشكلة، فقد تكون الخدمة غير متاحة.')}</span>{databaseUnavailable && <span>{text(locale,'Retry after the database connection is restored. No account changes were saved by this failed request.','أعد المحاولة بعد استعادة الاتصال بقاعدة البيانات. لم يحفظ هذا الطلب الفاشل أي تغييرات في الحساب.')}</span>}<button className="btn btn-quiet" onClick={retry} data-testid="button-retry">{text(locale,'Try again','أعد المحاولة')}</button>{showHome && <Link className="btn btn-quiet" href="/">{text(locale,'Back to homepage','العودة إلى الصفحة الرئيسية')}</Link>}</div>;
}
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state" data-testid="empty-state"><span className="empty-icon"><FileText size={21}/></span><strong>{title}</strong><span>{detail}</span>{action}</div>;
}
function Status({ value }: { value?: string | null }) {
  const normalized = value ?? 'unknown';
  return <span className={`status status-${normalized}`} data-testid={`status-${normalized}`}>{normalized.replaceAll('_',' ')}</span>;
}
function Field({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return <label className="form-field" data-testid={testId}><span className="field-label">{label}</span>{children}</label>;
}

const driverLinks = [
  ['/driver',LayoutDashboard,'Overview'],['/driver/vehicles',CarFront,'Vehicles'],['/driver/wallet',WalletCards,'Wallet'],['/driver/requests',Bell,'Pending requests'],['/driver/limits',SlidersHorizontal,'Spending limits'],['/driver/transactions',History,'Transactions & receipts'],
] as const;
const merchantLinks = [['/merchant',LayoutDashboard,'Overview'],['/merchant/request',ScanLine,'New request'],['/merchant/history',FileClock,'Request history'],['/merchant/transactions',ReceiptText,'Transactions'],['/merchant/profile',Store,'Business profile']] as const;
const adminLinks = [['/admin',LayoutDashboard,'Overview'],['/admin/accounts',UserRound,'Accounts'],['/admin/merchants',Store,'Merchant verification'],['/admin/transactions',CreditCard,'Transactions'],['/admin/audit',FileClock,'Audit log']] as const;

function AppShell({ children, profile }: { children: ReactNode; profile: UserProfile }) {
  const { locale } = useLocale();
  const { signOut } = useAuth();
  const [signOutError, setSignOutError] = useState(false);
  const [, setLocation] = useLocation();
  const items = profile.role === 'admin' ? adminLinks : profile.role === 'merchant' ? merchantLinks : driverLinks;
  const targetRoot = profile.role === 'admin' ? '/admin' : profile.role === 'merchant' ? '/merchant' : '/driver';
  const displayPath = typeof window !== 'undefined' ? stripBase(window.location.pathname) : targetRoot;
  const nav = () => items.map(([href, Icon, label]) => <Link href={href} className={`nav-item ${displayPath === href ? 'active' : ''}`} key={href} data-testid={`nav-${href.replaceAll('/','-').replace(/^-/, '')}`}><Icon size={17}/><span>{text(locale,label,arabicNav[label]||label)}</span></Link>);
  return <div className="app-shell" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <aside className="sidebar"><Link href={targetRoot} className="brand-link"><Brand dark/></Link><div className="workspace-label">{profile.role.toUpperCase()} PORTAL</div><div className="account-context"><span className="account-dot"><Activity size={17}/></span><div><small>{text(locale,'ACTIVE ACCOUNT','الحساب النشط')}</small><strong>{profile.displayName || profile.email}</strong></div></div><nav className="sidebar-nav">{nav()}</nav><div className="sidebar-footer"><span className="demo-pill"><i/> TEST MODE · KWD</span><small>{text(locale,'Approval is always explicit','الموافقة دائماً صريحة')}</small></div></aside>
    <div className="main-area"><header className="topbar"><div className="topbar-brand"><Link href={targetRoot} className="brand-link"><Brand/></Link><span className="portal-label">{profile.role} portal</span></div><div className="topbar-tools"><span className="status status-pending">TEST MODE</span><LanguageToggle/><span className="user-avatar">{(profile.displayName || 'P').slice(0,1).toUpperCase()}</span><span className="user-name desktop-only">{profile.displayName || profile.email}</span><button className="icon-button" aria-label="Sign out" onClick={()=>{setSignOutError(false);void signOut().then(()=>setLocation('/')).catch(()=>setSignOutError(true));}} data-testid="button-sign-out"><LogOut size={17}/></button></div></header>{signOutError&&<p className="form-error" role="alert">{text(locale,'Sign-out could not complete. Please retry when the service is available.','تعذر تسجيل الخروج. أعد المحاولة عندما تتوفر الخدمة.')}</p>}<nav className="sidemobile">{nav()}</nav>{children}</div>
  </div>;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</div>;
}
function Metric({ label, value, note, icon: Icon, accent }: { label: string; value: string; note?: string; icon: any; accent?: boolean }) {
  return <div className="metric-card panel"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent ? 'green' : ''}`}><Icon size={17}/></span></div><strong className="metric-value">{value}</strong>{note && <small>{note}</small>}</div>;
}
function EmptyRows({ loading, error, empty, retry, children }: { loading: boolean; error: boolean; empty: boolean; retry: () => void; children: ReactNode }) {
  if (loading) return <div className="table-skeleton"><div className="skeleton" style={{height:18,width:'30%'}}/><div className="skeleton" style={{height:110,width:'100%',marginTop:15}}/></div>;
  if (error) return <QueryError retry={retry}/>;
  if (empty) return <Empty title="Nothing here yet" detail="As your account is used, records will appear here." />;
  return <>{children}</>;
}

function Onboarding() {
  const { locale } = useLocale();
  const { account } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createProfile = useCreateProfile();
  const [role,setRole] = useState<'driver'|'merchant'>('driver');
  const [name,setName] = useState(account?.displayName ?? '');
  const submit = (e:FormEvent) => {e.preventDefault();createProfile.mutate({data:{role,displayName:name.trim()}},{onSuccess:profile=>{qc.setQueryData(getGetCurrentProfileQueryKey(),profile);setLocation(profile.role==='merchant'?'/merchant':'/driver')}});};
  return <div className="onboarding-wrap"><form className="onboarding-card panel" onSubmit={submit}><div className="onboarding-mark"><ScanLine size={24}/></div><div className="eyebrow">YOUR PLATEPAY PROFILE</div><h1>{text(locale,'Let’s set up your account.','لنُعدّ حسابك.')}</h1><p>{text(locale,'Choose how you’ll use PlatePay. Your role is stored in your PlatePay profile.','اختر طريقة استخدام بليت باي. سيتم حفظ دورك في ملفك الشخصي.')}</p>
    <Field label={text(locale,'Display name','الاسم المعروض')}><input className="input" data-testid="input-display-name" required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></Field>
    <div className="role-options"><button type="button" className={`role-option ${role==='driver'?'selected':''}`} onClick={()=>setRole('driver')} data-testid="role-driver"><CarFront size={20}/><b>{text(locale,'Driver','سائق')}</b><span>{text(locale,'Register plates and approve each request.','سجّل لوحاتك ووافق على كل طلب.')}</span></button><button type="button" className={`role-option ${role==='merchant'?'selected':''}`} onClick={()=>setRole('merchant')} data-testid="role-merchant"><Store size={20}/><b>{text(locale,'Merchant','تاجر')}</b><span>{text(locale,'Create payment requests for driver review.','أنشئ طلبات دفع لمراجعة السائق.')}</span></button></div>
    <div className="info-note"><ShieldCheck size={16}/>{text(locale,'Administrator access is managed server-side and cannot be selected here.','تُدار صلاحيات الإدارة من الخادم ولا يمكن اختيارها هنا.')}</div><button className="btn btn-primary full-btn" disabled={createProfile.isPending} data-testid="button-create-profile">{createProfile.isPending?'Saving…':text(locale,'Create profile','إنشاء الملف الشخصي')}<ArrowRight size={15}/></button>{createProfile.isError&&<p className="form-error" role="alert">Could not create your profile. Please try again.</p>}
    </form></div>;
}

function PortalPage({ profile, section }: { profile: UserProfile; section: string }) {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const driver = profile.role === 'driver';
  const merchant = profile.role === 'merchant';
  const admin = profile.role === 'admin';
  const titleFor = section==='vehicles'?'Vehicles':section==='wallet'?'Wallet':section==='requests'?'Pending requests':section==='limits'?'Spending limits':section==='transactions'?'Transactions & receipts':section==='new-request'?'New payment request':section==='history'?'Request history':section==='profile'?'Business profile':section==='accounts'?'Accounts':section==='merchants'?'Merchant verification':section==='admin-transactions'?'Platform transactions':section==='audit'?'Audit log':'Overview';

  const vehicleQ = useListVehicles({query:{queryKey:getListVehiclesQueryKey(),enabled:driver}});
  const walletQ = useGetWallet({query:{queryKey:getGetWalletQueryKey(),enabled:driver,refetchInterval:5000,refetchOnWindowFocus:true}});
  const requestQ = useListPaymentRequests(undefined,{query:{queryKey:getListPaymentRequestsQueryKey(),enabled:driver||merchant,refetchInterval:5000}});
  const limitQ = useGetSpendingLimits({query:{queryKey:getGetSpendingLimitsQueryKey(),enabled:driver}});
  const transactionQ = useListTransactions(undefined,{query:{queryKey:getListTransactionsQueryKey(),enabled:driver||merchant,refetchOnWindowFocus:true}});
  const merchantProfileQ = useGetMerchantProfile({query:{queryKey:getGetMerchantProfileQueryKey(),enabled:merchant}});
  const merchantDashQ = useGetMerchantDashboard({query:{queryKey:getGetMerchantDashboardQueryKey(),enabled:merchant}});
  const servicesQ = useListServices(undefined,{query:{queryKey:getListServicesQueryKey(),enabled:merchant}});
  const adminOverviewQ = useGetAdminOverview({query:{queryKey:getGetAdminOverviewQueryKey(),enabled:admin}});
  const accountsQ = useListAdminAccounts(undefined,{query:{queryKey:getListAdminAccountsQueryKey(),enabled:admin}});
  const merchantsQ = useListAdminMerchants(undefined,{query:{queryKey:getListAdminMerchantsQueryKey(),enabled:admin}});
  const adminTransactionsQ = useListAdminTransactions(undefined,{query:{queryKey:getListAdminTransactionsQueryKey(),enabled:admin}});
  const auditQ = useListAdminAuditLogs({query:{queryKey:getListAdminAuditLogsQueryKey(),enabled:admin}});
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const topUp = useCreateWalletTopUpCheckout();
  const updateLimits = useUpdateSpendingLimits();
  const createRequest = useCreatePaymentRequest();
  const approveRequest = useApprovePaymentRequest();
  const rejectRequest = useRejectPaymentRequest();
  const updateMerchantProfile = useUpdateMerchantProfile();
  const updateAccountStatus = useUpdateAccountStatus();
  const updateMerchantStatus = useUpdateMerchantStatus();
  const [plate,setPlate] = useState('');
  const [nickname,setNickname] = useState('');
  const [editingVehicle,setEditingVehicle] = useState<Vehicle|null>(null);
  const [topUpAmount,setTopUpAmount] = useState('10.000');
  const [dailyCap,setDailyCap] = useState('');
  const [transactionCap,setTransactionCap] = useState('');
  const [receiptId,setReceiptId] = useState('');
  const [requestDetailId,setRequestDetailId] = useState('');
  const [scanPlate,setScanPlate] = useState('');
  const [scanImage,setScanImage] = useState('');
  const [scanFile,setScanFile] = useState<File|null>(null);
  const [scanZoom,setScanZoom] = useState(1);
  const [ocrStatus,setOcrStatus] = useState('');
  const [cameraOn,setCameraOn] = useState(false);
  const [locationPending,setLocationPending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream|null>(null);
  const requestDetailQ = useGetPaymentRequest(requestDetailId,{query:{queryKey:getGetPaymentRequestQueryKey(requestDetailId),enabled:!!requestDetailId}});
  const receiptQ = useGetTransactionReceipt(receiptId,{query:{queryKey:getGetTransactionReceiptQueryKey(receiptId),enabled:!!receiptId}});
  useEffect(()=>()=>{cameraStream.current?.getTracks().forEach(t=>t.stop())},[]);
  useEffect(()=>{
    if(cameraOn && videoRef.current && cameraStream.current) {
      videoRef.current.srcObject = cameraStream.current;
    }
  },[cameraOn]);
  useEffect(()=>{ if(limitQ.data){setDailyCap((limitQ.data.dailyLimitFils/1000).toFixed(3));setTransactionCap((limitQ.data.perTransactionLimitFils/1000).toFixed(3));}},[limitQ.data?.dailyLimitFils,limitQ.data?.perTransactionLimitFils]);
  const categoryOptions: ServiceCategory[] = ['drive_thru','fuel','parking','car_wash','other'];
  const retry = ()=>{[vehicleQ,walletQ,requestQ,limitQ,transactionQ,merchantProfileQ,merchantDashQ,servicesQ,adminOverviewQ,accountsQ,merchantsQ,adminTransactionsQ,auditQ].forEach(q=>q.refetch())};
  const callOcr = async (file:File, zoom:number) => {
    setOcrStatus('Reading the plate…');
    try {
      const image = new Image(); const url = URL.createObjectURL(file);
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Image unavailable'));image.src=url;});
      const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d');
      if(!ctx) throw new Error('Canvas unavailable');
      const cropWidth=image.width/zoom,cropHeight=image.height/Math.max(1,zoom);
      const sx=(image.width-cropWidth)/2,sy=(image.height-cropHeight)/2;
      canvas.width=cropWidth;canvas.height=cropHeight;ctx.drawImage(image,sx,sy,cropWidth,cropHeight,0,0,cropWidth,cropHeight);
      const { createWorker } = await import('tesseract.js');
      const worker=await createWorker(['eng','ara']);
      let recognized = '';
      try { recognized = (await worker.recognize(canvas)).data.text; }
      finally { await worker.terminate(); URL.revokeObjectURL(url); }
      const candidate=recognized.toUpperCase().split(/\r?\n/).map((line:string)=>line.replace(/KUWAIT|الكويت/g,'').replace(/[^A-Z0-9\u0600-\u06FF -]/g,'').trim()).filter((line:string)=>/[0-9٠-٩۰-۹]/.test(line)).sort((a:string,b:string)=>b.length-a.length)[0] ?? '';
      setScanPlate(candidate);setOcrStatus(candidate?'Plate text found. Review and correct it before submitting.':'No clear plate text found. Enter the plate manually.');
    } catch { setOcrStatus('Could not read the image. Enter the plate manually.'); }
  };
  const onImage = (file?:File) => { if(!file)return; setScanFile(file);setScanImage(URL.createObjectURL(file));setOcrStatus('Photo ready. Adjust crop, then read the plate.'); };
  const startCamera = async () => { try{cameraStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});setCameraOn(true);}catch{setOcrStatus('Camera access is unavailable. Upload a photo instead.');} };
  const captureStill = () => { const video=videoRef.current;if(!video?.videoWidth||!video.videoHeight){setOcrStatus('Wait for the camera image before capturing.');return;}const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d')?.drawImage(video,0,0);c.toBlob(blob=>{if(blob)onImage(new File([blob],'plate-capture.jpg',{type:'image/jpeg'}));},'image/jpeg');cameraStream.current?.getTracks().forEach(t=>t.stop());cameraStream.current=null;setCameraOn(false); };
  const submitRequest = (e:FormEvent<HTMLFormElement>) => {e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);const amount=Number(fd.get('amount'));const plateText=String(fd.get('plate')||'').trim();if(!plateText||!Number.isFinite(amount)||amount<=0)return;createRequest.mutate({data:{plateNumber:plateText,amountFils:Math.round(amount*1000),serviceCategory:String(fd.get('category')) as ServiceCategory,description:String(fd.get('description')||'')||undefined,orderReference:String(fd.get('reference')||'')||undefined}},{onSuccess:()=>{invalid(qc,getListPaymentRequestsQueryKey(),getGetMerchantDashboardQueryKey());form.reset();setScanImage('');setScanFile(null);setScanPlate('');setLocation('/merchant/history');}});};
  const approve = (req:PaymentRequest) => {
    if(locationPending||approveRequest.isPending)return;
    if(!window.confirm(`Approve ${money(req.amountFils)} for ${req.merchantName}? Your current phone location will be checked.`))return;
    if(!navigator.geolocation){window.alert('Location access is required to approve this payment.');return;}
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(position=>{
      setLocationPending(false);
      approveRequest.mutate({requestId:req.id,data:{latitude:position.coords.latitude,longitude:position.coords.longitude,idempotencyKey:`platepay-${req.id}`}},{onSuccess:()=>{invalid(qc,getListPaymentRequestsQueryKey(),getGetPaymentRequestQueryKey(req.id),getGetWalletQueryKey(),getListTransactionsQueryKey(),getGetSpendingLimitsQueryKey());setRequestDetailId('');}});
    },()=>{
      setLocationPending(false);
      window.alert('Unable to verify your phone location. Allow location access and try again. No payment was processed.');
    },{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  };
  const reject = (req:PaymentRequest) => {if(!window.confirm(`Reject this request from ${req.merchantName}?`))return;rejectRequest.mutate({requestId:req.id,data:{reason:'Declined by driver'}},{onSuccess:()=>{invalid(qc,getListPaymentRequestsQueryKey(),getGetPaymentRequestQueryKey(req.id));setRequestDetailId('');}});};
  const saveVehicle = (e:FormEvent) => {e.preventDefault();if(editingVehicle){updateVehicle.mutate({vehicleId:editingVehicle.id,data:{plateNumber:plate.trim(),nickname:nickname||null}},{onSuccess:()=>{invalid(qc,getListVehiclesQueryKey());setEditingVehicle(null);setPlate('');setNickname('');}});}else{createVehicle.mutate({data:{plateNumber:plate.trim(),nickname:nickname||undefined}},{onSuccess:()=>{invalid(qc,getListVehiclesQueryKey());setPlate('');setNickname('');}});}};
  const setVehicleActive = (v:Vehicle) => {if(window.confirm(`Deactivate ${v.plateNumber}?`))deleteVehicle.mutate({vehicleId:v.id},{onSuccess:()=>invalid(qc,getListVehiclesQueryKey())});};
  const beginEdit=(v:Vehicle)=>{setEditingVehicle(v);setPlate(v.plateNumber);setNickname(v.nickname??'');};
  const topUpSubmit=(e:FormEvent)=>{e.preventDefault();topUp.mutate({data:{amountFils:Math.round(Number(topUpAmount)*1000)}},{onSuccess:r=>{if(r.checkoutUrl)window.location.assign(r.checkoutUrl);invalid(qc,getGetWalletQueryKey(),getListTransactionsQueryKey());}});};
  const saveLimit=(e:FormEvent)=>{e.preventDefault();updateLimits.mutate({data:{dailyLimitFils:Math.round(Number(dailyCap)*1000),perTransactionLimitFils:Math.round(Number(transactionCap)*1000)}},{onSuccess:()=>invalid(qc,getGetSpendingLimitsQueryKey())});};
  const approveStatus=(merchantId:string,verificationStatus:'verified'|'rejected')=>updateMerchantStatus.mutate({merchantId,data:{verificationStatus}},{onSuccess:()=>{invalid(qc,getListAdminMerchantsQueryKey(),getGetAdminOverviewQueryKey());}});
  const accountToggle=(account:AdminAccount)=>updateAccountStatus.mutate({accountId:account.id,data:{status:account.status==='active'?'suspended':'active'}},{onSuccess:()=>invalid(qc,getListAdminAccountsQueryKey(),getGetAdminOverviewQueryKey())});
  const merchantToggle=(merchant:AdminMerchant)=>updateMerchantStatus.mutate({merchantId:merchant.id,data:{status:merchant.status==='active'?'suspended':'active'}},{onSuccess:()=>invalid(qc,getListAdminMerchantsQueryKey(),getGetAdminOverviewQueryKey())});

  const paymentError = (approveRequest.error || rejectRequest.error) as {data?:{error?:string};message?:string}|null;
  const heading=<><PageHeading eyebrow={`${profile.role} portal · ${text(locale,'TEST MODE','وضع تجريبي')}`} title={text(locale,titleFor,arabicTitle[titleFor]||titleFor)} detail={text(locale,section==='requests'?'Review every request before any payment is approved.':section==='overview'?'Your PlatePay activity, at a glance.':'Manage your PlatePay account and records.',section==='requests'?'راجع كل طلب قبل اعتماد أي دفعة.':'إدارة نشاطك وسجلاتك في بليت باي.')} action={driver&&section==='overview'?<Link href="/driver/vehicles" className="btn btn-primary" data-testid="button-add-vehicle"><Plus size={16}/>{text(locale,'Add vehicle','إضافة مركبة')}</Link>:merchant&&section==='overview'?<Link href="/merchant/request" className="btn btn-primary" data-testid="button-new-request"><Plus size={16}/>{text(locale,'New request','طلب جديد')}</Link>:undefined}/>{locationPending&&<p role="status" data-testid="status-location-check">{text(locale,'Checking your phone location…','جارٍ التحقق من موقع هاتفك…')}</p>}{paymentError&&<p className="form-error" role="alert" data-testid="error-payment-decision">{paymentError.data?.error || paymentError.message || 'Payment decision could not be completed.'}</p>}</>;

  if(driver&&section==='vehicles') return <main className="content">{heading}<section className="panel form-panel"><h2>{editingVehicle?text(locale,'Edit vehicle','تعديل المركبة'):text(locale,'Register a vehicle','تسجيل مركبة')}</h2><p>{text(locale,'A registered plate helps you identify requests. It never approves payment by itself.','تساعدك اللوحة المسجلة على التعرّف على الطلبات، ولا تعتمد الدفع بنفسها.')}</p><form className="inline-form" onSubmit={saveVehicle}><Field label={text(locale,'License plate','رقم اللوحة')}><input className="input plate-input" required minLength={2} maxLength={20} value={plate} onChange={e=>setPlate(e.target.value)} placeholder="7 · 8942" data-testid="input-vehicle-plate"/></Field><Field label={text(locale,'Nickname (optional)','اسم اختياري')}><input className="input" maxLength={60} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Family car" data-testid="input-vehicle-nickname"/></Field><button className="btn btn-primary" disabled={createVehicle.isPending||updateVehicle.isPending} data-testid="button-save-vehicle">{editingVehicle?'Save changes':'Add plate'}<Plus size={15}/></button>{editingVehicle&&<button type="button" className="btn btn-quiet" onClick={()=>{setEditingVehicle(null);setPlate('');setNickname('')}} data-testid="button-cancel-edit">Cancel</button>}</form>{(createVehicle.isError||updateVehicle.isError)&&<p className="form-error">Could not save vehicle. Check the plate and try again.</p>}</section><section className="panel table-panel"><div className="panel-heading"><h2>Your vehicles</h2><span className="status status-active">{vehicleQ.data?.length??0} registered</span></div><EmptyRows loading={vehicleQ.isLoading} error={vehicleQ.isError} empty={!vehicleQ.data?.length} retry={()=>vehicleQ.refetch()}><div className="vehicle-grid">{vehicleQ.data?.map(v=><article className="vehicle-card" key={v.id} data-testid={`vehicle-card-${v.id}`}><div className="vehicle-card-top"><span className="vehicle-icon"><CarFront size={20}/></span><Status value={v.status}/></div><h3>{v.nickname||'My vehicle'}</h3><div className="plate"><span className="plate-country">KUWAIT<br/>الكويت</span>{v.plateNumber}</div><div className="vehicle-actions"><button className="btn btn-quiet" onClick={()=>beginEdit(v)} data-testid={`button-edit-vehicle-${v.id}`}>Edit</button><button className="btn btn-danger" onClick={()=>setVehicleActive(v)} data-testid={`button-deactivate-vehicle-${v.id}`}>Deactivate</button></div></article>)}</div></EmptyRows></section></main>;

  if(driver&&section==='wallet') return <main className="content">{heading}<div className="wallet-layout"><section className="wallet-card"><div className="wallet-card-top"><span><WalletCards size={20}/> PlatePay wallet</span><span className="wallet-chip">KWD · TEST</span></div><div className="wallet-balance-label">{text(locale,'Available balance','الرصيد المتاح')}</div><div className="wallet-balance">{money(walletQ.data?.balanceFils)}</div><div className="wallet-footer"><span>KUWAITI DINAR</span><span>•••• &nbsp; PLATEPAY</span></div></section><section className="panel topup-panel"><div className="eyebrow">TEST-MODE CHECKOUT</div><h2>{text(locale,'Add funds to your wallet','أضف رصيداً إلى محفظتك')}</h2><p>{text(locale,'Choose a top-up amount. Checkout availability depends on the connected payment setup.','اختر مبلغ التعبئة. يعتمد توفر الدفع على إعدادات المنصة.')}</p><form onSubmit={topUpSubmit}><Field label={text(locale,'Top-up amount (KWD)','مبلغ التعبئة (د.ك)')}><div className="currency-input"><input className="input" required type="number" min="1" max="1000" step="0.001" value={topUpAmount} onChange={e=>setTopUpAmount(e.target.value)} data-testid="input-topup-amount"/><span>KWD</span></div></Field><div className="quick-amounts">{['5.000','10.000','20.000'].map(n=><button type="button" className={`amount-choice ${topUpAmount===n?'picked':''}`} key={n} onClick={()=>setTopUpAmount(n)}>{n}</button>)}</div><button className="btn btn-primary full-btn" disabled={topUp.isPending} data-testid="button-topup">{topUp.isPending?'Preparing checkout…':text(locale,'Continue to checkout','متابعة إلى الدفع')}<ArrowRight size={15}/></button>{topUp.isError&&<p className="form-error">Checkout couldn’t be created. Please retry.</p>}</form></section></div><section className="panel table-panel"><div className="panel-heading"><h2>Recent wallet activity</h2></div><EmptyRows loading={walletQ.isLoading} error={walletQ.isError} empty={!walletQ.data?.recentEntries?.length} retry={()=>walletQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Activity</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{walletQ.data?.recentEntries.map(row=><tr key={row.id}><td>{row.description}</td><td>{dateLabel(row.createdAt)}</td><td className="money-cell">{money(row.amountFils)}</td><td><Status value={row.status}/></td></tr>)}</tbody></table></div></EmptyRows></section></main>;

  if(driver&&section==='requests') return <main className="content">{heading}<div className="notice-banner"><ShieldCheck size={20}/><div><strong>{text(locale,'You decide every time.','القرار لك في كل مرة.')}</strong><span>{text(locale,'Plate matching only identifies your vehicle. It does not authorize a payment.','مطابقة اللوحة تحدد مركبتك فقط ولا تعتمد الدفع.')}</span></div></div><section className="request-list"><EmptyRows loading={requestQ.isLoading} error={requestQ.isError} empty={!requestQ.data?.length} retry={()=>requestQ.refetch()}>{requestQ.data?.map(req=><article className={`request-card panel ${req.status==='pending'?'is-pending':''}`} key={req.id} data-testid={`request-card-${req.id}`}><div className="request-card-head"><div className="request-merchant-icon"><Store size={19}/></div><div className="request-merchant"><span>{req.merchantName}</span><small>{categoryLabel(req.serviceCategory)} · {dateLabel(req.createdAt)}</small></div><Status value={req.status}/></div><div className="request-data-row"><div><small>REQUESTED AMOUNT</small><strong className="request-amount">{money(req.amountFils)}</strong></div><div><small>VEHICLE PLATE</small><strong className="request-plate">{req.plateNumber}</strong></div></div>{req.description&&<p className="request-description">{req.description}</p>}{req.status==='pending'&&<div className="request-actions"><button className="btn btn-primary" disabled={approveRequest.isPending} onClick={()=>approve(req)} data-testid={`button-approve-${req.id}`}><Check size={16}/>{text(locale,'Approve payment','اعتماد الدفع')}</button><button className="btn btn-danger" disabled={rejectRequest.isPending} onClick={()=>reject(req)} data-testid={`button-reject-${req.id}`}><X size={16}/>{text(locale,'Reject','رفض')}</button><button className="btn btn-quiet detail-button" onClick={()=>setRequestDetailId(req.id)} data-testid={`button-details-${req.id}`}>{text(locale,'Details','التفاصيل')}</button></div>}</article>)}</EmptyRows></section>{requestDetailId&&<div className="modal-backdrop" onClick={()=>setRequestDetailId('')}><div className="modal-card panel" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={()=>setRequestDetailId('')} aria-label="Close details"><X size={18}/></button><div className="eyebrow">PAYMENT REQUEST</div><h2>{requestDetailQ.data?.merchantName??'Request detail'}</h2>{requestDetailQ.isLoading?<div className="skeleton" style={{height:100}}/>:requestDetailQ.data&&<><p>{requestDetailQ.data.description||'No additional note from this merchant.'}</p><div className="detail-pair"><span>Plate</span><b>{requestDetailQ.data.plateNumber}</b></div><div className="detail-pair"><span>Amount</span><b>{money(requestDetailQ.data.amountFils)}</b></div><div className="detail-pair"><span>Expires</span><b>{dateLabel(requestDetailQ.data.expiresAt)}</b></div></>}</div></div>}</main>;

  if(driver&&section==='limits') return <main className="content">{heading}<div className="limits-layout"><section className="panel limit-card"><div className="eyebrow">SPENDING SAFEGUARD</div><h2>Set your boundaries.</h2><p>Limits are safeguards for your account. They do not approve any payment request.</p><form onSubmit={saveLimit}><Field label="Daily spending limit (KWD)"><input className="input" type="number" step=".001" min="1" max="10000" required value={dailyCap} onChange={e=>setDailyCap(e.target.value)} data-testid="input-daily-limit"/></Field><Field label="Per-transaction limit (KWD)"><input className="input" type="number" step=".001" min=".1" max="1000" required value={transactionCap} onChange={e=>setTransactionCap(e.target.value)} data-testid="input-transaction-limit"/></Field><button className="btn btn-primary" disabled={updateLimits.isPending} data-testid="button-save-limits">Save limits</button>{updateLimits.isError&&<p className="form-error">Could not update limits. Please retry.</p>}</form></section><section className="panel limit-summary"><div className="limit-summary-head"><span className="metric-icon green"><SlidersHorizontal size={17}/></span><span className="status status-active">ACTIVE</span></div><h2>Today’s activity</h2>{limitQ.isLoading?<div className="skeleton" style={{height:120}}/>:limitQ.isError?<QueryError retry={()=>limitQ.refetch()}/> :<><div className="limit-remain">{money(limitQ.data?.remainingTodayFils)}</div><span className="muted">remaining today</span><div className="limit-meter"><i style={{width:`${Math.min(100,((limitQ.data?.spentTodayFils??0)/(limitQ.data?.dailyLimitFils||1))*100)}%`}}/></div><div className="limit-summary-row"><span>Spent {money(limitQ.data?.spentTodayFils)}</span><span>Limit {money(limitQ.data?.dailyLimitFils)}</span></div><div className="limit-divider"/><div className="detail-pair"><span>Per transaction</span><b>{money(limitQ.data?.perTransactionLimitFils)}</b></div></>}</section></div></main>;

  if((driver||merchant)&&section==='transactions') return (
    <main className="content">
      {heading}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div><h2>{text(locale,'Activity ledger','سجل العمليات')}</h2><span>{text(locale,'Amounts in KWD · three decimal places','المبالغ بالدينار الكويتي · ثلاث منازل عشرية')}</span></div>
          <button className="btn btn-quiet" onClick={()=>transactionQ.refetch()} data-testid="button-refresh-transactions"><Activity size={15}/>{text(locale,'Refresh','تحديث')}</button>
        </div>
        <EmptyRows loading={transactionQ.isLoading} error={transactionQ.isError} empty={!transactionQ.data?.length} retry={()=>transactionQ.refetch()}>
          <div className="table-wrap"><table>
            <thead><tr>{[['Date','التاريخ'],['Merchant','التاجر'],['Plate','اللوحة'],['Service','الخدمة'],['Amount','المبلغ'],['Status','الحالة'],['Receipt','الإيصال']].map(([en,ar])=><th key={en}>{text(locale,en,ar)}</th>)}</tr></thead>
            <tbody>{transactionQ.data?.map(t=>(
              <tr key={t.id} data-testid={`transaction-row-${t.id}`}>
                <td>{dateLabel(t.createdAt)}</td><td>{t.merchantName||text(locale,'Wallet','المحفظة')}</td>
                <td className="plate-cell">{t.plateNumber||'—'}</td><td>{categoryLabel(t.serviceCategory)}</td>
                <td className="money-cell">{money(t.amountFils)}</td><td><Status value={t.status}/></td>
                <td><button className="table-link" onClick={()=>setReceiptId(t.id)} data-testid={`button-receipt-${t.id}`}><ReceiptText size={14}/>{text(locale,'Receipt','الإيصال')}</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </EmptyRows>
      </section>
      {receiptId&&(
        <div className="modal-backdrop" onClick={()=>setReceiptId('')}>
          <div className="modal-card panel receipt-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label={text(locale,'Transaction receipt','إيصال العملية')}>
            <button className="modal-close icon-button" onClick={()=>setReceiptId('')} aria-label={text(locale,'Close receipt','إغلاق الإيصال')} data-testid="button-close-receipt"><X size={18}/></button>
            <div className="receipt-mark"><ReceiptText size={22}/></div><div className="eyebrow">{text(locale,'PLATEPAY RECEIPT','إيصال بليت باي')}</div>
            {receiptQ.isLoading?<div className="skeleton" style={{height:120}}/>:receiptQ.isError?<QueryError retry={()=>receiptQ.refetch()}/>:receiptQ.data&&(
              <>
                <h2>{money(receiptQ.data.transaction.amountFils)}</h2>
                <div className="detail-pair"><span>{text(locale,'Receipt','الإيصال')}</span><b>{receiptQ.data.receiptNumber}</b></div>
                <div className="detail-pair"><span>{text(locale,'Merchant','التاجر')}</span><b>{receiptQ.data.transaction.merchantName||text(locale,'Wallet','المحفظة')}</b></div>
                <div className="detail-pair"><span>{text(locale,'Location','الموقع')}</span><b>{receiptQ.data.merchantLocation||'—'}</b></div>
                <div className="detail-pair"><span>{text(locale,'Date','التاريخ')}</span><b>{dateLabel(receiptQ.data.transaction.createdAt)}</b></div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );

  if(merchant&&section==='new-request') return <main className="content">{heading}<div className="request-workspace"><section className="panel scan-panel"><div className="panel-heading"><div><h2><ScanLine size={18}/> Plate identification</h2><span>Recognition identifies only. It never charges automatically.</span></div><span className="status status-pending">REVIEW REQUIRED</span></div><div className="upload-zone">{cameraOn?<div className="camera-view"><video ref={videoRef} autoPlay playsInline/><button className="btn btn-primary" onClick={captureStill} data-testid="button-capture-still"><Camera size={16}/>Capture still</button></div>:scanImage?<div className="image-review"><img src={scanImage} alt="Uploaded plate photo for review" style={{transform:`scale(${scanZoom})`}}/><div className="image-overlay">REVIEW CROP</div><button className="image-clear" onClick={()=>{setScanImage('');setScanFile(null);setScanPlate('')}} aria-label="Remove image"><X size={15}/></button></div>:<div className="upload-prompt"><span className="upload-icon"><Upload size={23}/></span><strong>Upload a plate photo</strong><span>JPG or PNG · use a clear still image</span><div><label className="btn btn-quiet upload-button" data-testid="button-upload-photo"><Upload size={15}/>Choose photo<input hidden type="file" accept="image/*" capture="environment" onChange={e=>onImage(e.target.files?.[0])}/></label><button type="button" className="btn btn-quiet" onClick={startCamera} data-testid="button-open-camera"><Camera size={15}/>Use camera</button></div></div>}</div>{scanImage&&<div className="crop-controls"><label>Crop zoom <input aria-label="Crop zoom" type="range" min="1" max="2.4" step=".1" value={scanZoom} onChange={e=>setScanZoom(Number(e.target.value))}/></label><button className="btn btn-quiet" disabled={!scanFile||!!ocrStatus.includes('Reading')} onClick={()=>scanFile&&callOcr(scanFile,scanZoom)} data-testid="button-read-plate"><Sparkles size={15}/>Read plate</button></div>}{ocrStatus&&<div className="ocr-message" role="status"><Activity size={15}/>{ocrStatus}</div>}<div className="identification-rule"><ShieldCheck size={16}/><span>Plate recognition is an identification aid only. Always review and correct the text below.</span></div></section><form className="panel request-form" onSubmit={submitRequest}><div className="eyebrow">REQUEST DETAILS</div><h2>Send for driver approval</h2><p>Submit a request only after the plate and amount are reviewed.</p><Field label="Plate number"><input name="plate" className="input plate-input" value={scanPlate} onChange={e=>setScanPlate(e.target.value.toUpperCase())} required minLength={2} maxLength={20} placeholder="Enter or correct plate" data-testid="input-request-plate"/></Field><Field label="Service category"><select className="input" name="category" required data-testid="select-service-category">{categoryOptions.map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></Field><Field label="Amount (KWD)"><div className="currency-input"><input name="amount" className="input" type="number" required min=".001" max="10000" step=".001" placeholder="0.000" data-testid="input-request-amount"/><span>KWD</span></div></Field><Field label="Description (optional)"><input name="description" className="input" maxLength={240} placeholder="What is this request for?" data-testid="input-request-description"/></Field><Field label="Order reference (optional)"><input name="reference" className="input" maxLength={80} placeholder="Order or lane reference" data-testid="input-order-reference"/></Field><div className="request-notice"><CircleAlert size={15}/>The driver must explicitly approve. Plate recognition will not trigger a charge.</div><button className="btn btn-primary full-btn" disabled={createRequest.isPending} data-testid="button-submit-request">{createRequest.isPending?'Sending request…':'Send approval request'}<ArrowRight size={15}/></button>{createRequest.isError&&<p className="form-error">Request could not be sent. Confirm the plate is registered and try again.</p>}</form></div></main>;

  if(merchant&&section==='profile') return <MerchantProfilePage profileQuery={merchantProfileQ} services={servicesQ.data||[]} mutation={updateMerchantProfile} qc={qc}/>;
  if(merchant&&section==='history') return <main className="content">{heading}<section className="panel table-panel"><div className="panel-heading"><div><h2>Requests sent</h2><span>Driver decisions remain explicit.</span></div><Link className="btn btn-primary" href="/merchant/request" data-testid="button-new-request-history"><Plus size={15}/>New request</Link></div><EmptyRows loading={requestQ.isLoading} error={requestQ.isError} empty={!requestQ.data?.length} retry={()=>requestQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Created</th><th>Plate</th><th>Service</th><th>Amount</th><th>Status</th><th>Request detail</th></tr></thead><tbody>{requestQ.data?.map(r=><tr key={r.id} data-testid={`merchant-request-${r.id}`}><td>{dateLabel(r.createdAt)}</td><td className="plate-cell">{r.plateNumber}</td><td>{categoryLabel(r.serviceCategory)}</td><td className="money-cell">{money(r.amountFils)}</td><td><Status value={r.status}/></td><td><button className="table-link" onClick={()=>setRequestDetailId(r.id)} data-testid={`button-request-detail-${r.id}`}>View request</button></td></tr>)}</tbody></table></div></EmptyRows></section>{requestDetailId&&<div className="modal-backdrop" onClick={()=>setRequestDetailId('')}><div className="modal-card panel" onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" onClick={()=>setRequestDetailId('')}><X size={18}/></button>{requestDetailQ.isLoading?<div className="skeleton" style={{height:100}}/>:requestDetailQ.data&&<><div className="eyebrow">REQUEST DETAIL</div><h2>{requestDetailQ.data.merchantName}</h2><div className="detail-pair"><span>Plate</span><b>{requestDetailQ.data.plateNumber}</b></div><div className="detail-pair"><span>Amount</span><b>{money(requestDetailQ.data.amountFils)}</b></div><div className="detail-pair"><span>Status</span><Status value={requestDetailQ.data.status}/></div><p>{requestDetailQ.data.description||'No description'}</p></>}</div></div>}</main>;

  if(merchant&&section==='overview') return <main className="content">{heading}<div className="merchant-band"><div className="merchant-band-mark"><Store size={21}/></div><div><span className="eyebrow">MERCHANT ACCOUNT</span><strong>{merchantDashQ.data?.merchant?.businessName||merchantProfileQ.data?.businessName||profile.displayName}</strong><small>{merchantDashQ.data?.merchant?.locationName||merchantProfileQ.data?.locationName||'Add your business location to complete your profile.'}</small></div><div className="merchant-status"><span className="status status-pending">{merchantProfileQ.data?.verificationStatus||'profile needed'}</span><Link className="table-link" href="/merchant/profile">Manage profile <ArrowRight size={13}/></Link></div></div><div className="metric-grid"><Metric label="Completed requests" value={`${merchantDashQ.data?.completedPayments??0}`} note="From the merchant API" icon={CheckCircle2} accent/><Metric label="Completed value" value={money(merchantDashQ.data?.completedValueFils)} note="KWD · three decimals" icon={WalletCards}/><Metric label="Awaiting decision" value={`${merchantDashQ.data?.pendingRequests??0}`} note="Driver review required" icon={Clock3}/></div><section className="panel table-panel"><div className="panel-heading"><h2>Recent requests</h2><Link href="/merchant/history" className="table-link">View history <ArrowRight size={14}/></Link></div><EmptyRows loading={merchantDashQ.isLoading} error={merchantDashQ.isError} empty={!merchantDashQ.data?.recentRequests?.length} retry={()=>merchantDashQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Plate</th><th>Service</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>{merchantDashQ.data?.recentRequests.map(r=><tr key={r.id}><td className="plate-cell">{r.plateNumber}</td><td>{categoryLabel(r.serviceCategory)}</td><td className="money-cell">{money(r.amountFils)}</td><td>{dateLabel(r.createdAt)}</td><td><Status value={r.status}/></td></tr>)}</tbody></table></div></EmptyRows></section></main>;

  if(admin&&section==='accounts') return <main className="content">{heading}<section className="panel table-panel"><div className="panel-heading"><div><h2>Platform accounts</h2><span>Account access is managed by authorized administrators.</span></div><button className="btn btn-quiet" onClick={()=>accountsQ.refetch()} data-testid="button-refresh-accounts"><Activity size={15}/>Refresh</button></div><EmptyRows loading={accountsQ.isLoading} error={accountsQ.isError} empty={!accountsQ.data?.length} retry={()=>accountsQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Vehicles / plates</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead><tbody>{accountsQ.data?.map(a=><tr key={a.id} data-testid={`account-row-${a.id}`}><td><b>{a.displayName}</b></td><td>{a.email}</td><td>{a.role}</td><td>{a.plateNumbers.join(', ')||'—'}</td><td>{dateLabel(a.createdAt)}</td><td><Status value={a.status}/></td><td><button className={`table-action ${a.status==='active'?'danger-text':''}`} disabled={updateAccountStatus.isPending} onClick={()=>accountToggle(a)} data-testid={`button-account-status-${a.id}`}>{a.status==='active'?'Suspend':'Activate'}</button></td></tr>)}</tbody></table></div></EmptyRows></section></main>;

  if(admin&&section==='merchants') return <main className="content">{heading}<section className="panel table-panel"><div className="panel-heading"><div><h2>Merchant reviews</h2><span>Verification and account status.</span></div><button className="btn btn-quiet" onClick={()=>merchantsQ.refetch()} data-testid="button-refresh-merchants"><Activity size={15}/>Refresh</button></div><EmptyRows loading={merchantsQ.isLoading} error={merchantsQ.isError} empty={!merchantsQ.data?.length} retry={()=>merchantsQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Business</th><th>Owner</th><th>Category</th><th>Location</th><th>Verification</th><th>Account</th><th>Review</th></tr></thead><tbody>{merchantsQ.data?.map(m=><tr key={m.id} data-testid={`merchant-row-${m.id}`}><td><b>{m.businessName}</b><small className="table-sub">{m.email}</small></td><td>{m.ownerName}</td><td>{categoryLabel(m.serviceCategory)}</td><td>{m.locationName}</td><td><Status value={m.verificationStatus}/></td><td><Status value={m.status}/></td><td className="review-actions"><button className="table-action success-text" disabled={updateMerchantStatus.isPending} onClick={()=>approveStatus(m.id,'verified')} data-testid={`button-verify-${m.id}`}>Verify</button><button className="table-action danger-text" disabled={updateMerchantStatus.isPending} onClick={()=>approveStatus(m.id,'rejected')} data-testid={`button-reject-merchant-${m.id}`}>Reject</button><button className="table-action" onClick={()=>merchantToggle(m)} data-testid={`button-toggle-merchant-${m.id}`}>{m.status==='active'?'Suspend':'Activate'}</button></td></tr>)}</tbody></table></div></EmptyRows></section></main>;

  if(admin&&section==='admin-transactions') return <main className="content">{heading}<AdminTransactionTable query={adminTransactionsQ}/></main>;
  if(admin&&section==='audit') return <main className="content">{heading}<section className="panel table-panel"><div className="panel-heading"><div><h2>Administrative activity</h2><span>Recent account and platform actions.</span></div><button className="btn btn-quiet" onClick={()=>auditQ.refetch()} data-testid="button-refresh-audit"><Activity size={15}/>Refresh</button></div><EmptyRows loading={auditQ.isLoading} error={auditQ.isError} empty={!auditQ.data?.length} retry={()=>auditQ.refetch()}><div className="audit-list">{auditQ.data?.map((row:AuditLogEntry)=><article className="audit-row" key={row.id} data-testid={`audit-entry-${row.id}`}><div className="audit-icon"><FileClock size={16}/></div><div><strong>{row.action}</strong><span>{row.actorName} · {row.targetType} · {row.targetId}</span></div><time>{dateLabel(row.createdAt)}</time></article>)}</div></EmptyRows></section></main>;

  if(admin&&section==='overview') return <main className="content">{heading}<div className="admin-status-panel"><div className="admin-symbol"><ShieldCheck size={22}/></div><div><span className="eyebrow">PLATFORM CONTROL</span><strong>Administrative operations</strong><span>Authorized account and transaction review · test-mode environment</span></div><span className="status status-active">API CONNECTED</span></div>{adminOverviewQ.isLoading?<div className="metric-grid">{[1,2,3,4].map(n=><div className="panel metric-card" key={n}><div className="skeleton" style={{height:70}}/></div>)}</div>:adminOverviewQ.isError?<QueryError retry={()=>adminOverviewQ.refetch()}/>:<div className="metric-grid admin-metrics"><Metric label="Drivers" value={`${adminOverviewQ.data?.driverCount??0}`} note="Registered profiles" icon={UserRound} accent/><Metric label="Merchants" value={`${adminOverviewQ.data?.merchantCount??0}`} note="Merchant accounts" icon={Store}/><Metric label="Vehicles" value={`${adminOverviewQ.data?.vehicleCount??0}`} note="Registered plates" icon={CarFront}/><Metric label="Completed volume" value={money(adminOverviewQ.data?.completedValueFils)} note={`${adminOverviewQ.data?.completedTransactionCount??0} completed transactions`} icon={WalletCards}/></div>}<div className="admin-bottom-grid"><div className="panel admin-shortcut"><div className="eyebrow">REVIEW QUEUE</div><strong>{adminOverviewQ.data?.pendingRequestCount??0} pending requests</strong><p>Review merchant requests and platform activity through the available API records.</p><Link href="/admin/transactions" className="btn btn-quiet" data-testid="button-admin-transactions">Open transactions <ArrowRight size={14}/></Link></div><div className="panel admin-shortcut"><div className="eyebrow">ACCOUNT OPERATIONS</div><strong>Review access and verification</strong><p>Manage account status, merchant verification, and the audit trail.</p><div className="shortcut-links"><Link href="/admin/accounts" className="table-link">Accounts <ArrowRight size={13}/></Link><Link href="/admin/merchants" className="table-link">Merchants <ArrowRight size={13}/></Link><Link href="/admin/audit" className="table-link">Audit log <ArrowRight size={13}/></Link></div></div></div></main>;

  if(driver&&section==='overview') return <main className="content">{heading}<div className="welcome-card"><div><div className="eyebrow">DRIVER ACCOUNT · KUWAIT</div><h2>{text(locale,`Welcome back, ${profile.displayName.split(' ')[0]||'driver'}.`,`مرحباً بعودتك، ${profile.displayName.split(' ')[0]||'سائق'}.`)}</h2><p>{text(locale,'Every request stays in your hands.','كل طلب يبقى تحت سيطرتك.')}</p></div><div className="welcome-plate"><span className="plate-country">YOUR<br/>PLATES</span><strong>{vehicleQ.data?.[0]?.plateNumber??'ADD A PLATE'}</strong><CarFront size={21}/></div></div><div className="metric-grid"><Metric label="Wallet balance" value={money(walletQ.data?.balanceFils)} note="Available KWD balance" icon={WalletCards} accent/><Metric label="Registered vehicles" value={`${vehicleQ.data?.length??0}`} note="Active plates on your profile" icon={CarFront}/><Metric label="Pending requests" value={`${requestQ.data?.filter(r=>r.status==='pending').length??0}`} note="Waiting for your decision" icon={Bell}/><Metric label="Today remaining" value={money(limitQ.data?.remainingTodayFils)} note="Your daily spending limit" icon={SlidersHorizontal}/></div><div className="dashboard-columns"><section className="panel table-panel"><div className="panel-heading"><div><h2>Awaiting your decision</h2><span>Review the merchant and amount before responding.</span></div><Link href="/driver/requests" className="table-link">All requests <ArrowRight size={13}/></Link></div><EmptyRows loading={requestQ.isLoading} error={requestQ.isError} empty={!requestQ.data?.some(r=>r.status==='pending')} retry={()=>requestQ.refetch()}>{requestQ.data?.filter(r=>r.status==='pending').slice(0,2).map(r=><div className="compact-request" key={r.id}><div className="request-merchant-icon"><Store size={17}/></div><div className="compact-request-main"><b>{r.merchantName}</b><span>{categoryLabel(r.serviceCategory)} · {r.plateNumber}</span></div><strong>{money(r.amountFils)}</strong><button className="btn btn-quiet" onClick={()=>setLocation('/driver/requests')} data-testid={`button-open-request-${r.id}`}>Review</button></div>)}</EmptyRows></section><section className="panel security-panel"><div className="security-visual"><div className="security-ring"><ShieldCheck size={28}/></div></div><div className="eyebrow">YOUR CONTROL</div><h3>Identified is not approved.</h3><p>Plate matching helps connect a request to your vehicle. You remain the only person who can approve it.</p><Link href="/driver/limits" className="table-link">Review safeguards <ArrowRight size={13}/></Link></section></div><section className="panel table-panel"><div className="panel-heading"><h2>Recent activity</h2><Link href="/driver/transactions" className="table-link">View all <ArrowRight size={13}/></Link></div><EmptyRows loading={transactionQ.isLoading} error={transactionQ.isError} empty={!transactionQ.data?.length} retry={()=>transactionQ.refetch()}><div className="table-wrap"><table><thead><tr><th>Date</th><th>Merchant</th><th>Vehicle</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactionQ.data?.slice(0,5).map((t:Transaction)=><tr key={t.id}><td>{dateLabel(t.createdAt)}</td><td>{t.merchantName||'Wallet'}</td><td>{t.plateNumber||'—'}</td><td className="money-cell">{money(t.amountFils)}</td><td><Status value={t.status}/></td></tr>)}</tbody></table></div></EmptyRows></section></main>;

  return <main className="content">{heading}<QueryError retry={retry}/></main>;
}

function MerchantProfilePage({ profileQuery, services, mutation, qc }: { profileQuery: any; services: any[]; mutation: ReturnType<typeof useUpdateMerchantProfile>; qc: ReturnType<typeof useQueryClient> }) {
  const current=profileQuery.data;
  const [business,setBusiness]=useState(current?.businessName??'');
  const [category,setCategory]=useState<ServiceCategory>(current?.serviceCategory??'drive_thru');
  const [locationName,setLocationName]=useState(current?.locationName??'');
  const [latitude,setLatitude]=useState(current?.latitude!==undefined?String(current.latitude):'');
  const [longitude,setLongitude]=useState(current?.longitude!==undefined?String(current.longitude):'');
  const [radius,setRadius]=useState(String(current?.geofenceRadiusMeters??150));
  useEffect(()=>{if(current){setBusiness(current.businessName);setCategory(current.serviceCategory);setLocationName(current.locationName);setLatitude(String(current.latitude));setLongitude(String(current.longitude));setRadius(String(current.geofenceRadiusMeters));}},[current?.id]);
  const submit=(e:FormEvent)=>{e.preventDefault();if(!latitude.trim()||!longitude.trim()){window.alert('Enter the actual service location coordinates.');return;}mutation.mutate({data:{businessName:business,serviceCategory:category,locationName,latitude:Number(latitude),longitude:Number(longitude),geofenceRadiusMeters:Number(radius)}},{onSuccess:()=>invalid(qc,getGetMerchantProfileQueryKey(),getGetMerchantDashboardQueryKey())});};
  return <main className="content"><PageHeading eyebrow="MERCHANT PORTAL · PROFILE" title="Business profile" detail="Set your service location and business details."/><div className="merchant-profile-layout"><form className="panel merchant-profile-form" onSubmit={submit}><div className="eyebrow">BUSINESS DETAILS</div><h2>Location & service</h2>{profileQuery.isLoading?<div className="skeleton" style={{height:240}}/>:<><Field label="Business name"><input className="input" value={business} required maxLength={120} onChange={e=>setBusiness(e.target.value)} data-testid="input-business-name"/></Field><Field label="Service category"><select className="input" value={category} onChange={e=>setCategory(e.target.value as ServiceCategory)} data-testid="select-merchant-category">{['drive_thru','fuel','parking','car_wash','other'].map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></Field><Field label="Location name"><input className="input" value={locationName} required maxLength={120} onChange={e=>setLocationName(e.target.value)} placeholder="Area or branch name" data-testid="input-location-name"/></Field><div className="two-fields"><Field label="Latitude"><input className="input" type="number" step=".000001" min="-90" max="90" value={latitude} onChange={e=>setLatitude(e.target.value)} data-testid="input-latitude"/></Field><Field label="Longitude"><input className="input" type="number" step=".000001" min="-180" max="180" value={longitude} onChange={e=>setLongitude(e.target.value)} data-testid="input-longitude"/></Field></div><Field label="Service radius (meters)"><input className="input" type="number" min="25" max="5000" value={radius} onChange={e=>setRadius(e.target.value)} data-testid="input-geofence-radius"/></Field><div className="info-note"><MapPin size={15}/>Location is stored as a service reference. This app does not claim real-time geofence acceptance.</div><button className="btn btn-primary" disabled={mutation.isPending} data-testid="button-save-merchant-profile">{mutation.isPending?'Saving…':'Save business profile'}<Check size={15}/></button>{mutation.isError&&<p className="form-error">Could not save your business profile.</p>}</>}</form><aside className="panel profile-aside"><div className="profile-map"><div className="map-grid"/><MapPin size={30}/><span>KUWAIT</span></div><div className="eyebrow">ACCOUNT STATUS</div><div className="profile-status-row"><span>Verification</span><Status value={current?.verificationStatus||'pending'}/></div><div className="profile-status-row"><span>Account</span><Status value={current?.status||'active'}/></div><p>Merchant status is provided by the platform API. Profile edits do not imply verification or live payment acceptance.</p><div className="small-label">DEMO SERVICE LOCATIONS</div>{services.slice(0,3).map(s=><div className="service-location-row" key={s.id}><MapPin size={14}/><span>{s.merchantName}<small>{s.locationName} · {categoryLabel(s.category)}</small></span></div>)}</aside></div></main>;
}

function AdminTransactionTable({ query }: { query: any }) {
  const [search,setSearch]=useState('');
  const rows=(query.data||[]).filter((t:AdminTransaction)=>`${t.driverName} ${t.merchantName} ${t.plateNumber}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel table-panel"><div className="panel-heading"><div><h2>Transaction monitor</h2><span>Platform records · read-only view</span></div><button className="btn btn-quiet" onClick={()=>query.refetch()} data-testid="button-refresh-admin-transactions"><Activity size={15}/>Refresh</button></div><div className="table-toolbar"><label className="search-field"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search merchant, driver, plate…" data-testid="input-search-transactions"/></label><span className="muted">{rows.length} records</span></div><EmptyRows loading={query.isLoading} error={query.isError} empty={!rows.length} retry={()=>query.refetch()}><div className="table-wrap"><table><thead><tr><th>Date</th><th>Driver</th><th>Merchant</th><th>Plate</th><th>Service</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rows.map((t:AdminTransaction)=><tr key={t.id} data-testid={`admin-transaction-${t.id}`}><td>{dateLabel(t.createdAt)}</td><td>{t.driverName}</td><td>{t.merchantName}</td><td className="plate-cell">{t.plateNumber}</td><td>{categoryLabel(t.serviceCategory)}</td><td className="money-cell">{money(t.amountFils)}</td><td><Status value={t.status}/></td></tr>)}</tbody></table></div></EmptyRows></section>;
}

function ProfileGate({ children }: { children: (profile: UserProfile) => ReactNode }) {
  const { isLoaded, isSignedIn, error, refresh } = useAuth();
  const profileQ = useGetCurrentProfile({query:{queryKey:getGetCurrentProfileQueryKey(),enabled:isLoaded&&!!isSignedIn,retry:(count,failure)=>![401,403,404].includes((failure as {status?:number}).status??0)&&count<1}});
  const [loc] = useLocation();
  if(!isLoaded) return <PageLoading/>;
  if(error) return <QueryError error={error} retry={()=>void refresh()} showHome/>;
  if(!isSignedIn) return <Redirect to="/sign-in"/>;
  if(profileQ.isLoading) return <PageLoading/>;
  if(profileQ.isError) {
    const status=(profileQ.error as any)?.status;
    if(status===401) return <Redirect to="/sign-in"/>;
    if(status===404) return <Onboarding/>;
    return <div className="content"><QueryError error={profileQ.error} retry={()=>profileQ.refetch()} showHome/></div>;
  }
  if(loc==='/onboarding'&&profileQ.data) return <Redirect to={profileQ.data.role==='admin'?'/admin':profileQ.data.role==='merchant'?'/merchant':'/driver'}/>;
  const expected=loc.startsWith('/admin')?'admin':loc.startsWith('/merchant')?'merchant':'driver';
  if(profileQ.data?.role!==expected) return <Redirect to={profileQ.data?.role==='admin'?'/admin':profileQ.data?.role==='merchant'?'/merchant':'/driver'}/>;
  return <AppShell profile={profileQ.data}>{children(profileQ.data)}</AppShell>;
}

function Protected({ section }: { section: string }) {
  return <ProfileGate>{profile=><PortalPage profile={profile} section={section}/>}</ProfileGate>;
}
function HomeRoute() {
  const {isLoaded,isSignedIn}=useAuth();
  const profile=useGetCurrentProfile({query:{queryKey:getGetCurrentProfileQueryKey(),enabled:isLoaded&&!!isSignedIn}});
  if(isLoaded&&isSignedIn&&profile.isLoading) return <PageLoading/>;
  if(isLoaded&&isSignedIn&&profile.isError) {
    if((profile.error as any)?.status===404) return <Redirect to="/onboarding"/>;
    return <Landing accountError={profile.error} retryAccount={()=>profile.refetch()}/>;
  }
  if(isLoaded&&isSignedIn&&profile.data) return <Redirect to={profile.data.role==='admin'?'/admin':profile.data.role==='merchant'?'/merchant':'/driver'}/>;
  return <Landing/>;
}
function OnboardingRoute() { return <ProfileGate>{()=> <Onboarding/>}</ProfileGate>; }
function AppRoutes() {
  return <AuthProvider>
    <Switch>
      <Route path="/" component={HomeRoute}/>
      <Route path="/sign-in/*?" component={SignInPage}/>
      <Route path="/sign-up/*?" component={SignUpPage}/>
      <Route path="/onboarding" component={OnboardingRoute}/>
      <Route path="/driver" component={()=> <Protected section="overview"/>}/>
      <Route path="/driver/vehicles" component={()=> <Protected section="vehicles"/>}/>
      <Route path="/driver/wallet" component={()=> <Protected section="wallet"/>}/>
      <Route path="/driver/requests" component={()=> <Protected section="requests"/>}/>
      <Route path="/driver/limits" component={()=> <Protected section="limits"/>}/>
      <Route path="/driver/transactions" component={()=> <Protected section="transactions"/>}/>
      <Route path="/merchant" component={()=> <Protected section="overview"/>}/>
      <Route path="/merchant/request" component={()=> <Protected section="new-request"/>}/>
      <Route path="/merchant/history" component={()=> <Protected section="history"/>}/>
      <Route path="/merchant/transactions" component={()=> <Protected section="transactions"/>}/>
      <Route path="/merchant/profile" component={()=> <Protected section="profile"/>}/>
      <Route path="/admin" component={()=> <Protected section="overview"/>}/>
      <Route path="/admin/accounts" component={()=> <Protected section="accounts"/>}/>
      <Route path="/admin/merchants" component={()=> <Protected section="merchants"/>}/>
      <Route path="/admin/transactions" component={()=> <Protected section="admin-transactions"/>}/>
      <Route path="/admin/audit" component={()=> <Protected section="audit"/>}/>
      <Route><NotFound/></Route>
    </Switch>
  </AuthProvider>;
}

function NotFound() {
  const [,setLocation]=useLocation();
  return <div className="not-found"><Brand/><span className="eyebrow">404 · ROUTE NOT FOUND</span><h1>This route isn’t on the map.</h1><p>Head back to PlatePay’s public page.</p><button className="btn btn-primary" onClick={()=>setLocation('/')}>Back to home <ArrowRight size={15}/></button></div>;
}

function App() {
  const [locale,setLocale]=useState<Locale>(()=>localStorage.getItem('platepay-locale')==='ar'?'ar':'en');
  const toggle=()=>setLocale(old=>{const next=old==='en'?'ar':'en';localStorage.setItem('platepay-locale',next);return next;});
  return <QueryClientProvider client={queryClient}><LocaleContext.Provider value={{locale,toggle}}><WouterRouter base={basePath}><AppRoutes/></WouterRouter></LocaleContext.Provider></QueryClientProvider>;
}

export default App;
