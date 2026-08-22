import { useState } from 'react';
import { BomStatusBadge, BomCostDialog, ActivateBomDialog, BomRowActions } from '@/components/products/bom-version-actions';
import { UomConversionDialog } from '@/components/products/uom-conversion-dialog';
import { useUomConversions, useDeleteUomConversion } from '@/hooks/use-uom-conversions';
import { usePaginated } from '@/hooks/use-paginated';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-auth';
import { canViewRates } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import {
  useUoms, useDeleteUom,
  useProductCategories, useDeleteProductCategory,
  useHsnCodes, useDeleteHsnCode,
  useProducts, useDeleteProduct, useCreateUom, useUpdateUom, useCreateProductCategory, useUpdateProductCategory,
  useCreateHsnCode, useUpdateHsnCode,
  useMixDesigns, } from '@/hooks/use-products';
import { MasterFormDialog } from '@/components/products/master-form-dialog';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { MixDesignFormDialog } from '@/components/products/mix-design-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTabParam } from '@/hooks/use-tab-param';

const TABS = ['Products', 'Mix Designs', 'UoM', 'UoM Conversions', 'Categories', 'HSN Codes'];

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
        <Pencil size={16} />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function LoadingOrError({ isLoading, isError, label, children }) {
  if (isLoading) return <div className="w-full h-96 rounded-xl border border-border bg-card animate-pulse" />;
  if (isError) return <div className="p-8 text-center rounded-xl border border-destructive/20 text-destructive">Failed to load {label}.</div>;
  return children;
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Products');
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [costDialogFor, setCostDialogFor] = useState(null);
  const [activateDialogFor, setActivateDialogFor] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);

  // Dialog state
  const [uomDialogOpen, setUomDialogOpen] = useState(false);
  const [editingUom, setEditingUom] = useState(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [hsnDialogOpen, setHsnDialogOpen] = useState(false);
  const [editingHsn, setEditingHsn] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [mixDialogOpen, setMixDialogOpen] = useState(false);
  const [editingMix, setEditingMix] = useState(null);
  
  const [deleteDialog, setDeleteDialog] = useState({ open: false, label: '', description: '', entity: null, mutation: null });

  const uomQuery = usePaginated(useUoms);
  const categoryQuery = usePaginated(useProductCategories);
  const hsnQuery = usePaginated(useHsnCodes);
  const productQuery = usePaginated(useProducts);
  const mixQuery = usePaginated(useMixDesigns);
  const conversionQuery = usePaginated(useUomConversions);
  const deleteConversion = useDeleteUomConversion();

  const deleteUom = useDeleteUom();
  const deleteCategory = useDeleteProductCategory();
  const deleteHsn = useDeleteHsnCode();
  const deleteProduct = useDeleteProduct();

  const confirmDelete = (label, mutation, entity, customDesc) => {
    setDeleteDialog({
      open: true,
      label,
      description: customDesc || `Delete "${label}"? This cannot be undone.`,
      entity,
      mutation,
    });
  };

  const executeDelete = () => {
    if (deleteDialog.entity && deleteDialog.mutation) {
      deleteDialog.mutation.mutate(deleteDialog.entity.id);
      setDeleteDialog(prev => ({ ...prev, open: false }));
    }
  };

  const addHandlers = {
    Products: () => { setEditingProduct(null); setProductDialogOpen(true); },
    'Mix Designs': () => { setEditingMix(null); setMixDialogOpen(true); },
    UoM: () => { setEditingUom(null); setUomDialogOpen(true); },
    Categories: () => { setEditingCategory(null); setCategoryDialogOpen(true); },
    'HSN Codes': () => { setEditingHsn(null); setHsnDialogOpen(true); },
    'UoM Conversions': () => { setEditingConversion(null); setConversionDialogOpen(true); },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products & BOM</h2>
          <p className="text-muted-foreground">Product, category, UoM, HSN and mix design masters (M03)</p>
        </div>
        <Button onClick={addHandlers[activeTab]}>
          <Plus size={16} /> Add {activeTab === 'Mix Designs' ? 'Mix Design' : activeTab.replace(/s$/, '')}
        </Button>
      </div>

      <div className="flex border-b border-border mb-6">
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
          </button>
        ))}
      </div>

      {activeTab === 'Products' && (
        <LoadingOrError isLoading={productQuery.query.isLoading} isError={productQuery.query.isError} label="products">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'productType', header: 'Type' },
              { id: 'uom', header: 'UoM', cell: ({ row }) => row.original.uom?.code || 'N/A' },
              { id: 'curing', header: 'Curing (days)', cell: ({ row }) => row.original.curingDays ?? 0 },
              ...(showRates ? [{ id: 'cost', header: 'Std. Cost', cell: ({ row }) => formatINR(row.original.standardCostPaise) }] : []),
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    onEdit={() => { setEditingProduct(row.original); setProductDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteProduct, row.original)}
                  />
                ),
              },
            ]}
            {...productQuery.tableProps}
            searchPlaceholder="Search product name or code…"
          />
        </LoadingOrError>
      )}

      {activeTab === 'Mix Designs' && (
        <LoadingOrError isLoading={mixQuery.query.isLoading} isError={mixQuery.query.isError} label="mix designs">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Design Name' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              {
                id: 'status', header: 'Version',
                cell: ({ row }) => <BomStatusBadge status={row.original.status} version={row.original.version} />,
              },
              { id: 'effectiveFrom', header: 'Effective From', cell: ({ row }) => row.original.effectiveFrom || '—' },
              { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex items-center justify-end gap-1">
                    {/* Only a DRAFT is editable — an ACTIVE/SUPERSEDED version is history. */}
                    {row.original.status === 'DRAFT' && (
                      <button
                        onClick={() => { setEditingMix(row.original); setMixDialogOpen(true); }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit draft"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <BomRowActions
                      mixDesign={row.original}
                      onShowCost={setCostDialogFor}
                      onActivate={setActivateDialogFor}
                    />
                  </div>
                ),
              },
            ]}
            {...mixQuery.tableProps}
            searchPlaceholder="Search mix design…"
          />
        </LoadingOrError>
      )}

      {activeTab === 'UoM' && (
        <LoadingOrError isLoading={uomQuery.query.isLoading} isError={uomQuery.query.isError} label="UoMs">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    onEdit={() => { setEditingUom(row.original); setUomDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteUom, row.original)}
                  />
                ),
              },
            ]}
            {...uomQuery.tableProps}
            searchPlaceholder="Search UoM…"
          />
        </LoadingOrError>
      )}

      {activeTab === 'Categories' && (
        <LoadingOrError isLoading={categoryQuery.query.isLoading} isError={categoryQuery.query.isError} label="categories">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    onEdit={() => { setEditingCategory(row.original); setCategoryDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteCategory, row.original)}
                  />
                ),
              },
            ]}
            {...categoryQuery.tableProps}
            searchPlaceholder="Search category…"
          />
        </LoadingOrError>
      )}

      {activeTab === 'HSN Codes' && (
        <LoadingOrError isLoading={hsnQuery.query.isLoading} isError={hsnQuery.query.isError} label="HSN codes">
          <DataTable
            columns={[
              { accessorKey: 'code', header: 'HSN Code' },
              { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || 'N/A' },
              { accessorKey: 'gstRatePercent', header: 'GST %' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    onEdit={() => { setEditingHsn(row.original); setHsnDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.code, deleteHsn, row.original)}
                  />
                ),
              },
            ]}
            {...hsnQuery.tableProps}
            searchPlaceholder="Search HSN code…"
          />
        </LoadingOrError>
      )}

      <MasterFormDialog
        open={uomDialogOpen} onOpenChange={setUomDialogOpen} entity={editingUom} title="UoM"
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code', required: true }]}
        createMutation={useCreateUom()} updateMutation={useUpdateUom()}
      />
      <MasterFormDialog
        open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} entity={editingCategory} title="Category"
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code' }]}
        createMutation={useCreateProductCategory()} updateMutation={useUpdateProductCategory()}
      />
      <MasterFormDialog
        open={hsnDialogOpen} onOpenChange={setHsnDialogOpen} entity={editingHsn} title="HSN Code"
        fields={[
          { name: 'code', label: 'HSN Code', required: true },
          { name: 'description', label: 'Description' },
          { name: 'gstRatePercent', label: 'GST %', type: 'number' },
        ]}
        createMutation={useCreateHsnCode()} updateMutation={useUpdateHsnCode()}
      />
      {activeTab === 'UoM Conversions' && (
        <LoadingOrError isLoading={conversionQuery.query.isLoading} isError={conversionQuery.query.isError} label="UoM conversions">
          <DataTable
            columns={[
              {
                id: 'conversion', header: 'Conversion',
                cell: ({ row }) => (
                  <span className="tabular-nums">
                    1 {row.original.fromUom?.code} = {Number(row.original.factor)} {row.original.toUom?.code}
                  </span>
                ),
              },
              { id: 'from', header: 'From', cell: ({ row }) => row.original.fromUom?.name },
              { id: 'to', header: 'To', cell: ({ row }) => row.original.toUom?.name },
              { accessorKey: 'status', header: 'Status' },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    onEdit={() => { setEditingConversion(row.original); setConversionDialogOpen(true); }}
                    onDelete={() => confirmDelete(
                      'Conversion',
                      deleteConversion,
                      row.original,
                      'Delete this conversion? Anything relying on it will stop converting.'
                    )}
                  />
                ),
              },
            ]}
            {...conversionQuery.tableProps}
            searchPlaceholder="Search by unit…"
            emptyMessage="No conversions yet. Add one so BOM lines can be written in any unit."
          />
        </LoadingOrError>
      )}

      <UomConversionDialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen} conversion={editingConversion} />
      <BomCostDialog open={!!costDialogFor} onOpenChange={(v) => !v && setCostDialogFor(null)} mixDesign={costDialogFor} />
      <ActivateBomDialog open={!!activateDialogFor} onOpenChange={(v) => !v && setActivateDialogFor(null)} mixDesign={activateDialogFor} />

      <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} product={editingProduct} />
      <MixDesignFormDialog open={mixDialogOpen} onOpenChange={setMixDialogOpen} mixDesign={editingMix} />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(isOpen) => setDeleteDialog(prev => ({ ...prev, open: isOpen }))}
        title={`Delete ${deleteDialog.label}`}
        description={deleteDialog.description}
        onConfirm={executeDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
