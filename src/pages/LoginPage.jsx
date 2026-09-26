import { useEffect, useState } from 'react';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  BarChart3,
  Landmark,
  Factory,
  ShieldCheck,
  Building2,
  ArrowUpFromLine,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLogin } from '@/hooks/use-auth';
import { ForgotPasswordDialog } from '@/components/auth/forgot-password-dialog';
import { InfideepLogo } from '@/components/auth/infideep-logo';

/** Only the address is remembered — never the password. */
const REMEMBERED_EMAIL_KEY = 'infideep-remembered-email';

const HIGHLIGHTS = [
  { icon: BarChart3, label: 'Analytics', tone: 'text-infideep-primary' },
  { icon: Landmark, label: 'Finance', tone: 'text-infideep-secondary' },
  { icon: Factory, label: 'Operations', tone: 'text-infideep-primary-container' },
];

/**
 * Hidden until there is an OAuth endpoint to point them at.
 *
 * The buttons, provider marks and layout below are kept rather than deleted:
 * they match the comp and work, and showing a user three sign-in options that
 * cannot sign anyone in is worse than not offering them. Flip to true once
 * /auth has a provider route.
 */
const SSO_ENABLED = false;

/** Marks placed by the comp that have no endpoint behind them yet. */
function notConfigured(feature) {
  toast.info(`${feature} is not configured yet.`, {
    description: 'Sign in with your work email and password for now.',
  });
}

function MicrosoftMark() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11.4 11.4H0V0h11.4v11.4Z" fill="#F25022" />
      <path d="M24 11.4H12.6V0H24v11.4Z" fill="#7FBA00" />
      <path d="M11.4 24H0V12.6h11.4V24Z" fill="#00A4EF" />
      <path d="M24 24H12.6V12.6H24V24Z" fill="#FFB900" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// `short` is used when the card is compacted for a short viewport, where three
// full-width rows cost ~140px that a 620px-tall screen simply does not have.
const SSO_PROVIDERS = [
  { key: 'google', label: 'Continue with Google', short: 'Google', Mark: GoogleMark, feature: 'Google sign-in' },
  { key: 'microsoft', label: 'Continue with Microsoft', short: 'Microsoft', Mark: MicrosoftMark, feature: 'Microsoft sign-in' },
  { key: 'sso', label: 'Continue with SSO', short: 'SSO', Mark: () => <Building2 size={18} className="shrink-0" />, feature: 'Enterprise SSO' },
];

const FOOTER_LINKS = [
  { label: 'Privacy Policy', feature: 'The privacy policy page' },
  { label: 'Terms of Service', feature: 'The terms of service page' },
  { label: 'Contact Support', feature: 'Support contact' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState('');
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);

  const loginMutation = useLogin();
  const navigate = useNavigate();
  const isLoading = loginMutation.isPending;

  // Restore a remembered address so a returning user only types a password.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* storage blocked (private window, hardened browser) — start empty */
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          try {
            if (rememberMe) {
              window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
            } else {
              window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
            }
          } catch {
            /* remembering is a convenience — never block the sign-in on it */
          }
          navigate('/');
        },
        onError: (err) => {
          const serverMessage = err.response?.data?.message;
          const networkError = !err.response || err.code === 'ERR_NETWORK';
          setError(
            serverMessage || (networkError ? 'Unable to connect to the server. Check your network connections.' : 'Failed to sign in. Please check your credentials.')
          );
        },
      }
    );
  };

  // Caps Lock is the single most common cause of a "wrong password" that isn't.
  const syncCapsLock = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  return (
    <>
      <div className="infideep-auth min-h-screen lg:h-screen lg:overflow-hidden w-full flex bg-infideep-bg text-infideep-on-surface font-sans selection:bg-infideep-primary selection:text-[#660026]">
        {/* ---------------------------------------------------------------
            Left: brand experience. Purely decorative, so it drops away
            entirely below lg rather than squeezing the form.
            --------------------------------------------------------------- */}
        <div className="hidden lg:flex w-[60%] h-full relative flex-col justify-between p-8 tall:p-12 overflow-hidden border-r border-infideep-outline-variant/30">
          <div className="absolute inset-0 bg-gradient-to-br from-infideep-bg/80 via-infideep-bg/40 to-infideep-bg/90 z-0 pointer-events-none" />
          <div className="absolute inset-0 id-bg-glow z-0 pointer-events-none mix-blend-screen" />
          <div className="absolute inset-0 id-grid-lines z-0 pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full">
            <div className="mb-auto pt-2 tall:pt-8">
              <InfideepLogo glow className="h-[52px] tall:h-[68px] 2xl:h-[124px] w-auto" />
            </div>

            <div className="mt-auto max-w-2xl 2xl:max-w-4xl mb-8 tall:mb-16">
              <h1 className="font-display text-[34px] leading-[42px] tall:text-[48px] tall:leading-[56px] 2xl:text-[84px] 2xl:leading-[96px] font-bold tracking-[-0.02em] mb-4 tall:mb-6 drop-shadow-md">
                Powering Smarter <br />
                <span className="id-text-gradient">Enterprise Operations</span>
              </h1>
              <p className="text-[15px] leading-[24px] tall:text-[18px] tall:leading-[28px] 2xl:text-[26px] 2xl:leading-[38px] max-w-xl 2xl:max-w-[42ch] opacity-90">
                Manage your people, processes, and business operations from one intelligent
                platform designed for scale and performance.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 tall:gap-6 items-center pb-2 tall:pb-8">
              {HIGHLIGHTS.map(({ icon: Icon, label, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 tall:gap-3 bg-infideep-surface-low/60 backdrop-blur-md p-2.5 tall:p-3.5 2xl:p-6 rounded-lg border border-infideep-outline-variant/30 shadow-lg"
                >
                  <Icon size={20} className={tone} aria-hidden="true" />
                  <span className="text-[12px] 2xl:text-[16px] font-semibold uppercase tracking-[0.05em]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------
            Right: the actual sign-in surface.
            --------------------------------------------------------------- */}
        <div className="w-full lg:w-[40%] lg:h-full lg:overflow-y-auto bg-infideep-bg relative z-20">
          {/* min-h-full + justify-center centres the card while it fits and lets
              it scroll once it does not, instead of overflowing out of reach. */}
          <div className="flex flex-col justify-center items-center min-h-full px-4 py-8 md:px-10 xl:px-12">
          {/* Mobile brand header, standing in for the hidden left panel. */}
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <InfideepLogo glow showWordmark={false} className="h-12 w-auto mb-4" />
            <h1 className="font-display text-[24px] leading-[32px] font-semibold id-text-gradient">
              INFIDEEP ERP
            </h1>
          </div>

          <div className="w-full max-w-[440px] 2xl:max-w-[720px] id-glass-card rounded-[24px] p-6 sm:p-7 tall:p-10 2xl:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] id-gradient opacity-90" />

            <div className="mb-6 tall:mb-8">
              <h2 className="font-display text-[22px] leading-[30px] tall:text-[24px] tall:leading-[32px] 2xl:text-[40px] 2xl:leading-[50px] font-semibold mb-2">
                Welcome back
              </h2>
              <p className="text-[14px] 2xl:text-[19px] leading-[20px] 2xl:leading-[24px] text-infideep-on-surface-variant/90">
                Enter your credentials to access your workspace.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 tall:mb-6 flex items-start gap-2 p-3 rounded-lg bg-[#93000a]/25 border border-infideep-error/40 text-infideep-error text-[13px] font-medium"
              >
                <AlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 tall:space-y-6 2xl:space-y-7" noValidate={false}>
              <div>
                <label htmlFor="email" className="block text-[14px] 2xl:text-[19px] leading-[20px] mb-2 ml-1">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-infideep-outline-variant" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    disabled={isLoading}
                    required
                    className="id-input block w-full pl-10 pr-3 py-3 tall:py-3.5 2xl:py-5 rounded-lg text-[14px] 2xl:text-[18px] shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[14px] 2xl:text-[19px] leading-[20px] mb-2 ml-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-infideep-outline-variant" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={syncCapsLock}
                    onKeyDown={syncCapsLock}
                    onBlur={() => setCapsLockOn(false)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    required
                    aria-describedby={capsLockOn ? 'caps-lock-warning' : undefined}
                    className={`id-input block w-full pl-10 py-3 tall:py-3.5 2xl:py-5 rounded-lg text-[14px] 2xl:text-[18px] shadow-inner ${
                      capsLockOn ? 'pr-20' : 'pr-11'
                    }`}
                  />

                  {capsLockOn && (
                    <div className="absolute inset-y-0 right-10 pr-2 flex items-center pointer-events-none">
                      <ArrowUpFromLine
                        size={16}
                        className="text-infideep-error"
                        aria-hidden="true"
                      />
                    </div>
                  )}

                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-infideep-outline-variant hover:text-infideep-on-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-infideep-grad-start rounded"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {capsLockOn && (
                  <p
                    id="caps-lock-warning"
                    className="mt-2 ml-1 text-[12px] text-infideep-error"
                  >
                    Caps Lock is on.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="id-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-[14px] 2xl:text-[18px] leading-[20px] cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotDialogOpen(true)}
                  className="text-[12px] font-semibold tracking-[0.05em] text-infideep-primary hover:text-[#ffd9de] transition-colors focus:outline-none focus-visible:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 tall:py-3.5 2xl:py-5 px-4 rounded-lg shadow-md text-[12px] 2xl:text-[17px] font-semibold uppercase tracking-[0.05em] text-white id-gradient hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-infideep-primary focus-visible:ring-offset-infideep-bg active:scale-[0.98] transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span>{isLoading ? 'Signing in…' : 'Sign In'}</span>
                {isLoading && <Loader2 size={18} className="ml-2 animate-spin" aria-hidden="true" />}
              </button>
            </form>

            {SSO_ENABLED && (
            <div className="mt-6 tall:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-infideep-outline-variant/40" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 py-0.5 bg-infideep-surface-high text-[13px] rounded-full border border-infideep-outline-variant/30">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="mt-5 tall:mt-6 grid grid-cols-1 sm:grid-cols-3 tall:grid-cols-1 gap-2 tall:gap-3.5">
                {SSO_PROVIDERS.map(({ key, label, short, Mark, feature }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => notConfigured(feature)}
                    aria-label={label}
                    title={label}
                    className="w-full inline-flex justify-center items-center gap-2 tall:gap-3 py-2.5 tall:py-3 2xl:py-4 px-2 tall:px-4 border border-infideep-outline-variant/70 rounded-lg bg-infideep-surface/80 hover:bg-infideep-surface-high focus:outline-none focus-visible:ring-1 focus-visible:ring-infideep-grad-start focus-visible:border-infideep-grad-start transition-colors duration-200 text-[11px] tall:text-[12px] 2xl:text-[15px] font-semibold uppercase tracking-[0.03em] tall:tracking-[0.05em] shadow-sm"
                  >
                    <Mark />
                    <span className="hidden sm:inline tall:hidden truncate">{short}</span>
                    <span className="inline sm:hidden tall:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

            <div className="hidden tall:block mt-6 pt-5 tall:mt-8 tall:pt-6 border-t border-infideep-outline-variant/30 text-center">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck size={16} className="text-infideep-primary/80 shrink-0" aria-hidden="true" />
                <p className="text-[12px] leading-[18px]">
                  Secure enterprise access protected with industry-standard security.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 tall:mt-10 flex flex-wrap justify-center gap-4 tall:gap-6 text-[13px] 2xl:text-[17px]">
            {FOOTER_LINKS.map(({ label, feature }) => (
              <button
                key={label}
                type="button"
                onClick={() => notConfigured(feature)}
                className="opacity-80 hover:opacity-100 hover:text-infideep-primary transition-colors focus:outline-none focus-visible:underline"
              >
                {label}
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen} />
    </>
  );
}
