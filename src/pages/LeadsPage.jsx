import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { DateText } from '@/components/date-text';
import { useHotkey } from '@/hooks/use-hotkey';
import { usePaginated } from '@/hooks/use-paginated';
import { useLeads, usePipeline, usePendingTasks } from '@/hooks/use-crm';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { cn } from '@/lib/utils';
import { LeadFormDialog } from '@/components/crm/lead-form-dialog';
import { LeadDetailDialog, StagePill } from '@/components/crm/lead-detail-dialog';
import { QuotationFormDialog } from '@/components/quotations/quotation-form-dialog';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];

export default function LeadsPage() {
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [quoting, setQuoting] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, WebPermissions.LEAD_CREATE);

  const { data: pipeline } = usePipeline();
  const { data: tasks = [] } = usePendingTasks();
  const { query, tableProps } = usePaginated(useLeads, status ? { status } : {});

  useHotkey('n', useCallback(() => canCreate && setFormOpen(true), [canCreate]));
  const openEdit = (lead) => { setViewingId(null); setEditing(lead); setFormOpen(true); };
  const overdue = tasks.filter((t) => t.isOverdue);

  return (
    <div className="space-y-5">
      {pipeline?.stages?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipeline.stages.map((stage) => (
            <button
              key={stage.status}
              onClick={() => setStatus(status === stage.status ? '' : stage.status)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                status === stage.status ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
              )}
            >
              <p className="text-xs text-muted-foreground">{stage.status.charAt(0) + stage.status.slice(1).toLowerCase()}</p>
              <p className="text-lg font-semibold">{stage.count}</p>
              {showRates && stage.valuePaise > 0 && <p className="text-xs text-muted-foreground tabular-nums">{formatINR(stage.valuePaise)}</p>}
            </button>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-500">{overdue.length} follow-up{overdue.length === 1 ? '' : 's'} overdue</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {overdue.slice(0, 5).map((t) => (
              <li key={t.id}>
                <button className="hover:underline" onClick={() => setViewingId(t.lead.id)}>
                  {t.lead.name} — {t.subject} (due <DateText value={t.dueDate} />)
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : query.isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load leads.</div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'name', header: 'Lead',
              cell: ({ row }) => (
                <button className="text-primary hover:underline text-left" onClick={() => setViewingId(row.original.id)}>
                  {row.original.name}
                  <span className="block text-xs text-muted-foreground">{row.original.leadNumber}</span>
                </button>
              ),
            },
            {
              id: 'contact', header: 'Contact',
              cell: ({ row }) => [row.original.contactName, row.original.phone].filter(Boolean).join(' · ') || '—',
            },
            { id: 'source', header: 'Source', cell: ({ row }) => row.original.source.replace(/_/g, ' ').toLowerCase() },
            ...(showRates ? [{ id: 'value', header: 'Worth about', cell: ({ row }) => (row.original.estimatedValuePaise ? formatINR(row.original.estimatedValuePaise) : '—') }] : []),
            { id: 'expected', header: 'Expected by', cell: ({ row }) => (row.original.expectedCloseDate ? <DateText value={row.original.expectedCloseDate} /> : '—') },
            { id: 'owner', header: 'Owner', cell: ({ row }) => row.original.ownerName || '—' },
            { id: 'status', header: 'Stage', cell: ({ row }) => <StagePill status={row.original.status} /> },
          ]}
          {...tableProps}
          searchPlaceholder="Search lead no, name, contact, phone…"
          actionsNode={
            <div className="flex items-center gap-2">
              <select aria-label="Stage" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">All stages</option>
                {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
              {canCreate && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={16} /> New lead <KeyHint>N</KeyHint></Button>}
            </div>
          }
        />
      )}

      <LeadFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }} lead={editing} />
      <LeadDetailDialog
        id={viewingId}
        onOpenChange={(open) => !open && setViewingId(null)}
        onEdit={openEdit}
        onQuote={(lead) => { setViewingId(null); setQuoting(lead); }}
      />
      {/* Quoting from a lead pre-fills the buyer and links the two, so the lead moves to Quoted. */}
      <QuotationFormDialog
        open={!!quoting}
        onOpenChange={(open) => !open && setQuoting(null)}
        lead={quoting}
      />
    </div>
  );
}
