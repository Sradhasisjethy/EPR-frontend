import { useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { useLead, useAddLeadActivity, useCompleteActivity, useSetLeadStatus, useConvertLead } from '@/hooks/use-crm';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SELECT = 'h-9 px-3 rounded-md border border-input bg-background text-sm';

export const STAGE_STYLE = {
  NEW: 'bg-slate-500/10 text-slate-600',
  CONTACTED: 'bg-blue-500/10 text-blue-600',
  QUALIFIED: 'bg-indigo-500/10 text-indigo-600',
  QUOTED: 'bg-amber-500/10 text-amber-600',
  WON: 'bg-emerald-500/10 text-emerald-600',
  LOST: 'bg-rose-500/10 text-rose-600',
};

export const StagePill = ({ status }) => (
  <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', STAGE_STYLE[status])}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </span>
);

const ACTIVITY_TYPES = [
  { value: 'CALL', label: 'Call' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'SITE_VISIT', label: 'Site visit' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'NOTE', label: 'Note' },
  { value: 'TASK', label: 'Task (to do)' },
];

export function LeadDetailDialog({ id, onOpenChange, onEdit, onQuote }) {
  const { data: lead, isLoading } = useLead(id);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canModify = hasPermission(user, WebPermissions.LEAD_MODIFY);

  const [activity, setActivity] = useState({ type: 'CALL', subject: '', dueDate: '' });
  const [losing, setLosing] = useState(false);
  const [error, setError] = useState('');

  const add = useAddLeadActivity();
  const complete = useCompleteActivity();
  const setStatus = useSetLeadStatus();
  const convert = useConvertLead();

  const logActivity = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await add.mutateAsync({
        leadId: id, type: activity.type, subject: activity.subject,
        ...(activity.type === 'TASK' && activity.dueDate ? { dueDate: activity.dueDate } : {}),
      });
      setActivity({ type: activity.type, subject: '', dueDate: '' });
      toast.success('Recorded');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record that.');
    }
  };

  const doConvert = async () => {
    setError('');
    try {
      const result = await convert.mutateAsync({ id });
      toast.success(`${result.customer.name} is now a customer`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not convert the lead.');
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {lead ? lead.name : 'Lead'}
            {lead && <StagePill status={lead.status} />}
          </DialogTitle>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        {isLoading || !lead ? (
          <div className="h-56 rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-muted-foreground">
              <span>{lead.leadNumber}</span>
              {lead.contactName && <span>{lead.contactName}</span>}
              {lead.phone && <span>{lead.phone}</span>}
              {[lead.city, lead.state].filter(Boolean).length > 0 && <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>}
              {lead.ownerName && <span>Owner: {lead.ownerName}</span>}
              {showRates && lead.estimatedValuePaise ? <span>Worth about {formatINR(lead.estimatedValuePaise)}</span> : null}
              {lead.expectedCloseDate && <span>Expected by <DateText value={lead.expectedCloseDate} /></span>}
            </div>
            {lead.requirement && <p>{lead.requirement}</p>}
            {lead.lostReason && <p className="text-rose-600 text-xs">Lost: {lead.lostReason}</p>}
            {lead.customer && <p className="text-emerald-600 text-xs">Now a customer: {lead.customer.name}</p>}

            {canModify && lead.isOpen && (
              <form onSubmit={logActivity} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <div className="space-y-1">
                  <Label htmlFor="act-type" className="text-xs">Log</Label>
                  <select id="act-type" className={SELECT} value={activity.type} onChange={(e) => setActivity((a) => ({ ...a, type: e.target.value }))}>
                    {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1 flex-1 min-w-[12rem]">
                  <Label htmlFor="act-subject" className="text-xs">What happened / what is to be done</Label>
                  <Input id="act-subject" value={activity.subject} onChange={(e) => setActivity((a) => ({ ...a, subject: e.target.value }))} required />
                </div>
                {activity.type === 'TASK' && (
                  <div className="space-y-1">
                    <Label htmlFor="act-due" className="text-xs">Due</Label>
                    <Input id="act-due" type="date" className="w-40" value={activity.dueDate} onChange={(e) => setActivity((a) => ({ ...a, dueDate: e.target.value }))} />
                  </div>
                )}
                <Button type="submit" variant="outline" disabled={add.isPending || !activity.subject.trim()}>Add</Button>
              </form>
            )}

            <ul className="space-y-2 max-h-64 overflow-auto">
              {(lead.activities || []).map((a) => (
                <li key={a.id} className="flex items-start gap-2 border-b border-border/50 pb-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground w-20 shrink-0 pt-0.5">{a.type.replace('_', ' ')}</span>
                  <div className="flex-1">
                    <p className={cn(a.completedAt && 'line-through text-muted-foreground')}>{a.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.type === 'TASK'
                        ? a.completedAt ? <>Done</> : <>Due <DateText value={a.dueDate} /></>
                        : <DateText value={a.occurredAt} withTime />}
                      {a.assigneeName ? ` · ${a.assigneeName}` : ''}
                    </p>
                  </div>
                  {canModify && a.type === 'TASK' && !a.completedAt && (
                    <button
                      type="button" className="text-xs text-primary hover:underline"
                      onClick={async () => {
                        try {
                          await complete.mutateAsync(a.id);
                          toast.success('Marked done');
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Could not mark it done.');
                        }
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </li>
              ))}
              {(lead.activities || []).length === 0 && <li className="text-muted-foreground">Nothing logged yet.</li>}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2">
          {lead && canModify && lead.isOpen && (
            <>
              <Button type="button" variant="outline" onClick={() => onEdit(lead)}>Edit</Button>
              {lead.status === 'CONTACTED' && (
                <Button type="button" variant="outline" onClick={() => setStatus.mutateAsync({ id, status: 'QUALIFIED' }).then(() => toast.success('Marked qualified'))}>
                  Mark qualified
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onQuote(lead)}>Quote</Button>
              <Button type="button" variant="outline" onClick={() => setLosing(true)}>Mark lost</Button>
              <Button type="button" onClick={doConvert} disabled={convert.isPending}>
                <UserPlus size={15} /> {convert.isPending ? 'Converting…' : 'Won — make customer'}
              </Button>
            </>
          )}
        </DialogFooter>

        <ReasonDialog
          open={losing}
          onOpenChange={setLosing}
          title="Mark lead lost"
          description="Why it was lost is the part worth keeping."
          label="Reason"
          placeholder="e.g. Went with a local supplier on price"
          confirmText="Mark lost"
          variant="destructive"
          onConfirm={async (reason) => {
            try {
              await setStatus.mutateAsync({ id, status: 'LOST', reason });
              toast.success('Marked lost');
            } catch (err) {
              toast.error(err.response?.data?.message || 'Could not update the lead.');
              throw err;
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
