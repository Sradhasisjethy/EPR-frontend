import { useState } from 'react';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { RowActions } from '@/components/data-table/row-actions';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useTabParam(['organizations', 'offices', 'departments'], 'organizations', 'subtab');
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterOfficeId, setFilterOfficeId] = useState('');

  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  
  const [deleteOfficeConfirm, setDeleteOfficeConfirm] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState(null);
  
  const [deleteDeptConfirm, setDeleteDeptConfirm] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  const orgs = usePaginated(useOrganizations);
  const offices = usePaginated(useOffices, { organizationId: filterOrgId || undefined });
  const depts = usePaginated(useDepartments, { 
    organizationId: filterOrgId || undefined,
    officeId: filterOfficeId || undefined
  });
  
  const { data: allOrgsData } = useOrganizations({ page: 1, limit: 100 });
  const allOrganizations = allOrgsData?.rows || [];

  const { data: allOfficesData } = useOffices({ page: 1, limit: 100, organizationId: filterOrgId || undefined });
  const allOffices = allOfficesData?.rows || [];

  const { isLoading: orgLoading, isError: orgError } = orgs.query;
  const { isLoading: offLoading, isError: offError } = offices.query;
  const { isLoading: deptLoading, isError: deptError } = depts.query;

  const deleteOrg = useDeleteOrganization();
  const deleteOffice = useDeleteOffice();
  const deleteDept = useDeleteDepartment();

  const handleDeleteOrg = (org) => {
    setOrgToDelete(org);
    setDeleteOrgConfirm(true);
  };

  const handleDeleteOffice = (office) => {
    setOfficeToDelete(office);
    setDeleteOfficeConfirm(true);
  };

  const handleDeleteDept = (dept) => {
    setDeptToDelete(dept);
    setDeleteDeptConfirm(true);
  };

  const confirmDeleteOrg = () => {
    if (orgToDelete) {
      deleteOrg.mutate(orgToDelete.id);
      setOrgToDelete(null);
    }
  };

  const confirmDeleteOffice = () => {
    if (officeToDelete) {
      deleteOffice.mutate(officeToDelete.id);
      setOfficeToDelete(null);
    }
  };

  const confirmDeleteDept = () => {
    if (deptToDelete) {
      deleteDept.mutate(deptToDelete.id);
      setDeptToDelete(null);
    }
  };

  // One "Add" button serves all three tabs — it opens the dialog for whatever
  // is currently on screen.
  const addLabel = {
    organizations: 'Add Organization',
    offices: 'Add Office',
    departments: 'Add Department',
  }[activeTab];

  const handleAdd = () => {
    if (activeTab === 'offices') {
      setEditingOffice(null);
      setOfficeDialogOpen(true);
    } else if (activeTab === 'departments') {
      setEditingDept(null);
      setDeptDialogOpen(true);
    } else {
      setEditingOrg(null);
      setOrgDialogOpen(true);
    }
  };

  const filterNode = (
    <div className="flex items-center gap-2">
      <select 
        className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[200px]"
        value={filterOrgId}
        onChange={(e) => {
          setFilterOrgId(e.target.value);
          setFilterOfficeId('');
        }}
      >
        <option value="">🏢 All Organizations</option>
        {allOrganizations.map(org => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>

      {activeTab === 'departments' && (
        <select 
          className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[200px]"
          value={filterOfficeId}
          onChange={(e) => setFilterOfficeId(e.target.value)}
        >
          <option value="">📍 All Offices</option>
          {allOffices.map(office => (
            <option key={office.id} value={office.id}>{office.name}</option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div className="space-y-6">


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
                { 
                  accessorKey: 'name', 
                  header: 'Name',
                  cell: ({ row }) => (
                    <button 
                      onClick={() => {
                        setFilterOrgId(row.original.id);
                        setActiveTab('offices');
                      }}
                      className="text-primary hover:underline font-medium text-left transition-colors"
                    >
                      {row.original.name}
                    </button>
                  )
                },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { 
                  accessorKey: 'gstin', 
                  header: 'GSTIN', 
                  cell: ({ row }) => row.original.gstin ? (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 border border-border/50 text-foreground">
                      {row.original.gstin}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">N/A</span>
                },
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
              {...orgs.tableProps}
              searchPlaceholder="Search by name…"
              actionsNode={
                <Button onClick={handleAdd}>
                  <Plus size={16} className="mr-1.5" />
                  {addLabel}
                </Button>
              }
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
                { 
                  accessorKey: 'name', 
                  header: 'Name',
                  cell: ({ row }) => (
                    <button 
                      onClick={() => {
                        setFilterOfficeId(row.original.id);
                        if (row.original.organizationId) setFilterOrgId(row.original.organizationId);
                        setActiveTab('departments');
                      }}
                      className="text-primary hover:underline font-medium text-left transition-colors"
                    >
                      {row.original.name}
                    </button>
                  )
                },
                { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
                { 
                  id: 'organization', 
                  header: 'Organization', 
                  cell: ({ row }) => row.original.Organization?.name ? `🏢 ${row.original.Organization.name}` : 'Global/N/A' 
                },
                { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city || 'N/A' },
                { accessorKey: 'state', header: 'State', cell: ({ row }) => row.original.state || 'N/A' },
                { accessorKey: 'pincode', header: 'Pincode', cell: ({ row }) => row.original.pincode || 'N/A' },
                { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country || 'N/A' },
                { 
                  id: 'departments', 
                  header: 'Departments', 
                  cell: ({ row }) => {
                    const depts = row.original.departments || [];
                    if (depts.length === 0) return <span className="text-muted-foreground text-xs">None</span>;
                    return (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {depts.map((d) => (
                          <span key={d.id} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                            {d.name}
                          </span>
                        ))}
                      </div>
                    );
                  }
                },
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
              {...offices.tableProps}
              searchPlaceholder="Search by name…"
              filtersNode={filterNode}
              actionsNode={
                <Button onClick={handleAdd}>
                  <Plus size={16} className="mr-1.5" />
                  {addLabel}
                </Button>
              }
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
                { 
                  id: 'organization', 
                  header: 'Organization', 
                  cell: ({ row }) => row.original.Organization?.name ? `🏢 ${row.original.Organization.name}` : 'Global/N/A' 
                },
                { 
                  id: 'offices', 
                  header: 'Assigned Offices', 
                  cell: ({ row }) => {
                    const mappedOffices = row.original.offices && row.original.offices.length > 0
                      ? row.original.offices
                      : row.original.Office ? [row.original.Office] : [];
                    if (mappedOffices.length === 0) return <span className="text-muted-foreground text-xs">All Locations</span>;
                    return (
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {mappedOffices.map((off) => (
                          <span key={off.id} className="text-xs px-1.5 py-0.5 rounded bg-muted/70 text-foreground font-medium border border-border">
                            📍 {off.name}
                          </span>
                        ))}
                      </div>
                    );
                  }
                },
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
              {...depts.tableProps}
              searchPlaceholder="Search by name…"
              filtersNode={filterNode}
              actionsNode={
                <Button onClick={handleAdd}>
                  <Plus size={16} className="mr-1.5" />
                  {addLabel}
                </Button>
              }
            />
          )}
        </>
      )}

      <OrganizationFormDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} organization={editingOrg} />
      <OfficeFormDialog open={officeDialogOpen} onOpenChange={setOfficeDialogOpen} office={editingOffice} />
      <DepartmentFormDialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen} department={editingDept} />
      
      <ConfirmDialog
        open={deleteOrgConfirm}
        onOpenChange={setDeleteOrgConfirm}
        title="Delete Organization"
        description={`Delete organization "${orgToDelete?.name}"? This cannot be undone.`}
        onConfirm={confirmDeleteOrg}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={deleteOfficeConfirm}
        onOpenChange={setDeleteOfficeConfirm}
        title="Delete Office"
        description={`Delete office "${officeToDelete?.name}"? This cannot be undone.`}
        onConfirm={confirmDeleteOffice}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={deleteDeptConfirm}
        onOpenChange={setDeleteDeptConfirm}
        title="Delete Department"
        description={`Delete department "${deptToDelete?.name}"? This cannot be undone.`}
        onConfirm={confirmDeleteDept}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
