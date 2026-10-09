import { useState } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { useVouchers, useVoucher, useCancelVoucher } from '@/hooks/use-ledger';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates, hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { formatINR } from '@/lib/money';
import { VoucherFormDialog } from './voucher-form-dialog';
import { toast } from 'sonner';

const TYPE_LABEL = { JOURNAL: 'Journal', CONTRA: 'Contra' };

function VoucherDetail({ id, onClose, showRates }) {
  const { data: voucher, isLoading } = useVoucher(id);
  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{voucher ? `${TYPE_LABEL[voucher.voucherType]} ${voucher.voucherNumber}` : 'Voucher'}</DialogTitle>
        </DialogHeader>
        {isLoading || !voucher ? (
          <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
              <DateText value={voucher.voucherDate} />
              <span>{voucher.factory?.name}</span>
              <span>{voucher.status === 'POSTED' ? 'Posted' : 'Cancelled'}</span>
            </div>
            <p>{voucher.narration}</p>
            {voucher.status === 'CANCELLED' && voucher.cancelReason && (
              <p className="text-destructive text-xs">Cancelled: {voucher.cancelReason}</p>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 font-medium">Account</th>
                  {showRates && <th className="text-right py-1.5 font-medium">Debit</th>}
                  {showRates && <th className="text-right py-1.5 font-medium">Credit</th>}
                </tr>
              </thead>
              <tbody>
                {voucher.lines.map((l) => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="py-1.5">{l.account?.code} · {l.account?.name}</td>
                    {showRates && <td className="text-right tabular-nums">{l.debitPaise ? formatINR(l.debitPaise) : ''}</td>}
                    {showRates && <td className="text-right tabular-nums">{l.creditPaise ? formatINR(l.creditPaise) : ''}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VouchersList() {
  const [typeFilter, setTypeFilter] = useState('');
  const [creating, setCreating] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, WebPermissions.JOURNAL_CREATE);
  const canCancel = hasPermission(user, WebPermissions.JOURNAL_CANCEL);

  const { query, tableProps } = usePaginated(useVouchers, typeFilter ? { voucherType: typeFilter } : {});
  const cancel = useCancelVoucher();

  return (
    <div className="space-y-4">
      {query.isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : query.isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load vouchers.</div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'number', header: 'Voucher #',
              cell: ({ row }) => (
                <button className="text-primary hover:underline" onClick={() => setViewingId(row.original.id)}>{row.original.voucherNumber}</button>
              ),
            },
            { id: 'type', header: 'Type', cell: ({ row }) => TYPE_LABEL[row.original.voucherType] },
            { id: 'date', header: 'Date', cell: ({ row }) => <DateText value={row.original.voucherDate} /> },
            { accessorKey: 'narration', header: 'Narration' },
            ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.totalPaise) }] : []),
            { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'POSTED' ? 'active' : 'inactive'} /> },
            {
              id: 'actions', header: '',
              cell: ({ row }) => canCancel && row.original.status === 'POSTED' && (
                <div className="flex justify-end">
                  <button className="text-xs text-destructive hover:underline" onClick={() => setCancelling(row.original)}>Cancel</button>
                </div>
              ),
            },
          ]}
          {...tableProps}
          searchPlaceholder="Search voucher no or narration…"
          actionsNode={
            <div className="flex items-center gap-2">
              <select
                aria-label="Voucher type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">All vouchers</option>
                <option value="JOURNAL">Journal</option>
                <option value="CONTRA">Contra</option>
              </select>
              {canCreate && (
                <>
                  <Button variant="outline" onClick={() => setCreating('CONTRA')}><ArrowLeftRight size={16} /> Contra</Button>
                  <Button onClick={() => setCreating('JOURNAL')}><Plus size={16} /> Journal voucher</Button>
                </>
              )}
            </div>
          }
        />
      )}

      <VoucherFormDialog open={!!creating} onOpenChange={(open) => !open && setCreating(null)} voucherType={creating || 'JOURNAL'} />
      <VoucherDetail id={viewingId} onClose={() => setViewingId(null)} showRates={showRates} />

      <ReasonDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.voucherNumber}`}
        description="A reversing entry is posted dated today; the original stays in the books for the audit trail."
        label="Cancellation reason"
        placeholder="e.g. Posted to the wrong account"
        confirmText="Cancel voucher"
        variant="destructive"
        onConfirm={async (reason) => {
          try {
            await cancel.mutateAsync({ id: cancelling.id, reason });
            toast.success('Voucher cancelled');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel the voucher.');
            throw err;
          }
        }}
      />
    </div>
  );
}
