import { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import { useLogin } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { glassMode } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    <div className={cn(
      "p-8 rounded-2xl shadow-2xl border border-border/50 backdrop-blur-2xl transition-all duration-500",
      glassMode ? "bg-background/40" : "bg-card"
    )}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent mb-2">
          ERP Pro
        </h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-lg border border-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none",
                glassMode ? "bg-background/50" : "bg-background"
              )}
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Password</label>
            <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-lg border border-input focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none",
                glassMode ? "bg-background/50" : "bg-background"
              )}
              required
            />
          </div>
        </div>

        <div className="flex items-center">
          <input type="checkbox" id="remember" className="rounded border-input text-primary focus:ring-primary mr-2" />
          <label htmlFor="remember" className="text-sm text-muted-foreground">Remember me for 30 days</label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 bg-gradient-to-r from-primary to-violet-500 text-white rounded-lg font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
