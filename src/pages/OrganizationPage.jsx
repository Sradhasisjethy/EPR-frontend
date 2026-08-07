import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { useOrganizations, useOffices, useDepartments } from '@/hooks/use-organization';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('organizations');

  const { data: orgData, isLoading: orgLoading, isError: orgError } = useOrganizations(1, 20);
  const { data: offData, isLoading: offLoading, isError: offError } = useOffices(1, 20);
  const { data: deptData, isLoading: deptLoading, isError: deptError } = useDepartments(1, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization</h2>
          <p className="text-muted-foreground">Manage companies, offices, and departments</p>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        {['Organizations', 'Offices', 'Departments'].map(tab => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.toLowerCase() ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'organizations' && (
        <>
          {orgLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : orgError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load organizations.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
              ]}
              data={orgData?.rows || []}
              searchKey="name"
            />
          )}
        </>
      )}

      {activeTab === 'offices' && (
        <>
          {offLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : offError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load offices.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city || 'N/A' },
                { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
              ]}
              data={offData?.rows || []}
              searchKey="name"
            />
          )}
        </>
      )}

      {activeTab === 'departments' && (
        <>
          {deptLoading ? (
            <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />
          ) : deptError ? (
            <div className="p-8 text-center glass-card rounded-xl border border-destructive/20 text-destructive">
              <p>Failed to load departments.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { accessorKey: 'name', header: 'Name' },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
              ]}
              data={deptData?.rows || []}
              searchKey="name"
            />
          )}
        </>
      )}
    </div>
  );
}
