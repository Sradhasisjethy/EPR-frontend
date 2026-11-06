import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertCircle, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAcceptInvite } from '@/hooks/use-auth';

/**
 * Landing page for the central platform's owner invitation emails
 * (FRONTEND_URL/accept-invite?token=...). Sets the first password of a
 * provisioned TENANT_OWNER account; the token is single-use and lives 7 days.
 */
export default function AcceptInvitePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // Read once, then taken out of the address bar — same hygiene as the reset
  // page: a token left in the URL ends up in history, screenshots and Referers.
  const [token] = useState(() => searchParams.get('token') || '');
  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const acceptInviteMutation = useAcceptInvite();
  const isLoading = acceptInviteMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing invitation token. Use the link from your invitation email.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    acceptInviteMutation.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (err) => {
          setError(
            err.response?.data?.message ||
              'Could not accept the invitation. The link may have expired or already been used.'
          );
        },
      }
    );
  };

  return (
    <div className="w-full id-glass-card rounded-[24px] p-6 tall:p-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] id-gradient opacity-90" />

      <div className="mb-6 tall:mb-8">
        <div className="w-12 h-12 rounded-xl bg-infideep-surface-high border border-infideep-outline-variant/40 flex items-center justify-center mb-4">
          <UserPlus size={22} className="text-infideep-primary" aria-hidden="true" />
        </div>
        <h1 className="font-display text-[24px] leading-[32px] font-semibold mb-2">
          Welcome to INFIDEEP
        </h1>
        <p className="text-[14px] leading-[20px] text-infideep-on-surface-variant/90">
          You have been invited as your organisation&apos;s administrator. Set a password to
          activate your account.
        </p>
      </div>

      {success ? (
        <div className="space-y-4 tall:space-y-6">
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[14px]">
              <CheckCircle2 size={18} aria-hidden="true" />
              Account activated
            </div>
            <p className="text-[13px] leading-[20px] text-infideep-on-surface/90">
              Your password is set. Sign in to start setting up your organisation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex justify-center items-center py-3 tall:py-3.5 px-4 rounded-lg shadow-md text-[12px] font-semibold uppercase tracking-[0.05em] text-white id-gradient hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-infideep-primary focus-visible:ring-offset-infideep-bg active:scale-[0.98] transition-all duration-200"
          >
            Sign in now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 tall:space-y-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-lg bg-[#93000a]/25 border border-infideep-error/40 text-infideep-error text-[13px] font-medium"
            >
              <AlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-[14px] leading-[20px] mb-2 ml-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-infideep-outline-variant" aria-hidden="true" />
              </div>
              <input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                required
                className="id-input block w-full pl-10 pr-11 py-3 tall:py-3.5 rounded-lg text-[14px] shadow-inner"
              />
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
            <p className="mt-2 ml-1 text-[12px] text-infideep-on-surface-variant/70">
              At least 8 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-[14px] leading-[20px] mb-2 ml-1"
            >
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-infideep-outline-variant" aria-hidden="true" />
              </div>
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                required
                className="id-input block w-full pl-10 pr-11 py-3 tall:py-3.5 rounded-lg text-[14px] shadow-inner"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-infideep-outline-variant hover:text-infideep-on-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-infideep-grad-start rounded"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 tall:py-3.5 px-4 rounded-lg shadow-md text-[12px] font-semibold uppercase tracking-[0.05em] text-white id-gradient hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-infideep-primary focus-visible:ring-offset-infideep-bg active:scale-[0.98] transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span>{isLoading ? 'Activating…' : 'Set password & activate'}</span>
            {isLoading && <Loader2 size={18} className="ml-2 animate-spin" aria-hidden="true" />}
          </button>

          <div className="text-center pt-1">
            <Link
              to="/login"
              className="text-[13px] text-infideep-on-surface-variant/80 hover:text-infideep-primary transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
