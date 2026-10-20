import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMyPrivacy, useAcknowledgeNotice } from '@/hooks/use-privacy';
import { NoticeView } from './notice-view';

/**
 * Shown once per notice version to every signed-in user (DPDP s.5): staff data
 * is processed for employment, a legitimate use that needs no consent but
 * still needs the notice. Acknowledging records that this person saw this
 * version. "Later" closes it for the session; it returns on the next visit.
 */
export function NoticeAckDialog() {
  const { data } = useMyPrivacy();
  const acknowledge = useAcknowledgeNotice();
  const [dismissed, setDismissed] = useState(false);

  if (!data?.acknowledgementPending || dismissed) return null;

  const confirm = async () => {
    try {
      await acknowledge.mutateAsync();
      toast.success('Thank you. You can read the notice again under My Profile.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record that. Please try again.');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data.notice.title}</DialogTitle>
          <DialogDescription>How your personal data is used here (version {data.notice.version}).</DialogDescription>
        </DialogHeader>
        <NoticeView
          notice={data.notice}
          principalType="USER"
          contact={{ name: data.profile?.contactName, email: data.profile?.contactEmail, phone: data.profile?.contactPhone }}
          responseDays={data.profile?.responseDays}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(true)}>Later</Button>
          <Button onClick={confirm} disabled={acknowledge.isPending}>I have read this notice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
