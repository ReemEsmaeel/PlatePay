import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Car, CheckCircle2, Globe, ImageUp, Info, LogOut, MapPin, ScanLine, Store, TriangleAlert } from 'lucide-react';
import { approvePaymentRequest, createPaymentRequest } from '@workspace/api-client-react';
import type { Transaction } from '@workspace/api-client-react';
import { useAuth } from '../auth/AuthProvider';
import { PlatePhotoPreview } from '../components/PlatePhotoPreview';
import { stripPlateWhitespace } from '../lib/kuwait-plate';
import { DemoApiError, endDemo, getDemo, setDemoPlate, startDemo, switchDemo, type DemoRole, type DemoState } from '../lib/demo-api';
import './demo.css';

type Locale = 'en' | 'ar';
const kwd = (fils: number) => `KWD ${(fils / 1000).toFixed(3)}`;
const errText = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong.';
const SAMPLE_CROP = { x: 380, y: 470, width: 440, height: 238 };
const DEMO_AMOUNT = 2500;

export default function DemoPage() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('platepay-locale') === 'ar' ? 'ar' : 'en');
  const t = (en: string, ar: string) => locale === 'ar' ? ar : en;
  const [state, setState] = useState<DemoState | null>(null);
  const [phase, setPhase] = useState<'loading' | 'none' | 'normal' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const busyRef = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const next = await getDemo();
      if (version !== loadVersion.current) return;
      if (next) { setState(next); setPhase('ready'); }
      else { setState(null); setPhase('none'); }
      setLoadError(null);
    } catch (e) {
      if (version !== loadVersion.current) return;
      if (e instanceof DemoApiError && e.status === 404) { setState(null); setPhase('normal'); }
      else { setLoadError(errText(e)); setPhase(p => p === 'ready' ? p : 'error'); }
    }
  }, []);

  useEffect(() => { if (auth.isLoaded) void load(); }, [auth.isLoaded, auth.account?.id, load]);

  // Poll only while an active demo is open and the tab is visible.
  useEffect(() => {
    if (phase !== 'ready') return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible' && !busyRef.current) void load(); }, 4000);
    return () => window.clearInterval(id);
  }, [phase, load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busyRef.current) return;
    ++loadVersion.current;
    busyRef.current = true; setBusy(key); setActionError(null);
    try { await fn(); }
    catch (e) {
      if (e instanceof DemoApiError && e.status === 409 && key === 'start') setConflict(true);
      else if (e instanceof DemoApiError && e.status === 401) { setActionError(t('Your demo session expired. Start a new demo.', 'انتهت جلسة العرض. ابدأ عرضاً جديداً.')); await auth.refresh(); await load(); }
      else setActionError(errText(e));
    } finally { busyRef.current = false; setBusy(null); }
  };

  const start = () => run('start', async () => { await startDemo(); await auth.refresh(); await load(); });
  const signOutNormal = () => run('signout', async () => { await auth.signOut(); setConflict(false); await load(); });
  const switchRole = (role: DemoRole) => run('switch-' + role, async () => { await switchDemo(role); await auth.refresh(); await load(); });
  const exit = () => run('end', async () => { await endDemo(); await auth.refresh(); navigate('/'); });
  const toggleLocale = () => setLocale(l => { const n = l === 'en' ? 'ar' : 'en'; localStorage.setItem('platepay-locale', n); return n; });

  const pending = state?.requests.find(r => r.status === 'pending') ?? null;
  const approved = state?.requests.find(r => r.status === 'approved') ?? null;
  const closed = state?.requests.find(r => r.status !== 'pending') ?? null;
  const step = !state ? 0 : approved ? 4 : pending ? 3 : closed ? 4 : 1;

  const steps = [
    t('Merchant reads the plate from a photo', 'التاجر يقرأ اللوحة من صورة'),
    t('Merchant sends a KWD 2.500 request', 'التاجر يرسل طلباً بقيمة 2.500 د.ك'),
    t('Driver reviews and approves', 'السائق يراجع ويوافق'),
    t('Payment lands in both histories', 'الدفعة تظهر في السجلين'),
  ];

  return <div className="demo-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <header className="demo-nav">
      <Link href="/" className="demo-wordmark" data-testid="link-demo-home"><i>PP</i>PlatePay</Link>
      <div className="demo-nav-actions">
        <button className="language-toggle" onClick={toggleLocale} data-testid="button-demo-language"><Globe size={13}/>{locale === 'en' ? 'العربية' : 'English'}</button>
        {state && <button className="btn btn-quiet hide-sm" onClick={() => navigate(state.role === 'driver' ? '/driver' : '/merchant')} data-testid="button-demo-portal">{t('Open portal', 'افتح البوابة')}</button>}
        {state && <button className="btn btn-danger" disabled={busy !== null} onClick={exit} data-testid="button-demo-exit"><LogOut size={14}/>{busy === 'end' ? t('Exiting', 'جارٍ الخروج') : t('Exit demo', 'إنهاء العرض')}</button>}
      </div>
    </header>

    <section className="demo-hero">
      <div className="hero-grid"/>
      <div className="demo-hero-inner">
        <div className="fade-up">
          <span className="eyebrow" style={{ color: '#75dfc0' }}>{t('GUIDED DEMO · TEST MODE', 'عرض موجّه · وضع تجريبي')}</span>
          <h1>{t('One plate. Two people. One decision.', 'لوحة واحدة. شخصان. قرار واحد.')}</h1>
          <p>{t('Play both sides of a drive-thru payment. You get a private demo driver with a KWD 20.000 test wallet and a private demo merchant. Nothing here touches real money or real accounts.', 'جرّب طرفي عملية دفع في طلب من السيارة. تحصل على سائق تجريبي خاص بمحفظة 20.000 د.ك تجريبية وتاجر تجريبي خاص. لا أموال حقيقية ولا حسابات حقيقية.')}</p>
        </div>
        <ol className="demo-steps fade-up" aria-label={t('Demo progress', 'تقدّم العرض')}>
          {steps.map((s, i) => <li key={i} className={step > i + 1 || (i === 3 && approved) ? 'is-done' : step === i + 1 ? 'is-current' : ''} aria-current={step === i + 1 ? 'step' : undefined}><b>{i + 1}</b>{s}</li>)}
        </ol>
      </div>
    </section>

    <main className="demo-body">
      {actionError && <div className="demo-hint err" role="alert"><TriangleAlert size={15}/>{actionError}</div>}
      {phase === 'loading' && <><div className="skeleton demo-sk"/><div className="skeleton demo-sk"/></>}
      {phase === 'error' && <div className="panel demo-start" role="alert"><span className="eyebrow">{t('CONNECTION', 'الاتصال')}</span><h2>{t('The demo could not load.', 'تعذّر تحميل العرض.')}</h2><p>{loadError}</p><button className="btn btn-primary" onClick={() => { setPhase('loading'); void load(); }} data-testid="button-demo-retry">{t('Try again', 'حاول مجدداً')}</button></div>}

      {(phase === 'none' || phase === 'normal') && <div className="panel demo-start fade-up">
        <span className="eyebrow">{t('START', 'ابدأ')}</span>
        <h2>{t('Try PlatePay end to end in about two minutes.', 'جرّب بليت باي كاملاً في دقيقتين تقريباً.')}</h2>
        <p>{t('Starting creates a private demo driver and merchant and signs you in as the merchant. The driver must approve the payment themselves; recognition never charges anyone.', 'يُنشئ البدء سائقاً وتاجراً تجريبيين خاصين ويسجّل دخولك كتاجر. يجب أن يوافق السائق بنفسه؛ التعرّف لا يخصم أي مبلغ.')}</p>
        {(phase === 'normal' || conflict) ? <>
          <div className="demo-hint warn"><TriangleAlert size={15}/>{t('You are signed in to a regular PlatePay account. The demo will not replace it. Sign out first if you want to try the demo.', 'أنت مسجّل بحساب بليت باي عادي. لن يستبدله العرض. سجّل الخروج أولاً إن أردت تجربة العرض.')}</div>
          <div className="demo-actions">
            <button className="btn btn-dark" disabled={busy !== null} onClick={signOutNormal} data-testid="button-demo-sign-out"><LogOut size={14}/>{t('Sign out of my account', 'تسجيل الخروج من حسابي')}</button>
            <button className="btn btn-quiet" onClick={() => navigate('/onboarding')} data-testid="button-demo-back-portal">{t('Back to my portal', 'العودة إلى بوابتي')}</button>
          </div>
        </> : <button className="btn btn-primary" disabled={busy !== null} onClick={start} data-testid="button-demo-start">{busy === 'start' ? t('Preparing demo accounts', 'جارٍ تجهيز الحسابات') : t('Try demo', 'جرّب العرض')}<ArrowRight size={15}/></button>}
      </div>}

      {phase === 'ready' && state && <>
        <div className="panel demo-persona">
          <div>
            <span className="eyebrow">{t('YOU ARE NOW', 'أنت الآن')}</span>
            <strong>{state.role === 'merchant' ? state.merchantName : state.driverName}</strong>
            <small>{state.role === 'merchant' ? t('Demo merchant · can send requests, cannot approve', 'تاجر تجريبي · يرسل الطلبات ولا يوافق عليها') : t(`Demo driver · wallet ${kwd(state.balanceFils)}`, `سائق تجريبي · المحفظة ${kwd(state.balanceFils)}`)}</small>
          </div>
          <div className="demo-role-tabs" role="group" aria-label={t('Switch persona', 'بدّل الشخصية')}>
            <button aria-pressed={state.role === 'merchant'} disabled={busy !== null || state.role === 'merchant'} onClick={() => switchRole('merchant')} data-testid="button-demo-switch-merchant"><Store size={14}/>{t('Merchant', 'التاجر')}</button>
            <button aria-pressed={state.role === 'driver'} disabled={busy !== null || state.role === 'driver'} onClick={() => switchRole('driver')} data-testid="button-demo-switch-driver"><Car size={14}/>{t('Driver', 'السائق')}</button>
          </div>
        </div>

        {state.role === 'merchant' && !pending && !closed && <MerchantScan t={t} busy={busy} onSend={plate => run('send', async () => {
          await setDemoPlate(plate);
          await createPaymentRequest({ plateNumber: plate, amountFils: DEMO_AMOUNT, serviceCategory: 'drive_thru', description: 'Demo drive-thru order', orderReference: 'Guided demo' });
          await load();
        })}/>}

        {pending && <section className="panel demo-stage fade-up">
          <span className="eyebrow">{t('STEP 3', 'الخطوة 3')}</span>
          {state.role === 'merchant' ? <>
            <h2>{t('Request sent. The driver decides now.', 'أُرسل الطلب. القرار الآن للسائق.')}</h2>
            <div className="demo-wait" role="status"><span className="pulse"/>{t(`Waiting for ${state.driverName} to approve ${kwd(pending.amountFils)} for plate ${pending.plateNumber}.`, `بانتظار موافقة ${state.driverName} على ${kwd(pending.amountFils)} للوحة ${pending.plateNumber}.`)}</div>
            <p style={{ color: '#6c7c87', fontSize: 12 }}>{t('Merchants cannot approve. Switch to the driver to review this request.', 'لا يستطيع التاجر الموافقة. انتقل إلى السائق لمراجعة الطلب.')}</p>
            <button className="btn btn-primary" disabled={busy !== null} onClick={() => switchRole('driver')} data-testid="button-demo-go-driver"><Car size={15}/>{busy === 'switch-driver' ? t('Switching', 'جارٍ التبديل') : t('Switch to driver', 'انتقل إلى السائق')}</button>
          </> : <>
            <h2>{t('A merchant wants to charge your plate.', 'تاجر يطلب الدفع من لوحتك.')}</h2>
            <div className="demo-summary">
              <div className="detail-pair"><span>{t('Merchant', 'التاجر')}</span><b>{pending.merchantName}</b></div>
              <div className="detail-pair"><span>{t('Plate', 'اللوحة')}</span><b className="plate-cell">{pending.plateNumber}</b></div>
              <div className="detail-pair"><span>{t('Order', 'الطلب')}</span><b>{pending.description ?? '—'}</b></div>
              <div className="detail-pair"><span>{t('Wallet after approval', 'المحفظة بعد الموافقة')}</span><b>{kwd(state.balanceFils - pending.amountFils)}</b></div>
            </div>
            <div className="demo-amount" style={{ margin: '14px 0 4px' }}>{kwd(pending.amountFils)}</div>
            <div className="demo-hint"><MapPin size={15}/>{t(`Simulated location: approval uses the demo merchant's coordinates (${state.location.latitude.toFixed(4)}, ${state.location.longitude.toFixed(4)}) instead of your device location. Real accounts use real location checks.`, `موقع محاكى: تستخدم الموافقة إحداثيات التاجر التجريبي (${state.location.latitude.toFixed(4)}, ${state.location.longitude.toFixed(4)}) بدلاً من موقع جهازك. الحسابات الحقيقية تستخدم الموقع الفعلي.`)}</div>
            <div className="demo-actions"><button className="btn btn-primary" disabled={busy !== null} onClick={() => run('approve', async () => { await approvePaymentRequest(pending.id, { latitude: state.location.latitude, longitude: state.location.longitude, idempotencyKey: crypto.randomUUID() }); await load(); })} data-testid="button-demo-approve"><CheckCircle2 size={15}/>{busy === 'approve' ? t('Approving', 'جارٍ الموافقة') : t('Approve demo payment', 'وافق على الدفعة التجريبية')}</button></div>
          </>}
        </section>}

        {!pending && closed && <section className="panel demo-stage fade-up">
          <span className="eyebrow">{t('STEP 4', 'الخطوة 4')}</span>
          <h2>{approved ? t('Paid, and on the record twice.', 'تم الدفع، ومسجّل في السجلين.') : t('This request is closed.', 'هذا الطلب مغلق.')}</h2>
          <div className="demo-done" role="status"><CheckCircle2 size={18}/><span>{t(`${kwd(closed.amountFils)} for plate ${closed.plateNumber} · status ${closed.status} · driver wallet now ${kwd(state.balanceFils)}`, `${kwd(closed.amountFils)} للوحة ${closed.plateNumber} · الحالة ${closed.status} · محفظة السائق الآن ${kwd(state.balanceFils)}`)}</span></div>
          <p style={{ color: '#6c7c87', fontSize: 12, margin: 0 }}>{t('Switch personas to see each side. To run the story again, exit the demo and start a new one; these histories stay persisted.', 'بدّل الشخصيات لرؤية كل طرف. لإعادة القصة، أنهِ العرض وابدأ عرضاً جديداً؛ تبقى هذه السجلات محفوظة.')}</p>
        </section>}

        {state.role === 'driver' && !pending && !closed && <section className="panel demo-stage">
          <span className="eyebrow">{t('DRIVER', 'السائق')}</span>
          <h2>{t('No requests yet.', 'لا توجد طلبات بعد.')}</h2>
          <p>{t('Drivers cannot send requests. Switch to the merchant to read the plate and send one.', 'لا يستطيع السائق إرسال طلبات. انتقل إلى التاجر لقراءة اللوحة وإرسال طلب.')}</p>
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => switchRole('merchant')} data-testid="button-demo-go-merchant"><Store size={15}/>{t('Switch to merchant', 'انتقل إلى التاجر')}</button>
        </section>}

        <div className="demo-histories">
          <History title={t('Driver history', 'سجل السائق')} own={state.role === 'driver'} items={state.histories.driver} t={t} testid="list-demo-driver-history"/>
          <History title={t('Merchant history', 'سجل التاجر')} own={state.role === 'merchant'} items={state.histories.merchant} t={t} testid="list-demo-merchant-history"/>
        </div>
      </>}
    </main>
  </div>;
}

function History({ title, own, items, t, testid }: { title: string; own: boolean; items: Transaction[]; t: (en: string, ar: string) => string; testid: string }) {
  return <section className={`panel demo-history ${own ? 'is-own' : ''}`} data-testid={testid}>
    <div className="panel-heading"><div><h2>{title}</h2><span>{own ? t('Your current persona', 'شخصيتك الحالية') : t('The other side of the same payment', 'الطرف الآخر من الدفعة نفسها')}</span></div></div>
    {items.length === 0 ? <div className="empty-state" style={{ minHeight: 120 }}><strong>{t('Nothing recorded yet', 'لا شيء مسجّل بعد')}</strong><span>{t('Approved payments appear here.', 'تظهر الدفعات المعتمدة هنا.')}</span></div>
      : <ul>{items.map(x => <li key={x.id}>
        <span><b>{x.merchantName ?? x.type}</b> · <span className="plate-cell">{x.plateNumber ?? '—'}</span></span>
        <span className="money-cell">{kwd(x.amountFils)}</span>
        <code>{t('Receipt', 'إيصال')} {x.id}</code>
        <span className={`status status-${x.status}`}>{x.status}</span>
      </li>)}</ul>}
  </section>;
}

function MerchantScan({ t, busy, onSend }: { t: (en: string, ar: string) => string; busy: string | null; onSend: (plate: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [plate, setPlate] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [ocr, setOcr] = useState<{ status: 'idle' | 'reading' | 'read' | 'low' | 'error'; confidence?: number; message?: string }>({ status: 'idle' });
  const token = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);
  useEffect(() => () => { token.current++; }, []);

  const reset = () => { token.current++; setFile(null); setSourceUrl(null); setIsSample(false); setZoom(1); setPlate(''); setReviewed(false); setOcr({ status: 'idle' }); };

  const recognize = async (f: File, z: number) => {
    const my = ++token.current;
    setOcr({ status: 'reading' }); setReviewed(false); setPlate('');
    try {
      const { readKuwaitPlate } = await import('../lib/read-kuwait-plate');
      const result = await readKuwaitPlate(f, z);
      if (my !== token.current) return;
      if (result.plate) { setPlate(result.plate); setOcr({ status: 'read', confidence: result.confidence }); }
      else setOcr({ status: 'low', confidence: result.confidence });
    } catch (e) {
      if (my === token.current) setOcr({ status: 'error', message: errText(e) });
    }
  };

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    reset();
    setFile(f); setSourceUrl(URL.createObjectURL(f)); setIsSample(false);
  };

  const useSample = async () => {
    reset();
    const my = token.current;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}demo/sample-car.svg`);
      if (!res.ok) throw new Error('Sample image unavailable.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error('Sample image could not be decoded.')); img.src = url; });
      const sx = (img.naturalWidth || 1200) / 1200, sy = (img.naturalHeight || 800) / 800;
      const canvas = document.createElement('canvas');
      canvas.width = SAMPLE_CROP.width * 2; canvas.height = SAMPLE_CROP.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable.');
      ctx.drawImage(img, SAMPLE_CROP.x * sx, SAMPLE_CROP.y * sy, SAMPLE_CROP.width * sx, SAMPLE_CROP.height * sy, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('Crop failed.')), 'image/png'));
      if (my !== token.current) { URL.revokeObjectURL(url); return; }
      const cropped = new File([png], 'sample-plate-crop.png', { type: 'image/png' });
      setSourceUrl(url); setIsSample(true); setFile(cropped); setZoom(1);
      void recognize(cropped, 1);
    } catch (e) { setOcr({ status: 'error', message: errText(e) }); }
  };

  const valid = /^\d{2,8}$/.test(plate) && file !== null && (ocr.status === 'read' || ocr.status === 'low');

  return <section className="panel demo-stage fade-up">
    <span className="eyebrow">{t('STEPS 1–2 · MERCHANT', 'الخطوتان 1–2 · التاجر')}</span>
    <h2>{t('Read the plate, then send the request.', 'اقرأ اللوحة ثم أرسل الطلب.')}</h2>
    <p>{t('Recognition runs in your browser. The photo is never uploaded or saved; only the plate you review is sent.', 'يجري التعرّف في متصفحك. لا تُرفع الصورة ولا تُحفظ؛ تُرسل فقط اللوحة التي راجعتها.')}</p>
    <div className="demo-grid">
      <div>
        <div className="demo-source">
          {sourceUrl ? <>
            <img src={sourceUrl} alt={isSample ? t('Illustrative synthetic car with plate crop area', 'سيارة توضيحية مع منطقة قص اللوحة') : t('Your uploaded photo', 'صورتك المرفوعة')}/>
            <span className="demo-source-tag">{isSample ? t('ILLUSTRATIVE SAMPLE · NOT A REAL PHOTO', 'عينة توضيحية · ليست صورة حقيقية') : t('YOUR PHOTO · NOT SAVED', 'صورتك · لا تُحفظ')}</span>
          </> : <div className="demo-choose">
            <ScanLine size={26} color="#078968"/>
            <span>{t('Use the sample car or upload your own photo.', 'استخدم السيارة النموذجية أو ارفع صورتك.')}</span>
            <div>
              <button className="btn btn-primary" onClick={useSample} data-testid="button-demo-sample">{t('Use sample car image', 'استخدم صورة السيارة النموذجية')}</button>
              <button className="btn btn-quiet" onClick={() => inputRef.current?.click()} data-testid="button-demo-upload"><ImageUp size={14}/>{t('Upload photo', 'ارفع صورة')}</button>
            </div>
          </div>}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onUpload} data-testid="input-demo-photo"/>
        </div>
        {file && <>
          <div className="demo-crop"><PlatePhotoPreview file={file} zoom={zoom}/></div>
          {!isSample && <div className="crop-controls">
            <label>{t('Zoom', 'التكبير')}<input type="range" min={1} max={4} step={0.1} value={zoom} onChange={e => { token.current++; setOcr({ status: 'idle' }); setZoom(Number(e.target.value)); }} aria-label={t('Plate crop zoom', 'تكبير قص اللوحة')} data-testid="input-demo-zoom"/></label>
            <button className="btn btn-dark" disabled={ocr.status === 'reading'} onClick={() => recognize(file, zoom)} data-testid="button-demo-recognize"><ScanLine size={14}/>{t('Read plate', 'اقرأ اللوحة')}</button>
          </div>}
          <div className="demo-hint"><Info size={15}/>{isSample ? t('Sample only: the plate area is cut from a known square of the illustration, then read by the same OCR.', 'للعينة فقط: تُقص منطقة اللوحة من مربع معروف في الرسم ثم تُقرأ بنفس أداة التعرّف.') : t('Full car photos rarely read well. Zoom until the plate fills the frame and the series and number sit inside the two outlines.', 'نادراً ما تُقرأ صور السيارة الكاملة جيداً. كبّر حتى تملأ اللوحة الإطار ويقع الرمز والرقم داخل الإطارين.')}</div>
          <div className="demo-actions"><button className="table-link" onClick={reset} data-testid="button-demo-clear-photo">{t('Choose a different image', 'اختر صورة أخرى')}</button></div>
        </>}
      </div>
      <div className="demo-review">
        {ocr.status === 'reading' && <div className="ocr-message" role="status"><ScanLine size={14}/>{t('Reading plate in your browser…', 'جارٍ قراءة اللوحة في متصفحك…')}</div>}
        {ocr.status === 'read' && <div className="demo-hint"><CheckCircle2 size={15}/>{t(`Plate read at ${Math.round(ocr.confidence ?? 0)}% confidence. Check it against the image.`, `قُرئت اللوحة بثقة ${Math.round(ocr.confidence ?? 0)}٪. طابقها مع الصورة.`)}</div>}
        {ocr.status === 'low' && <div className="demo-hint warn"><TriangleAlert size={15}/>{t('Low confidence. Nothing was filled in. Adjust the crop and read again, or type the plate exactly as shown.', 'ثقة منخفضة. لم يُملأ شيء. عدّل القص وأعد القراءة أو اكتب اللوحة كما تظهر تماماً.')}</div>}
        {ocr.status === 'error' && <div className="demo-hint err"><TriangleAlert size={15}/>{ocr.message} {t('Adjust the image and read again.', 'عدّل الصورة وأعد القراءة.')}</div>}
        <label className="form-field" style={{ margin: 0 }}>
          <span className="field-label">{t('Reviewed plate (series + number, digits only)', 'اللوحة المراجعة (الرمز + الرقم، أرقام فقط)')}</span>
          <input className="input plate-input" inputMode="numeric" value={plate} dir="ltr"
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
            onChange={e => { setPlate(stripPlateWhitespace(e.target.value)); setReviewed(false); }}
            placeholder="1234567" data-testid="input-demo-plate"/>
        </label>
        <label className="demo-check"><input type="checkbox" checked={reviewed} disabled={!valid} onChange={e => setReviewed(e.target.checked)} data-testid="checkbox-demo-reviewed"/>{t('I checked this plate against the image.', 'طابقت هذه اللوحة مع الصورة.')}</label>
        <div className="demo-summary">
          <div className="detail-pair"><span>{t('Service', 'الخدمة')}</span><b>{t('Drive-thru', 'طلب من السيارة')}</b></div>
          <div className="detail-pair"><span>{t('Order', 'الطلب')}</span><b>Demo drive-thru order</b></div>
          <div className="detail-pair" style={{ borderBottom: 0 }}><span>{t('Amount', 'المبلغ')}</span><b>{kwd(DEMO_AMOUNT)}</b></div>
        </div>
        <div className="request-notice"><Info size={14}/>{t('The reviewed plate is linked only to your private demo driver, then a pending request is created. No money moves until the driver approves.', 'تُربط اللوحة المراجعة بسائقك التجريبي الخاص فقط، ثم يُنشأ طلب معلّق. لا تُنقل أي أموال قبل موافقة السائق.')}</div>
        <button className="btn btn-primary full-btn" disabled={!valid || !reviewed || busy !== null || ocr.status === 'reading'} onClick={() => onSend(plate)} data-testid="button-demo-send-request">{busy === 'send' ? t('Sending request', 'جارٍ الإرسال') : t(`Send ${kwd(DEMO_AMOUNT)} request`, `أرسل طلب ${kwd(DEMO_AMOUNT)}`)}<ArrowRight size={15}/></button>
      </div>
    </div>
  </section>;
}
