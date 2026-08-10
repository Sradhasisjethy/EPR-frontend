import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useResetPassword } from '@/hooks/use-auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { glassMode } = useUIStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetPasswordMutation = useResetPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    resetPasswordMutation.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (err) => {
          setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        },
      }
    );
  };

  return (
    <div className={cn(
      "auth-card p-8 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-2xl transition-all duration-500 max-w-md w-full mx-auto text-white",
      glassMode ? "bg-slate-950/88" : "bg-card"
    )}>
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold mx-auto mb-3 border border-blue-500/30 shadow-md">
          <KeyRound size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight !text-white">Set New Password</h1>
        <p className="text-slate-300 text-xs mt-1">Enter a strong new password for your account</p>
      </div>

      {success ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 space-y-2 shadow-sm">
            <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
            <h3 className="font-bold text-base text-white">Password Reset Successfully!</h3>
            <p className="text-xs text-slate-200">Your account password has been updated. You can now sign in with your new password.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all text-sm"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-blue-400 z-10" />
              <input
                type={showPassword ? "text" : "password"}
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full h-9 pl-9 pr-10 rounded-xl border border-white/20 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all !text-white bg-slate-900/90",
                  glassMode ? "bg-slate-900/90" : "bg-background"
                )}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 p-0.5 text-slate-400 hover:text-blue-400 transition-colors z-10 focus:outline-none"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-blue-400 z-10" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full h-9 pl-9 pr-10 rounded-xl border border-white/20 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none transition-all !text-white bg-slate-900/90",
                  glassMode ? "bg-slate-900/90" : "bg-background"
                )}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2 p-0.5 text-slate-400 hover:text-blue-400 transition-colors z-10 focus:outline-none"
                title={showConfirmPassword ? "Hide Password" : "Show Password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={resetPasswordMutation.isPending}
            className="w-full h-10 bg-gradient-to-r from-primary to-violet-500 text-white rounded-lg font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center disabled:opacity-70 text-sm mt-2"
          >
            {resetPasswordMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
