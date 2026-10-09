import { useState } from 'react';
import { KeyRound, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { useChangePassword, useLogoutAll } from '@/hooks/use-auth';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Matches the backend's minimum (auth.schema.js), so the form refuses what the
// API would refuse before the request is sent.
const MIN_LENGTH = 8;

/**
 * Password change and "sign out everywhere" for the signed-in user.
 *
 * Both end every session the account has, this one included, so each says so
 * before it acts: changing a password is also how you lock out a device you
 * no longer trust.
 */
export function AccountSecurityCard() {
  const { glassMode } = useUIStore();
  const changePassword = useChangePassword();
  const logoutAll = useLogoutAll();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < MIN_LENGTH) {
      setError(`The new password must be at least ${MIN_LENGTH} characters long.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Choose a password different from the current one.');
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      { onError: (err) => setError(err.response?.data?.message || 'Could not change the password. Please try again.') }
    );
  };

  return (
    <div className={cn('rounded-xl border border-border p-6 space-y-6', glassMode ? 'glass-card' : 'bg-card')}>
      <div>
        <h2 className="text-lg font-semibold">Sign-in &amp; security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Changing your password signs you out on every device, including this one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={changePassword.isPending}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={changePassword.isPending}
            aria-describedby="new-password-hint"
            required
          />
          <p id="new-password-hint" className="text-xs text-muted-foreground">At least {MIN_LENGTH} characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={changePassword.isPending}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
        >
          {changePassword.isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound size={16} className="mr-2" aria-hidden="true" />
          )}
          Change password
        </Button>
      </form>

      <div className="pt-5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sign out everywhere</p>
          <p className="text-sm text-muted-foreground">
            Ends your session on every browser and device, this one included.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmSignOutOpen(true)}
          disabled={logoutAll.isPending}
        >
          {logoutAll.isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut size={16} className="mr-2" aria-hidden="true" />
          )}
          Sign out everywhere
        </Button>
      </div>

      <ConfirmDialog
        open={confirmSignOutOpen}
        onOpenChange={setConfirmSignOutOpen}
        title="Sign out everywhere?"
        description="Every session on every device will end, including this one. You will need to sign in again."
        onConfirm={() => logoutAll.mutate()}
        confirmText="Sign out everywhere"
        variant="destructive"
      />
    </div>
  );
}
