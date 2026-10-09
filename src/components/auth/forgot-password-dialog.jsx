import { useState } from 'react';
import { useForgotPassword } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { KeyRound, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function ForgotPasswordDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordMutation = useForgotPassword();
  const isLoading = forgotPasswordMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;

    forgotPasswordMutation.mutate(
      { email },
      {
        // The API answers the same way whether or not the account exists, and
        // never returns the link itself — it goes only to the mailbox.
        onSuccess: () => setSubmitted(true),
      }
    );
  };

  const handleClose = (val) => {
    onOpenChange(val);
    if (!val) {
      // Clear after the close animation so the content doesn't flicker on the
      // way out; reset the mutation too, or a stale error greets the reopen.
      setTimeout(() => {
        setEmail('');
        setSubmitted(false);
        forgotPasswordMutation.reset();
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="infideep-auth sm:max-w-[440px] id-glass-card border-white/10 rounded-[24px] p-7 text-infideep-on-surface font-sans overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] id-gradient opacity-90" />

        <DialogHeader className="space-y-3">
          <div className="w-12 h-12 rounded-xl bg-infideep-surface-high border border-infideep-outline-variant/40 flex items-center justify-center">
            <KeyRound size={22} className="text-infideep-primary" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-[24px] leading-[32px] font-semibold text-left">
            Forgot password?
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-[20px] text-infideep-on-surface-variant/90 text-left">
            Enter your account email address and we will send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-5 pt-2">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[14px]">
                <CheckCircle2 size={18} aria-hidden="true" /> Check your inbox
              </div>
              <p className="text-[13px] leading-[20px] text-infideep-on-surface/90">
                If an account exists for <strong>{email}</strong>, we have sent it a password reset
                link. It expires in 15 minutes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleClose(false)}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-lg shadow-md text-[12px] font-semibold uppercase tracking-[0.05em] text-white id-gradient hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-infideep-primary focus-visible:ring-offset-infideep-bg active:scale-[0.98] transition-all duration-200"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {forgotPasswordMutation.isError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-lg bg-[#93000a]/25 border border-infideep-error/40 text-infideep-error text-[13px] font-medium"
              >
                <AlertCircle size={16} className="shrink-0 mt-px" aria-hidden="true" />
                <span>Failed to send reset link. Please try again.</span>
              </div>
            )}

            <div>
              {/* Scoped id — the login form behind this dialog already owns
                  "email", and duplicate ids break label association. */}
              <label
                htmlFor="forgot-email"
                className="block text-[14px] leading-[20px] mb-2 ml-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-infideep-outline-variant" aria-hidden="true" />
                </div>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="id-input block w-full pl-10 pr-3 py-3.5 rounded-lg text-[14px] shadow-inner"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="w-full py-3.5 px-4 rounded-lg border border-infideep-outline-variant/70 bg-infideep-surface/80 hover:bg-infideep-surface-high text-[12px] font-semibold uppercase tracking-[0.05em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-infideep-grad-start"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-lg shadow-md text-[12px] font-semibold uppercase tracking-[0.05em] text-white id-gradient hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-infideep-primary focus-visible:ring-offset-infideep-bg active:scale-[0.98] transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <span>{isLoading ? 'Sending…' : 'Send Link'}</span>
                {isLoading && (
                  <Loader2 size={16} className="ml-2 animate-spin" aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
