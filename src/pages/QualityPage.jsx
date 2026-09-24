import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-auth';
import { hasPermission } from '@/lib/permissions';
import { WebPermissions } from '@/constants/enums';
import { Plus, FlaskConical } from 'lucide-react';
import { usePaginated } from '@/hooks/use-paginated';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/query-state';
import { cn } from '@/lib/utils';
import { useTabParam } from '@/hooks/use-tab-param';
import { useQualityInspections, useHeldLots } from '@/hooks/use-quality';
import { InspectionFormDialog } from '@/components/quality/inspection-form-dialog';
import { RecordResultDialog } from '@/components/quality/record-result-dialog';
import { DateText } from '@/components/date-text';

const TABS = ['Awaiting Clearance', 'Inspections'];

const TYPE_LABEL = {
  FINAL: 'Final',
  IN_PROCESS: 'In-process',
  INCOMING: 'Incoming',
};

export default function QualityPage() {
  const { data: user } = useCurrentUser();
  const canRaiseInspection = hasPermission(user, WebPermissions.QUALITY_CREATE);
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Awaiting Clearance', 'subtab');
  const [inspectingLot, setInspectingLot] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recordingResult, setRecordingResult] = useState(null);

  const heldQuery = usePaginated(useHeldLots);
  const inspectionQuery = usePaginated(useQualityInspections);

  const openForLot = (lot) => {
    setInspectingLot(lot);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">


      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Awaiting Clearance' && heldQuery.query.data?.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] h-4 min-w-4 px-1">
                {heldQuery.query.data.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Awaiting Clearance' && (
        <QueryState query={heldQuery.query} label="lots awaiting clearance">
          <DataTable
            columns={[
              { accessorKey: 'lotNumber', header: 'Lot' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { id: 'originDate', header: 'Produced', cell: ({ row }) => <DateText value={row.original.originDate} /> },
              { accessorKey: 'qtyAvailable', header: 'Quantity' },
              {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
              },
              {
                id: 'tests',
                header: 'Tests',
                cell: ({ row }) => row.original.inspections?.length ?? 0,
              },
              {
                id: 'actions',
                header: '',
                cell: ({ row }) =>
                  row.original.status === 'QC_HOLD' ? (
                    <button className="text-xs text-primary hover:underline" onClick={() => openForLot(row.original)}>
                      Raise test
                    </button>
                  ) : null,
              },
            ]}
            {...heldQuery.tableProps}
            searchPlaceholder="Search lot number…"
            emptyMessage="No lots are waiting on quality clearance."
            actionsNode={
              canRaiseInspection && (
              <Button
                onClick={() => {
                  setInspectingLot(null);
                  setDialogOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" /> Raise Inspection
              </Button>
              )
            }
          />
        </QueryState>
      )}

      {activeTab === 'Inspections' && (
        <QueryState query={inspectionQuery.query} label="inspections">
          <DataTable
            columns={[
              { accessorKey: 'inspectionNumber', header: 'Inspection #' },
              {
                id: 'type',
                header: 'Type',
                cell: ({ row }) => TYPE_LABEL[row.original.inspectionType] || row.original.inspectionType,
              },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name },
              { id: 'lot', header: 'Lot', cell: ({ row }) => row.original.lot?.lotNumber || '—' },
              {
                id: 'age',
                header: 'Age',
                cell: ({ row }) =>
                  row.original.testAgeDays === null || row.original.testAgeDays === undefined
                    ? '—'
                    : `${row.original.testAgeDays}d`,
              },
              {
                id: 'reading',
                header: 'Reading',
                cell: ({ row }) => {
                  const { testedValue, requiredValue, unitLabel } = row.original;
                  if (testedValue === null || testedValue === undefined) return '—';
                  const unit = unitLabel ? ` ${unitLabel}` : '';
                  return requiredValue !== null && requiredValue !== undefined
                    ? `${Number(testedValue)}${unit} / ${Number(requiredValue)}${unit}`
                    : `${Number(testedValue)}${unit}`;
                },
              },
              { id: 'inspectionDate', header: 'Date', cell: ({ row }) => <DateText value={row.original.inspectionDate} /> },
              {
                accessorKey: 'result',
                header: 'Result',
                cell: ({ row }) => <StatusBadge status={row.original.result} />,
              },
              {
                id: 'actions',
                header: '',
                cell: ({ row }) =>
                  row.original.result === 'PENDING' ? (
                    <button className="text-xs text-primary hover:underline" onClick={() => setRecordingResult(row.original)}>
                      Record result
                    </button>
                  ) : null,
              },
            ]}
            {...inspectionQuery.tableProps}
            searchPlaceholder="Search inspection or sample…"
            emptyMessage="No inspections recorded yet."
            actionsNode={
              canRaiseInspection && (
              <Button
                onClick={() => {
                  setInspectingLot(null);
                  setDialogOpen(true);
                }}
              >
                <Plus size={16} className="mr-1.5" /> Raise Inspection
              </Button>
              )
            }
          />
        </QueryState>
      )}

      {activeTab === 'Awaiting Clearance' && heldQuery.query.data?.count === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FlaskConical size={14} aria-hidden="true" />
          <span>
            Holds only apply where a location has quality holds enabled and the product is marked as
            requiring testing.
          </span>
        </div>
      )}

      <InspectionFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setInspectingLot(null);
        }}
        lot={inspectingLot}
      />

      <RecordResultDialog
        open={Boolean(recordingResult)}
        onOpenChange={(v) => !v && setRecordingResult(null)}
        inspection={recordingResult}
      />
    </div>
  );
}
