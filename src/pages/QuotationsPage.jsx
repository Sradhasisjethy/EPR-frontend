import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { KeyHint } from '@/components/key-hint';
import { DateText } from '@/components/date-text';
import { useHotkey } from '@/hooks/use-hotkey';
import { usePaginated } from '@/hooks/use-paginated';
import { useQuotations } from '@/hooks/use-quotations';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { QuotationFormDialog } from '@/components/quotations/quotation-form-dialog';
import { QuotationDetailDialog, QuotationStatusPill } from '@/components/quotations/quotation-detail-dialog';

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED', 'REJECTED', 'CANCELLED'];

export default function QuotationsPage() {
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, WebPermissions.QUOTATION_CREATE);

  const { query, tableProps } = usePaginated(useQuotations, status ? { status } : {});
  useHotkey('n', useCallback(() => canCreate && setFormOpen(true), [canCreate]));

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (quotation) => { setViewingId(null); setEditing(quotation); setFormOpen(true); };

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : query.isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load quotations.</div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'number', header: 'Quotation #',
              cell: ({ row }) => (
                <button className="text-primary hover:underline" onClick={() => setViewingId(row.original.id)}>{row.original.quotationNumber}</button>
              ),
            },
            { id: 'buyer', header: 'Quoted to', cell: ({ row }) => row.original.buyerName },
            { id: 'date', header: 'Date', cell: ({ row }) => <DateText value={row.original.quotationDate} /> },
            { id: 'valid', header: 'Valid until', cell: ({ row }) => <DateText value={row.original.validUntil} /> },
            ...(showRates ? [{ id: 'total', header: 'Total', cell: ({ row }) => formatINR(row.original.totalPaise) }] : []),
            {
              id: 'status', header: 'Status',
              cell: ({ row }) => <QuotationStatusPill status={row.original.status} expired={row.original.isExpired} />,
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search quotation no or name…"
          actionsNode={
            <div className="flex items-center gap-2">
              <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">All quotations</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
              {canCreate && (
                <Button onClick={openNew}><Plus size={16} /> New quotation <KeyHint>N</KeyHint></Button>
              )}
            </div>
          }
        />
      )}

      <QuotationFormDialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }} quotation={editing} />
      <QuotationDetailDialog id={viewingId} onOpenChange={(open) => !open && setViewingId(null)} onEdit={openEdit} />
    </div>
  );
}
