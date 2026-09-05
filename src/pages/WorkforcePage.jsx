import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import { useMaterialIssues, useContractorEntries, useAttendance, useAdvances, useCancelAdvance } from '@/hooks/use-workforce';
import { MaterialIssueFormDialog } from '@/components/workforce/material-issue-form-dialog';
import { ProductionEntryFormDialog } from '@/components/workforce/production-entry-form-dialog';
import { AttendanceFormDialog } from '@/components/workforce/attendance-form-dialog';
import { AdvanceFormDialog } from '@/components/workforce/advance-form-dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { toast } from 'sonner';

const TABS = ['Material Issues', 'Production Entries', 'Attendance', 'Advances'];

export default function WorkforcePage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Material Issues', 'subtab');
  const [issueOpen, setIssueOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [cancellingAdvance, setCancellingAdvance] = useState(null);

  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  const materialIssues = usePaginated(useMaterialIssues);
  const contractorEntries = usePaginated(useContractorEntries);
  const attendance = usePaginated(useAttendance);
  const advances = usePaginated(useAdvances);
  const cancelAdvance = useCancelAdvance();

  const addHandlers = {
    'Material Issues': () => setIssueOpen(true),
    'Production Entries': () => setEntryOpen(true),
    Attendance: () => setAttendanceOpen(true),
    Advances: () => setAdvanceOpen(true),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Contractor & Labour</h2>
        <p className="text-muted-foreground">Job-work material issues, piece-rate production, attendance and advances (M26/M27)</p>
      </div>

      

      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Material Issues' && (
        materialIssues.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'issueNumber', header: 'Issue #' },
              { id: 'contractor', header: 'Contractor', cell: ({ row }) => row.original.contractor?.name },
              { accessorKey: 'issueDate', header: 'Date' },
              { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length || 0 },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
            ]}
            {...materialIssues.tableProps}
            searchPlaceholder="Search issue number…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> {activeTab === 'Attendance' ? 'Mark Attendance' : `New ${activeTab.replace(/s$/, '')}`}</Button>
          }
          />
        )
      )}

      {activeTab === 'Production Entries' && (
        contractorEntries.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'entryNumber', header: 'Entry #' },
              { id: 'contractor', header: 'Contractor', cell: ({ row }) => row.original.contractor?.name },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { accessorKey: 'productionDate', header: 'Date' },
              { accessorKey: 'quantity', header: 'Qty' },
              ...(showRates
                ? [
                    { id: 'rate', header: 'Piece Rate', cell: ({ row }) => formatINR(row.original.pieceRatePaise) },
                    { id: 'total', header: 'Total Value', cell: ({ row }) => formatINR(row.original.totalValuePaise) },
                  ]
                : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
            ]}
            {...contractorEntries.tableProps}
            searchPlaceholder="Search entry number…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> {activeTab === 'Attendance' ? 'Mark Attendance' : `New ${activeTab.replace(/s$/, '')}`}</Button>
          }
          />
        )
      )}

      {activeTab === 'Attendance' && (
        attendance.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { id: 'labour', header: 'Labourer', cell: ({ row }) => row.original.labour?.name },
              { accessorKey: 'attendanceDate', header: 'Date' },
              { accessorKey: 'status', header: 'Status' },
              { accessorKey: 'overtimeHours', header: 'OT Hours' },
              ...(showRates ? [{ id: 'wage', header: 'Wage Accrued', cell: ({ row }) => formatINR(row.original.wageAccruedPaise) }] : []),
            ]}
            {...attendance.tableProps}
            searchPlaceholder="Search by date…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> {activeTab === 'Attendance' ? 'Mark Attendance' : `New ${activeTab.replace(/s$/, '')}`}</Button>
          }
          />
        )
      )}

      {activeTab === 'Advances' && (
        advances.query.isLoading ? <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" /> : (
          <DataTable
            columns={[
              { accessorKey: 'advanceNumber', header: 'Advance #' },
              { id: 'party', header: 'Party', cell: ({ row }) => row.original.party?.name },
              { accessorKey: 'advanceDate', header: 'Date' },
              { accessorKey: 'mode', header: 'Mode' },
              ...(showRates ? [{ id: 'amount', header: 'Amount', cell: ({ row }) => formatINR(row.original.amountPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status.toLowerCase()} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => row.original.status === 'POSTED' && (
                  <div className="flex justify-end">
                    <button
                      className="text-xs text-destructive hover:underline"
                      onClick={() => setCancellingAdvance(row.original)}
                    >
                      Cancel
                    </button>
                  </div>
                ),
              },
            ]}
            {...advances.tableProps}
            searchPlaceholder="Search advance no, reason…"
          actionsNode={
            <Button onClick={addHandlers[activeTab]}><Plus size={16} /> {activeTab === 'Attendance' ? 'Mark Attendance' : `New ${activeTab.replace(/s$/, '')}`}</Button>
          }
          />
        )
      )}

      <MaterialIssueFormDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <ProductionEntryFormDialog open={entryOpen} onOpenChange={setEntryOpen} />
      <AttendanceFormDialog open={attendanceOpen} onOpenChange={setAttendanceOpen} />
      <AdvanceFormDialog open={advanceOpen} onOpenChange={setAdvanceOpen} />

      <ReasonDialog
        open={!!cancellingAdvance}
        onOpenChange={(open) => !open && setCancellingAdvance(null)}
        title={`Cancel Advance — ${cancellingAdvance?.advanceNumber}`}
        description="Are you sure you want to cancel this contractor advance? This action will reverse posted journal entries and cannot be undone."
        label="Cancellation Reason"
        placeholder="e.g. Advance paid in error, duplicate entry, recovered offline..."
        confirmText="Cancel Advance"
        variant="destructive"
        onConfirm={async (reason) => {
          if (!cancellingAdvance) return;
          try {
            await cancelAdvance.mutateAsync({ id: cancellingAdvance.id, reason });
            toast.success('Advance cancelled successfully');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel advance.');
            throw err;
          }
        }}
      />
    </div>
  );
}
