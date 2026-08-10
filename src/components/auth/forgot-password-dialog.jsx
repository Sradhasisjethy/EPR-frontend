import { useState } from 'react';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { KeyRound, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export function ForgotPasswordDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: (data) => {
          setSubmitted(true);
          if (data?.data?.resetUrl) {
            setDevResetUrl(data.data.resetUrl);
          }
        },
      }
    );
  };

  const handleClose = (val) => {
    onOpenChange(val);
    if (!val) {
      setTimeout(() => {
        setEmail('');
        setSubmitted(false);
        setDevResetUrl('');
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] glass-card border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold mb-1">
            <KeyRound size={24} />
          </div>
          <DialogTitle className="text-xl font-bold">Forgot Password?</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter your account email address. We will send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 size={18} /> Email Sent!
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                We have sent password reset instructions to <strong>{email}</strong>. Please check your inbox.
              </p>
            </div>

            {devResetUrl && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1 text-xs">
                <span className="font-bold text-primary flex items-center gap-1">
                  ✨ Local Dev Quick Reset Link:
                </span>
                <a
                  href={devResetUrl}
                  className="text-primary hover:underline break-all font-mono text-[11px]"
                >
                  {devResetUrl}
                </a>
              </div>
            )}

            <Button onClick={() => handleClose(false)} className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {forgotPasswordMutation.isError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>Failed to send reset link. Please try again.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john.smith@acme.corp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} className="w-full">
                Cancel
              </Button>
              <Button type="submit" disabled={forgotPasswordMutation.isPending} className="w-full">
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
