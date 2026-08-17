import { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useLogin } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordDialog } from '@/components/auth/forgot-password-dialog';

export default function LoginPage() {
  const { glassMode } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/');
        },
        onError: (err) => {
          setError(err.response?.data?.message || 'Failed to sign in. Please check your credentials.');
        },
      }
    );
  };

  const isLoading = loginMutation.isPending;

  return (
    <>
      <div className={cn(
        "auth-card p-8 rounded-3xl shadow-2xl border transition-all duration-500",
        glassMode 
          ? "bg-slate-950/88 border-white/20 backdrop-blur-2xl text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]" 
          : "bg-card border-border/50 text-foreground"
      )}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl mx-auto mb-3 shadow-lg shadow-blue-500/30">
            🏭
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-1 !text-white">
            ERP Pro
          </h1>
          <p className="text-blue-300 text-[11px] font-bold uppercase tracking-widest">Industrial Enterprise Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/15 border border-destructive/30 text-destructive rounded-xl text-xs font-semibold text-center shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-blue-400 z-10" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={cn(
                  "w-full h-10 pl-10 pr-4 rounded-xl border transition-all outline-none text-sm font-medium !text-white",
                  glassMode 
                    ? "bg-slate-900/90 border-white/20 !text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30" 
                    : "bg-background border-input"
                )}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-blue-400 z-10" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "w-full h-10 pl-10 pr-11 rounded-xl border transition-all outline-none text-sm font-medium !text-white",
                  glassMode 
                    ? "bg-slate-900/90 border-white/20 !text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30" 
                    : "bg-background border-input"
                )}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 p-1 text-slate-400 hover:text-blue-400 transition-colors z-10 focus:outline-none"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5">
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                className="rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-blue-500/40 w-4 h-4 mr-2 cursor-pointer" 
              />
              <label htmlFor="remember" className="font-medium text-slate-300 cursor-pointer">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={() => setForgotDialogOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-70 text-sm tracking-wide"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>

      <ForgotPasswordDialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen} />
    </>
  );
}
