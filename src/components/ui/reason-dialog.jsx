import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ReasonDialog({
  open,
  onOpenChange,
  title = 'Provide Reason',
  description,
  label = 'Reason',
  placeholder = 'Enter reason...',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  variant = 'destructive',
  onConfirm,
  required = true,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (required && !trimmed) {
      setError('Please enter a reason before proceeding.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const res = onConfirm?.(trimmed);
      if (res && typeof res.then === 'function') {
        await res;
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to complete request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground whitespace-pre-line mt-1.5">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={placeholder}
              className="h-9 text-sm"
              autoFocus
              required={required}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
            <Button type="submit" variant={variant} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
