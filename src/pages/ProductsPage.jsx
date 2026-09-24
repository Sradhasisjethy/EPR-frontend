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
import { canViewRates, hasPermission } from '@/lib/permissions';
import { formatINR } from '@/lib/money';
import {
  useUoms, useDeleteUom,
  useProductCategories, useDeleteProductCategory,
  useHsnCodes, useDeleteHsnCode,
  useProducts, useDeleteProduct, useCreateUom, useUpdateUom, useCreateProductCategory, useUpdateProductCategory,
  useCreateHsnCode, useUpdateHsnCode,
  useMixDesigns, useDeleteMixDesign, } from '@/hooks/use-products';
import { MasterImportExportActions } from '@/components/master-data/import-export-actions';
import { MasterFormDialog } from '@/components/products/master-form-dialog';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { MixDesignFormDialog } from '@/components/products/mix-design-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTabParam } from '@/hooks/use-tab-param';
import { QueryState } from '@/components/query-state';
import { toast } from 'sonner';

const TABS = ['Products', 'Mix Designs', 'UoM', 'UoM Conversions', 'Categories', 'HSN Codes'];

// Each must match the allow-list the matching service passes to `toOrder` in
// utils/pagination.js. Sorting is server-side because these lists are paged
// server-side — sorting in the browser would only reorder the visible page.
const SORTABLE = {
  products: ['name', 'code', 'productType', 'status'],
  mixDesigns: ['name', 'effectiveFrom'],
  uoms: ['name', 'code', 'status'],
  categories: ['name', 'code', 'status'],
  hsn: ['code', 'status'],
};

function RowActions({ onEdit, onDelete, canModify, canDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {canModify && (
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
          <Pencil size={16} />
        </button>
      )}
      {canDelete && (
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useTabParam(TABS, 'Products', 'subtab');
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState(null);
  const [costDialogFor, setCostDialogFor] = useState(null);
  const [activateDialogFor, setActivateDialogFor] = useState(null);
  const { data: user } = useCurrentUser();
  const showRates = canViewRates(user);
  const canCreate = hasPermission(user, 'PRODUCT_CREATE');
  const canModify = hasPermission(user, 'PRODUCT_MODIFY');
  const canDelete = hasPermission(user, 'PRODUCT_DELETE');
  const [deleteError, setDeleteError] = useState('');

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

  const uomQuery = usePaginated(useUoms, {}, { sortableColumns: SORTABLE.uoms });
  const categoryQuery = usePaginated(useProductCategories, {}, { sortableColumns: SORTABLE.categories });
  const hsnQuery = usePaginated(useHsnCodes, {}, { sortableColumns: SORTABLE.hsn });
  const productQuery = usePaginated(useProducts, {}, { sortableColumns: SORTABLE.products });
  const mixQuery = usePaginated(useMixDesigns, {}, { sortableColumns: SORTABLE.mixDesigns });
  const conversionQuery = usePaginated(useUomConversions);
  const deleteConversion = useDeleteUomConversion();

  const deleteUom = useDeleteUom();
  const deleteCategory = useDeleteProductCategory();
  const deleteHsn = useDeleteHsnCode();
  const deleteProduct = useDeleteProduct();
  const deleteMixDesign = useDeleteMixDesign();

  const confirmDelete = (label, mutation, entity, customDesc) => {
    setDeleteDialog({
      open: true,
      label,
      description: customDesc || `Delete "${label}"? Only a record nothing references can be deleted. To retire one that is already in use, edit it and set its status to Inactive instead.`,
      entity,
      mutation,
    });
  };

  const executeDelete = () => {
    if (deleteDialog.entity && deleteDialog.mutation) {
      setDeleteError('');
      deleteDialog.mutation.mutate(deleteDialog.entity.id, {
        onSuccess: () => toast.success(`${deleteDialog.label} deleted`),
        // The failure keeps its page-level banner, which outlives the dialog.
        onError: (err) => setDeleteError(err.response?.data?.message || `Failed to delete "${deleteDialog.label}".`),
      });
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

  /**
   * Add, beside Import/Export/Sample for the tabs that have a master-data
   * module. Mix designs and UoM conversions do not: a versioned recipe and a
   * conversion factor are not flat rows, and a spreadsheet is the wrong shape
   * for either.
   */
  const tabActions = (module, label, query) => (
    <>
      {canCreate && (
        <Button onClick={addHandlers[activeTab]}>
          <Plus size={16} /> Add {activeTab === 'Mix Designs' ? 'Mix Design' : activeTab.replace(/s$/, '')}
        </Button>
      )}
      {module && (
        <MasterImportExportActions
          module={module}
          label={label}
          resource="PRODUCT"
          // Export what the screen is showing, not the page of it on screen.
          filters={{ ...(query.tableProps.searchValue ? { search: query.tableProps.searchValue } : {}) }}
        />
      )}
    </>
  );

  return (
    <div className="space-y-6">

      

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

      {deleteError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{deleteError}</div>
      )}

      {activeTab === 'Products' && (
        <QueryState query={productQuery.query} label="products">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'productType', header: 'Type', cell: ({ row }) => (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted">
                  {row.original.productType === 'FINISHED_GOOD' ? 'Finished Good' : 'Raw Material'}
                </span>
              )},
              { id: 'uom', header: 'UoM', cell: ({ row }) => row.original.uom?.code || 'N/A' },
              ...(showRates ? [{ id: 'sellingPrice', header: 'Selling Price (₹)', cell: ({ row }) => row.original.sellingPricePaise ? formatINR(row.original.sellingPricePaise) : '—' }] : []),
              ...(showRates ? [{ id: 'cost', header: 'Std. Cost', cell: ({ row }) => formatINR(row.original.standardCostPaise) }] : []),
              { id: 'reorder', header: 'Reorder Level', cell: ({ row }) => Number(row.original.reorderLevel) > 0 ? `${Number(row.original.reorderLevel)} ${row.original.uom?.code || ''}` : '—' },
              { id: 'curing', header: 'Curing (days)', cell: ({ row }) => row.original.curingDays ?? 0 },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    canModify={canModify}
                    canDelete={canDelete}
                    onEdit={() => { setEditingProduct(row.original); setProductDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteProduct, row.original)}
                  />
                ),
              },
            ]}
            {...productQuery.tableProps}
            emptyMessage="No products yet. Add a finished good or raw material to get started."
            actionsNode={tabActions('products', 'Products', productQuery)}
            searchPlaceholder="Search product name or code…"
          />
        </QueryState>
      )}

      {activeTab === 'Mix Designs' && (
        <QueryState query={mixQuery.query} label="mix designs">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Design Name' },
              { id: 'product', header: 'Product', cell: ({ row }) => row.original.product?.name || row.original.productId },
              {
                id: 'status', header: 'Version',
                cell: ({ row }) => <BomStatusBadge status={row.original.status} version={row.original.version} />,
              },
              { id: 'yield', header: 'Output Yield', cell: ({ row }) => `${Number(row.original.outputQuantity || 1)} ${row.original.product?.uom?.code || 'units'}` },
              { id: 'effectiveFrom', header: 'Effective From', cell: ({ row }) => row.original.effectiveFrom || '—' },
              { id: 'lines', header: 'Lines', cell: ({ row }) => row.original.lines?.length ?? 0 },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <div className="flex items-center justify-end gap-1">
                    {/* Only a DRAFT is editable — an ACTIVE/SUPERSEDED version is history. */}
                    {row.original.status === 'DRAFT' && canModify && (
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
                      onDelete={
                        row.original.status === 'DRAFT' && canDelete
                          ? () => confirmDelete(
                              row.original.name,
                              deleteMixDesign,
                              row.original,
                              `Delete draft mix design "${row.original.name}" (v${row.original.version})? Only an unused draft can be removed. This cannot be undone.`
                            )
                          : undefined
                      }
                    />
                  </div>
                ),
              },
            ]}
            {...mixQuery.tableProps}
            emptyMessage="No mix designs yet. Define one against a finished good so production knows what to consume."
            actionsNode={tabActions(null, null, mixQuery)}
            searchPlaceholder="Search mix design…"
          />
        </QueryState>
      )}

      {activeTab === 'UoM' && (
        <QueryState query={uomQuery.query} label="UoMs">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code' },
              { accessorKey: 'uqc', header: 'Statutory GST UQC', cell: ({ row }) => row.original.uqc ? <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 border border-border/60">{row.original.uqc}</span> : '—' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    canModify={canModify}
                    canDelete={canDelete}
                    onEdit={() => { setEditingUom(row.original); setUomDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteUom, row.original)}
                  />
                ),
              },
            ]}
            {...uomQuery.tableProps}
            emptyMessage="No units of measure yet. Add one before creating products."
            actionsNode={tabActions('uoms', 'Units of Measure', uomQuery)}
            searchPlaceholder="Search UoM…"
          />
        </QueryState>
      )}

      {activeTab === 'Categories' && (
        <QueryState query={categoryQuery.query} label="categories">
          <DataTable
            columns={[
              { accessorKey: 'name', header: 'Name' },
              { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code || 'N/A' },
              { id: 'parentCategory', header: 'Parent Category (Hierarchy)', cell: ({ row }) => row.original.parentCategory?.name ? <span className="text-xs font-semibold text-primary">{row.original.parentCategory.name}</span> : <span className="text-xs text-muted-foreground">— (Root)</span> },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    canModify={canModify}
                    canDelete={canDelete}
                    onEdit={() => { setEditingCategory(row.original); setCategoryDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.name, deleteCategory, row.original)}
                  />
                ),
              },
            ]}
            {...categoryQuery.tableProps}
            emptyMessage="No categories yet. Categories group products for reporting and ageing thresholds."
            actionsNode={tabActions('product-categories', 'Product Categories', categoryQuery)}
            searchPlaceholder="Search category…"
          />
        </QueryState>
      )}

      {activeTab === 'HSN Codes' && (
        <QueryState query={hsnQuery.query} label="HSN codes">
          <DataTable
            columns={[
              { id: 'type', header: 'Type', cell: ({ row }) => (
                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${row.original.codeType === 'SAC' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-primary/10 text-primary border-primary/20'}`}>
                  {row.original.codeType || 'HSN'}
                </span>
              )},
              { accessorKey: 'code', header: 'HSN / SAC Code' },
              { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || 'N/A' },
              { accessorKey: 'gstRatePercent', header: 'GST Rate', cell: ({ row }) => `${row.original.gstRatePercent}%` },
              { id: 'cess', header: 'Cess %', cell: ({ row }) => Number(row.original.cessPercent) > 0 ? `${row.original.cessPercent}%` : '—' },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
              {
                id: 'actions', header: '',
                cell: ({ row }) => (
                  <RowActions
                    canModify={canModify}
                    canDelete={canDelete}
                    onEdit={() => { setEditingHsn(row.original); setHsnDialogOpen(true); }}
                    onDelete={() => confirmDelete(row.original.code, deleteHsn, row.original)}
                  />
                ),
              },
            ]}
            {...hsnQuery.tableProps}
            emptyMessage="No HSN codes yet. Add the codes your products are taxed under."
            actionsNode={tabActions('hsn-codes', 'HSN Codes', hsnQuery)}
            searchPlaceholder="Search HSN code…"
          />
        </QueryState>
      )}

      <MasterFormDialog
        open={uomDialogOpen} onOpenChange={setUomDialogOpen} entity={editingUom} title="UoM"
        fields={[
          { name: 'name', label: 'Unit Name', required: true, placeholder: 'e.g. Metric Tonne, Cubic Meter' },
          { name: 'code', label: 'Unit Symbol / Code', required: true, placeholder: 'e.g. MT, CUM, NOS' },
          {
            name: 'uqc',
            label: 'Statutory GST UQC Code',
            type: 'select',
            placeholder: 'Select Statutory GST UQC',
            hint: 'Official Unit Quantity Code mapped for GST e-Invoicing, e-Way bills, and GSTR reporting.',
            options: [
              { value: 'BAG', label: 'BAG — Bags' },
              { value: 'CUM', label: 'CUM — Cubic Meters' },
              { value: 'KGS', label: 'KGS — Kilograms' },
              { value: 'TON', label: 'TON — Tonnes / Metric Tons' },
              { value: 'NOS', label: 'NOS — Numbers / Pieces' },
              { value: 'MTR', label: 'MTR — Meters' },
              { value: 'SQM', label: 'SQM — Square Meters' },
              { value: 'SQF', label: 'SQF — Square Feet' },
              { value: 'LTR', label: 'LTR — Litres' },
              { value: 'BOX', label: 'BOX — Boxes' },
              { value: 'BDL', label: 'BDL — Bundles' },
              { value: 'OTH', label: 'OTH — Others' },
            ],
          },
        ]}
        createMutation={useCreateUom()} updateMutation={useUpdateUom()}
      />

      <MasterFormDialog
        open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} entity={editingCategory} title="Category"
        fields={[
          { name: 'name', label: 'Category Name', required: true, placeholder: 'e.g. Reinforced Concrete Pipes' },
          { name: 'code', label: 'Category Code', placeholder: 'e.g. RCP-PIPE' },
          {
            name: 'parentId',
            label: 'Parent Category (Hierarchy)',
            type: 'select',
            placeholder: 'None (Root Category)',
            hint: 'Nest subcategories under a parent (e.g. Aggregates -> 10mm / 20mm or Precast -> Boundary Wall).',
            options: () =>
              (categoryQuery.query.data?.rows || [])
                .filter((c) => c.id !== editingCategory?.id)
                .map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
        buildPayload={(form) => ({
          name: form.name,
          code: form.code || undefined,
          parentId: form.parentId || null,
        })}
        createMutation={useCreateProductCategory()} updateMutation={useUpdateProductCategory()}
      />

      <MasterFormDialog
        open={hsnDialogOpen} onOpenChange={setHsnDialogOpen} entity={editingHsn} title="HSN / SAC Code"
        fields={[
          {
            name: 'codeType',
            label: 'Tax Classification',
            type: 'radio',
            default: 'HSN',
            options: [
              { value: 'HSN', label: 'Goods (HSN Code)' },
              { value: 'SAC', label: 'Services (SAC Code)' },
            ],
          },
          { name: 'code', label: 'HSN / SAC Code', required: true, placeholder: 'e.g. 6810' },
          { name: 'description', label: 'Tariff Description', placeholder: 'e.g. Articles of cement, concrete or artificial stone' },
          { name: 'gstRatePercent', label: 'GST Rate (%)', type: 'number', step: '0.1', placeholder: '18', hint: 'Applicable combined GST rate (CGST + SGST or IGST)' },
          { name: 'cessPercent', label: 'Compensation Cess (%)', type: 'number', step: '0.1', placeholder: '0', hint: 'Special cess applicable on specified minerals or coal' },
        ]}
        buildPayload={(form) => ({
          codeType: form.codeType || 'HSN',
          code: form.code,
          description: form.description || undefined,
          gstRatePercent: form.gstRatePercent !== '' ? Number(form.gstRatePercent) : 0,
          cessPercent: form.cessPercent !== '' ? Number(form.cessPercent) : 0,
        })}
        createMutation={useCreateHsnCode()} updateMutation={useUpdateHsnCode()}
      />
      {activeTab === 'UoM Conversions' && (
        <QueryState query={conversionQuery.query} label="UoM conversions">
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
                    canModify={canModify}
                    canDelete={canDelete}
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
            emptyMessage="No conversions yet. Add one so a BOM can be written in a different unit from the stocking unit."
            actionsNode={tabActions(null, null, conversionQuery)}
            searchPlaceholder="Search by unit…"
          />
        </QueryState>
      )}

      <UomConversionDialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen} conversion={editingConversion} />
      <BomCostDialog open={!!costDialogFor} onOpenChange={(v) => !v && setCostDialogFor(null)} mixDesign={costDialogFor} />
      <ActivateBomDialog open={!!activateDialogFor} onOpenChange={(v) => !v && setActivateDialogFor(null)} mixDesign={activateDialogFor} />

      <ProductFormDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} product={editingProduct} />
      <MixDesignFormDialog
        open={mixDialogOpen}
        onOpenChange={setMixDialogOpen}
        mixDesign={editingMix}
        onDelete={
          canDelete
            ? (mix) => confirmDelete(
                mix.name,
                deleteMixDesign,
                mix,
                `Delete draft mix design "${mix.name}" (v${mix.version})? Only an unused draft can be removed. This cannot be undone.`
              )
            : undefined
        }
      />

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
