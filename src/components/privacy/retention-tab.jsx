import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRetentionRules, useUpdateRetentionRule, useRunRetentionRule } from '@/hooks/use-privacy';
import { formatDateTime } from './privacy-labels';

/**
 * The retention schedule (s.8(7), Rule 8). Every rule starts switched off:
 * erasure cannot be undone, so turning one on is a decision, and the periods
 * are a starting point to check against the business's own legal advice.
 * Switched-on rules run every night at 02:00 IST.
 */
export function PrivacyRetentionTab() {
  const canModify = true; // only the application owner reaches this desk
  const { data: rules = [], isLoading } = useRetentionRules();
  const update = useUpdateRetentionRule();
  const run = useRunRetentionRule();
  const [days, setDays] = useState({});
  const [confirm, setConfirm] = useState(null);

  const act = async (fn, ok) => {
    try {
      const result = await fn();
      toast.success(typeof ok === 'function' ? ok(result) : ok);
    } catch (err) {
      toast.error(err.response?.data?.message || 'That did not work.');
    }
  };

  if (isLoading) return <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Personal details past their period are erased; the records the law makes us keep (invoices, wage registers, the audit trail) keep the name only.
      </p>
      {rules.map((rule) => (
        <div key={rule.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{rule.label}</p>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rule.dueCount === null ? 'Counted when it runs' : `${rule.dueCount} record${rule.dueCount === 1 ? '' : 's'} past the period now`}
                {rule.lastRunAt ? ` · last run ${formatDateTime(rule.lastRunAt)}, ${rule.lastRunCount} erased` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Input
                  aria-label={`${rule.label}: days to keep`}
                  type="number"
                  min={rule.minDays}
                  className="h-8 w-24"
                  disabled={!canModify}
                  value={days[rule.id] ?? rule.retentionDays}
                  onChange={(e) => setDays({ ...days, [rule.id]: e.target.value })}
                  onBlur={() => {
                    const value = Number(days[rule.id]);
                    if (days[rule.id] !== undefined && value !== rule.retentionDays) {
                      act(() => update.mutateAsync({ id: rule.id, retentionDays: value }), 'Period saved');
                    }
                  }}
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <Switch
                aria-label={`${rule.label}: on`}
                checked={rule.enabled}
                disabled={!canModify}
                onCheckedChange={(on) => (on ? setConfirm({ kind: 'enable', rule }) : act(() => update.mutateAsync({ id: rule.id, enabled: false }), 'Switched off'))}
              />
              {canModify && rule.enabled && (
                <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'run', rule })}>Run now</Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'run' ? `Run "${confirm?.rule.label}" now?` : `Switch on "${confirm?.rule.label}"?`}
        description={
          confirm?.kind === 'run'
            ? `${confirm?.rule.dueCount ?? 'The'} record(s) past ${confirm?.rule.retentionDays} days will have their personal details erased now. This cannot be undone.`
            : `From tonight, records past ${confirm?.rule.retentionDays} days will have their personal details erased automatically. This cannot be undone.`
        }
        confirmText={confirm?.kind === 'run' ? 'Erase now' : 'Switch on'}
        variant="destructive"
        onConfirm={() => {
          const { kind, rule } = confirm;
          if (kind === 'run') act(() => run.mutateAsync(rule.id), (r) => `${r.erased} record(s) erased`);
          else act(() => update.mutateAsync({ id: rule.id, enabled: true }), 'Switched on');
        }}
      />
    </div>
  );
}
