import { DataTable } from '@/components/data-table/data-table';
import { usePaginated } from '@/hooks/use-paginated';
import { useAuditLogs } from '@/hooks/use-audit-log';
import { DateText } from '@/components/date-text';
import { PageDescription } from '@/components/layout/page-description';

const ACTION_COLORS = {
  CREATE: 'text-emerald-600',
  UPDATE: 'text-blue-600',
};

export default function AuditLogPage() {
  const { query, tableProps } = usePaginated(useAuditLogs);
  const { isLoading, isError } = query;

  return (
    <div className="space-y-6">
      <PageDescription>Every create/update, who did it, and when (BR-30, M17)</PageDescription>

      {isLoading ? (
        <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
      ) : isError ? (
        <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load audit log.</div>
      ) : (
        <DataTable
          columns={[
            { id: 'when', header: 'When', cell: ({ row }) => <DateText value={row.original.createdAt} withTime /> },
            { accessorKey: 'entityType', header: 'Entity' },
            { id: 'entityId', header: 'Record', cell: ({ row }) => row.original.entityId?.slice(0, 8) },
            {
              id: 'action', header: 'Action',
              cell: ({ row }) => <span className={ACTION_COLORS[row.original.action] || ''}>{row.original.action}</span>,
            },
            {
              id: 'user', header: 'User',
              cell: ({ row }) => (row.original.User ? `${row.original.User.firstName} ${row.original.User.lastName}` : 'System'),
            },
            { accessorKey: 'ipAddress', header: 'IP', cell: ({ row }) => row.original.ipAddress || 'N/A' },
          ]}
          {...tableProps}
        />
      )}
    </div>
  );
}
