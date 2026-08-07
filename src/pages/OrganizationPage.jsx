import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useOrganizations,
  useOffices,
  useDepartments,
  useDeleteOrganization,
  useDeleteOffice,
  useDeleteDepartment,
} from '@/hooks/use-organization';
import { OrganizationFormDialog } from '@/components/organization/organization-form-dialog';
import { OfficeFormDialog } from '@/components/organization/office-form-dialog';
import { DepartmentFormDialog } from '@/components/organization/department-form-dialog';

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Edit"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('organizations');

  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const { data: orgData, isLoading: orgLoading, isError: orgError } = useOrganizations(1, 20);
  const { data: offData, isLoading: offLoading, isError: offError } = useOffices(1, 20);
  const { data: deptData, isLoading: deptLoading, isError: deptError } = useDepartments(1, 20);

  const deleteOrg = useDeleteOrganization();
  const deleteOffice = useDeleteOffice();
  const deleteDept = useDeleteDepartment();

  const handleDeleteOrg = (org) => {
    if (window.confirm(`Delete organization "${org.name}"? This cannot be undone.`)) {
      deleteOrg.mutate(org.id);
    }
  };
  const handleDeleteOffice = (office) => {
    if (window.confirm(`Delete office "${office.name}"? This cannot be undone.`)) {
      deleteOffice.mutate(office.id);
    }
  };
  const handleDeleteDept = (dept) => {
    if (window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) {
      deleteDept.mutate(dept.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organization</h2>
          <p className="text-muted-foreground">Manage companies, offices, and departments</p>
        </div>
        <Button
          onClick={() => {
            if (activeTab === 'organizations') { setEditingOrg(null); setOrgDialogOpen(true); }
            if (activeTab === 'offices') { setEditingOffice(null); setOfficeDialogOpen(true); }
            if (activeTab === 'departments') { setEditingDept(null); setDeptDialogOpen(true); }
          }}
        >
          <Plus size={16} />
          Add {activeTab === 'organizations' ? 'Organization' : activeTab === 'offices' ? 'Office' : 'Department'}
        </Button>
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
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingOrg(row.original); setOrgDialogOpen(true); }}
                      onDelete={() => handleDeleteOrg(row.original)}
                    />
                  ),
                },
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
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingOffice(row.original); setOfficeDialogOpen(true); }}
                      onDelete={() => handleDeleteOffice(row.original)}
                    />
                  ),
                },
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
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                {
                  id: 'actions',
                  header: '',
                  cell: ({ row }) => (
                    <RowActions
                      onEdit={() => { setEditingDept(row.original); setDeptDialogOpen(true); }}
                      onDelete={() => handleDeleteDept(row.original)}
                    />
                  ),
                },
              ]}
              data={deptData?.rows || []}
              searchKey="name"
            />
          )}
        </>
      )}

      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={editingOrg} />
      <OfficeFormDialog open={officeDialogOpen} onOpenChange={setOfficeDialogOpen} office={editingOffice} />
      <DepartmentFormDialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen} department={editingDept} />
    </div>
  );
}
