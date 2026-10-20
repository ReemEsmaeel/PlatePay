import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import './AuthForm.css';

type Locale = 'en' | 'ar';
export interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
  locale: Locale;
  onSubmit: (data: { email: string; password: string; displayName?: string }) => Promise<void>;
}

const t = (l: Locale, en: string, ar: string) => (l === 'ar' ? ar : en);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorMessage(err: unknown, locale: Locale): string {
  const anyErr = err as { message?: unknown; data?: { error?: unknown } } | null;
  const dataErr = anyErr?.data?.error;
  if (typeof dataErr === 'string' && dataErr.trim()) return dataErr;
  if (typeof anyErr?.message === 'string' && anyErr.message.trim()) return anyErr.message;
  return t(locale, 'Something went wrong. Please try again.', 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
}

export function AuthForm({ mode, locale, onSubmit }: AuthFormProps) {
  const isSignUp = mode === 'sign-up';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const validate = (): string | null => {
    if (isSignUp && !displayName.trim()) return t(locale, 'Enter your name.', 'أدخل اسمك.');
    if (!EMAIL_RE.test(email.trim())) return t(locale, 'Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صالحًا.');
    if (!password) return t(locale, 'Enter your password.', 'أدخل كلمة المرور.');
    if (isSignUp) {
      if (password.length < 8 || password.length > 128) return t(locale, 'Password must be 8 to 128 characters.', 'يجب أن تتكون كلمة المرور من 8 إلى 128 حرفًا.');
      if (password !== confirm) return t(locale, 'Passwords do not match.', 'كلمتا المرور غير متطابقتين.');
    } else if (password.length > 128) {
      return t(locale, 'Password must be at most 128 characters.', 'يجب ألا تتجاوز كلمة المرور 128 حرفًا.');
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inFlight.current) return;
    const v = validate();
    if (v) { setError(v); return; }
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), password, ...(isSignUp ? { displayName: displayName.trim() } : {}) });
    } catch (err) {
      setError(errorMessage(err, locale));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const pwType = show ? 'text' : 'password';
  const toggleLabel = show ? t(locale, 'Hide password', 'إخفاء كلمة المرور') : t(locale, 'Show password', 'إظهار كلمة المرور');

  return (
    <section className="authform panel fade-up" dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="authform-title">
      <div className="authform-mark"><LockKeyhole size={20} aria-hidden="true" /></div>
      <div className="eyebrow">{isSignUp ? t(locale, 'Create account', 'إنشاء حساب') : t(locale, 'Welcome back', 'مرحبًا بعودتك')}</div>
      <h1 id="authform-title">{isSignUp ? t(locale, 'Set up your PlatePay access', 'أنشئ حسابك في PlatePay') : t(locale, 'Sign in to PlatePay', 'سجّل الدخول إلى PlatePay')}</h1>
      <p className="authform-sub">{isSignUp
        ? t(locale, 'You will choose how you use PlatePay in the next step.', 'ستختار طريقة استخدامك لـ PlatePay في الخطوة التالية.')
        : t(locale, 'Use the email and password for your account.', 'استخدم البريد الإلكتروني وكلمة المرور الخاصة بحسابك.')}</p>

      <form onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="authform-fields">
          {isSignUp && (
            <div className="form-field">
              <label className="field-label" htmlFor="auth-name">{t(locale, 'Full name', 'الاسم الكامل')}</label>
              <input id="auth-name" className="input" type="text" autoComplete="name" required maxLength={120}
                value={displayName} onChange={e => setDisplayName(e.target.value)} data-testid="input-auth-name" />
            </div>
          )}
          <div className="form-field">
            <label className="field-label" htmlFor="auth-email">{t(locale, 'Email address', 'البريد الإلكتروني')}</label>
            <input id="auth-email" className="input authform-ltr" type="email" dir="ltr" inputMode="email" autoComplete="email"
              autoCapitalize="none" spellCheck={false} required value={email} onChange={e => setEmail(e.target.value)} data-testid="input-auth-email" />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor="auth-password">{t(locale, 'Password', 'كلمة المرور')}</label>
            <div className="authform-pw">
              <input id="auth-password" className="input" type={pwType} dir="ltr" required minLength={isSignUp ? 8 : undefined} maxLength={128}
                autoComplete={isSignUp ? 'new-password' : 'current-password'} aria-describedby={isSignUp ? 'auth-pw-hint' : undefined}
                value={password} onChange={e => setPassword(e.target.value)} data-testid="input-auth-password" />
              <button type="button" className="authform-eye" onClick={() => setShow(s => !s)} aria-label={toggleLabel}
                aria-pressed={show} aria-controls="auth-password" data-testid="button-auth-toggle-password">
                {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            {isSignUp && <small id="auth-pw-hint" className="authform-hint">{t(locale, '8 to 128 characters.', 'من 8 إلى 128 حرفًا.')}</small>}
          </div>
          {isSignUp && (
            <div className="form-field">
              <label className="field-label" htmlFor="auth-confirm">{t(locale, 'Confirm password', 'تأكيد كلمة المرور')}</label>
              <input id="auth-confirm" className="input" type={pwType} dir="ltr" required maxLength={128} autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)} data-testid="input-auth-confirm-password" />
            </div>
          )}
        </fieldset>

        {error && <div className="authform-error" role="alert" data-testid="text-auth-error">{error}</div>}

        <button type="submit" className="btn btn-primary full-btn" disabled={pending} data-testid="button-auth-submit">
          {pending && <Loader2 size={16} className="authform-spin" aria-hidden="true" />}
          {pending
            ? (isSignUp ? t(locale, 'Creating account…', 'جارٍ إنشاء الحساب…') : t(locale, 'Signing in…', 'جارٍ تسجيل الدخول…'))
            : (isSignUp ? t(locale, 'Create account', 'إنشاء حساب') : t(locale, 'Sign in', 'تسجيل الدخول'))}
        </button>
      </form>

      <p className="authform-switch">
        {isSignUp ? t(locale, 'Already have an account?', 'لديك حساب بالفعل؟') : t(locale, 'New to PlatePay?', 'جديد في PlatePay؟')}{' '}
        <Link href={isSignUp ? '/sign-in' : '/sign-up'} className="table-link" data-testid={isSignUp ? 'link-auth-sign-in' : 'link-auth-sign-up'}>
          {isSignUp ? t(locale, 'Sign in', 'تسجيل الدخول') : t(locale, 'Create an account', 'أنشئ حسابًا')}
        </Link>
      </p>
    </section>
  );
}
