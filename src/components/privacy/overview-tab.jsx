import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePrivacyOverview } from '@/hooks/use-privacy';
import { cn } from '@/lib/utils';
import { formatDateTime } from './privacy-labels';

/**
 * Each DPDP obligation and whether the records show it being met. Every line
 * is computed by the API from the data; nothing here is a self-assessment.
 */
export function PrivacyOverviewTab({ onOpenTab }) {
  const { data, isLoading, isError } = usePrivacyOverview();

  if (isLoading) return <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />;
  if (isError || !data) return <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load the overview.</div>;

  const LINKS = { contact: 'notice', notice: 'notice', requests: 'requests', breaches: 'breaches', retention: 'retention', children: 'consents' };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Obligations met</p>
        <p className="text-2xl font-semibold tabular-nums">
          {data.score.met} <span className="text-base text-muted-foreground">of {data.score.total}</span>
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {data.checks.map((check) => (
          <li key={check.key} className="flex items-start gap-3 p-4">
            {check.ok
              ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Met" />
              : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-label="Needs attention" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{check.label}</p>
                <span className="text-xs text-muted-foreground">{check.reference}</span>
              </div>
              <p className={cn('text-sm', check.ok ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-500')}>{check.detail}</p>
              {!check.ok && LINKS[check.key] && (
                <button type="button" className="mt-1 text-sm text-primary hover:underline" onClick={() => onOpenTab(LINKS[check.key])}>
                  Go to {LINKS[check.key]}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {data.openBreaches?.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
          <p className="font-medium text-rose-700 dark:text-rose-400">Open breaches</p>
          <ul className="mt-1 space-y-0.5">
            {data.openBreaches.map((b) => (
              <li key={b.id}>
                {b.breachNumber}: {b.title} — Board report {b.boardReportSubmittedAt ? 'submitted' : `due ${formatDateTime(b.boardReportDueAt)}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.unguardedMinors?.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-500">Under-18 records without a guardian's consent</p>
          <p className="text-muted-foreground">Record verified guardian consent on the consent register, or have the organisation stop processing their data (s.9).</p>
          <ul className="mt-1 list-disc pl-5">
            {data.unguardedMinors.map((m) => <li key={m.id}>{m.name} ({m.partyType.toLowerCase()}){m.organisationName ? ` — ${m.organisationName}` : ''}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
