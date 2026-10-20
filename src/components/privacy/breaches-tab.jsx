import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBreaches, useBreachReport, useCreateBreach, useBreachStep, useCloseBreach } from '@/hooks/use-privacy';
import { BREACH_SEVERITY, SELECT, TEXTAREA, formatDateTime, toLocalInput, fromLocalInput, titleCase } from './privacy-labels';

const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * The breach register (s.8(6), Rule 7). Every breach, however small, is
 * intimated to the Data Protection Board and to the people affected, with a
 * detailed report within 72 hours of becoming aware — the countdown is the
 * first thing on each card.
 */
export function PrivacyBreachesTab() {
  const canCreate = true; // only the application owner reaches this desk
  const { data: breaches = [], isLoading } = useBreaches();
  const create = useCreateBreach();
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        title: form.title,
        description: form.description,
        severity: form.severity,
        discoveredAt: fromLocalInput(form.discoveredAt),
        occurredAt: fromLocalInput(form.occurredAt),
        cause: form.cause || undefined,
        dataCategories: splitList(form.dataCategories),
        principalCategories: splitList(form.principalCategories),
        affectedCount: form.affectedCount === '' ? undefined : Number(form.affectedCount),
        likelyConsequences: form.likelyConsequences || undefined,
        mitigation: form.mitigation || undefined,
        safetyMeasures: form.safetyMeasures || undefined,
      });
      toast.success('Breach recorded. The 72-hour clock is running.');
      setForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record the breach.');
    }
  };

  const field = (key, labelText, props = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`b-${key}`}>{labelText}</Label>
      <Input id={`b-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );
  const area = (key, labelText, props = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`b-${key}`}>{labelText}</Label>
      <textarea id={`b-${key}`} className={TEXTAREA} maxLength={5000} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && (
          <Button onClick={() => setForm({
            title: '', description: '', severity: 'MEDIUM', discoveredAt: toLocalInput(), occurredAt: '', cause: '',
            dataCategories: '', principalCategories: '', affectedCount: '', likelyConsequences: '', mitigation: '', safetyMeasures: '',
          })}>
            <Plus size={16} /> Record a breach
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      ) : breaches.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No breaches recorded.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {breaches.map((b) => (
            <button key={b.id} type="button" onClick={() => setViewing(b.id)} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.breachNumber} · became aware {formatDateTime(b.discoveredAt)}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs', BREACH_SEVERITY[b.severity])}>{titleCase(b.severity)}</span>
              </div>
              <p className={cn('mt-2 text-sm', b.boardReportOverdue ? 'font-medium text-rose-600' : 'text-muted-foreground')}>
                {b.status === 'CLOSED'
                  ? 'Closed'
                  : b.boardReportSubmittedAt
                    ? 'Board report submitted'
                    : b.boardReportOverdue
                      ? `Board report overdue (was due ${formatDateTime(b.boardReportDueAt)})`
                      : `Board report due in ${b.hoursToBoardReport} hours`}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record a personal data breach</DialogTitle>
            <DialogDescription>Record it as soon as you know. The report to the Board is due 72 hours after the time you became aware.</DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={save} className="space-y-3">
              {field('title', 'What happened, in a line', { required: true, maxLength: 200 })}
              {area('description', 'Description', { required: true })}
              <div className="grid gap-3 sm:grid-cols-3">
                {field('discoveredAt', 'Became aware', { type: 'datetime-local', required: true })}
                {field('occurredAt', 'Happened (if known)', { type: 'datetime-local' })}
                <div className="space-y-1">
                  <Label htmlFor="b-severity">Severity</Label>
                  <select id="b-severity" className={cn(SELECT, 'w-full')} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                    {Object.keys(BREACH_SEVERITY).map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {field('dataCategories', 'Data involved (comma separated)', { placeholder: 'Name, phone, bank account' })}
                {field('principalCategories', 'Whose data', { placeholder: 'Labour, customers' })}
                {field('affectedCount', 'How many people', { type: 'number', min: 0 })}
              </div>
              {area('cause', 'Cause, as far as known')}
              {area('likelyConsequences', 'Likely impact on the people affected')}
              {area('mitigation', 'What has been done, and to stop it recurring')}
              {area('safetyMeasures', 'What the people affected can do to protect themselves')}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>Record</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <BreachDetailDialog id={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}

const STEPS = [
  { step: 'CONTAINED', field: 'containedAt', label: 'Contained' },
  { step: 'BOARD_INTIMATED', field: 'boardIntimatedAt', label: 'Board intimated' },
  { step: 'BOARD_REPORT_SUBMITTED', field: 'boardReportSubmittedAt', label: 'Detailed report sent to the Board' },
  { step: 'PRINCIPALS_NOTIFIED', field: 'principalsNotifiedAt', label: 'People affected told' },
];

function BreachDetailDialog({ id, onOpenChange }) {
  const canModify = true; // only the application owner reaches this desk
  const { data } = useBreachReport(id);
  const stepMutation = useBreachStep();
  const close = useCloseBreach();
  const [extra, setExtra] = useState({ reference: '', method: '' });

  const breach = data?.breach;
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'));
  const act = async (fn, ok) => {
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(err.response?.data?.message || 'That did not work.');
    }
  };

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {!breach ? (
          <div className="h-40 animate-pulse" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{breach.breachNumber}: {breach.title}</DialogTitle>
              <DialogDescription>
                Became aware {formatDateTime(breach.discoveredAt)} · Board report due {formatDateTime(breach.boardReportDueAt)}
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-2">
              {STEPS.map(({ step, field, label }) => (
                <li key={step} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span>{label}</span>
                  {breach[field] ? (
                    <span className="text-emerald-600">{formatDateTime(breach[field])}</span>
                  ) : canModify && breach.status !== 'CLOSED' ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {step === 'BOARD_REPORT_SUBMITTED' && (
                        <Input className="h-8 w-44" placeholder="Board reference" value={extra.reference} onChange={(e) => setExtra({ ...extra, reference: e.target.value })} />
                      )}
                      {step === 'PRINCIPALS_NOTIFIED' && (
                        <Input className="h-8 w-44" placeholder="How (SMS, email…)" value={extra.method} onChange={(e) => setExtra({ ...extra, method: e.target.value })} />
                      )}
                      <Button size="sm" variant="outline" onClick={() => act(() => stepMutation.mutateAsync({ id, step, ...extra }), 'Recorded')}>
                        Mark done now
                      </Button>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not yet</span>
                  )}
                </li>
              ))}
            </ol>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Report to the Data Protection Board (draft)</p>
                  <Button size="sm" variant="ghost" onClick={() => copy(data.boardReport)}><Copy size={14} /> Copy</Button>
                </div>
                <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{data.boardReport}</pre>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Notice to the people affected (draft)</p>
                  <Button size="sm" variant="ghost" onClick={() => copy(data.principalNotice)}><Copy size={14} /> Copy</Button>
                </div>
                <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{data.principalNotice}</pre>
              </div>
              <p className="text-xs text-muted-foreground">The system does not send these. Check them, send them through the Board's portal and your usual channels, then mark each step done.</p>
            </div>

            {canModify && breach.status !== 'CLOSED' && (
              <DialogFooter>
                <Button onClick={() => act(() => close.mutateAsync(id), 'Breach closed')}>Close the breach</Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
