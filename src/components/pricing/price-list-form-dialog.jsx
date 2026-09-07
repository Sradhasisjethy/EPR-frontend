import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Download, Upload, Zap, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePriceList, useUpdatePriceList, usePriceList } from '@/hooks/use-pricing';
import { useAllProducts } from '@/hooks/use-products';
import { useParties } from '@/hooks/use-parties';
import { PriceType, PartyType } from '@/constants/enums';
import { toPaise, fromPaise, formatINR } from '@/lib/money';
import { toInput } from '@/lib/decimal';
import { toast } from 'sonner';

const emptyLine = {
  productId: '',
  rateRupees: '',
  minQuantity: '1',
  discountPercent: '0',
};

const emptyForm = {
  name: '',
  applicableTo: 'ALL_CUSTOMERS', // 'ALL_CUSTOMERS' | 'CUSTOMER_TIER' | 'SPECIFIC_PARTY'
  priceType: PriceType.RETAIL,
  partyId: '',
  customerTier: 'Wholesale',
  rateBasis: 'TAX_EXCLUSIVE', // 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE'
  effectiveFrom: '',
  validUntil: '',
  isDefault: false,
  status: 'active',
};

export function PriceListFormDialog({ open, onOpenChange, priceListId }) {
  const isEditing = !!priceListId;
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const { data: existing } = usePriceList(priceListId);
  // Needs the whole catalogue: it bulk-populates every active product and
  // matches CSV imports by name, both of which break on a truncated list.
  const { data: productData } = useAllProducts();
  const { data: partyData } = useParties({ page: 1, limit: 100 });
  const createMutation = useCreatePriceList();
  const updateMutation = useUpdatePriceList();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const products = productData?.rows || [];
  const parties = partyData?.rows || [];

  // Map products by ID for fast lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  useEffect(() => {
    if (open) {
      if (isEditing && existing) {
        let applicable = 'ALL_CUSTOMERS';
        if (existing.partyId) {
          applicable = 'SPECIFIC_PARTY';
        } else if (existing.customerTier || existing.priceType === PriceType.WHOLESALE) {
          applicable = 'CUSTOMER_TIER';
        }

        setForm({
          name: existing.name || '',
          applicableTo: applicable,
          priceType: existing.priceType || PriceType.RETAIL,
          partyId: existing.partyId || '',
          customerTier: existing.customerTier || (existing.priceType === PriceType.WHOLESALE ? 'Wholesale' : 'Retail'),
          rateBasis: existing.rateBasis || 'TAX_EXCLUSIVE',
          effectiveFrom: existing.effectiveFrom ? existing.effectiveFrom.slice(0, 10) : '',
          validUntil: existing.validUntil ? existing.validUntil.slice(0, 10) : '',
          isDefault: !!existing.isDefault,
          status: existing.status || 'active',
        });

        setItems(
          (existing.items || []).map((i) => ({
            productId: i.productId,
            rateRupees: fromPaise(i.ratePaise),
            minQuantity: toInput(i.minQuantity, '1'),
            discountPercent: toInput(i.discountPercent, '0'),
          }))
        );
      } else if (!isEditing) {
        setForm(emptyForm);
        setItems([{ ...emptyLine }]);
      }
      setError('');
    }
  }, [open, isEditing, existing]);

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyLine }]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleProductSelect = (index, productId) => {
    const prod = productMap.get(productId);
    let defaultRate = '';
    if (prod) {
      if (prod.sellingPricePaise) {
        defaultRate = fromPaise(prod.sellingPricePaise);
      } else if (prod.standardCostPaise) {
        defaultRate = fromPaise(prod.standardCostPaise);
      }
    }
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              productId,
              rateRupees: it.rateRupees || defaultRate,
            }
          : it
      )
    );
  };

  // Bulk action 1: Populate all active products with default rates
  const handlePopulateAllProducts = () => {
    const activeProducts = products.filter((p) => p.status === 'active');
    if (!activeProducts.length) return;

    setItems(
      activeProducts.map((p) => ({
        productId: p.id,
        rateRupees: p.sellingPricePaise ? fromPaise(p.sellingPricePaise) : p.standardCostPaise ? fromPaise(p.standardCostPaise) : '',
        minQuantity: '1',
        discountPercent: '0',
      }))
    );
  };

  // Bulk action 2: Export CSV
  const handleExportCsv = () => {
    const headers = ['SKU / Code', 'Product Name', 'UoM', 'Rate (INR)', 'Min Quantity', 'Discount (%)', 'Standard Cost (INR)'];
    const rows = items
      .filter((i) => i.productId)
      .map((i) => {
        const p = productMap.get(i.productId);
        return [
          `"${p?.code || ''}"`,
          `"${p?.name || ''}"`,
          `"${p?.uom?.code || ''}"`,
          i.rateRupees || 0,
          i.minQuantity || 1,
          i.discountPercent || 0,
          p?.standardCostPaise ? fromPaise(p.standardCostPaise) : 0,
        ];
      });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(form.name || 'Price_List').replace(/\s+/g, '_')}_Rates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk action 3: Import CSV
  const handleImportCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const importedItems = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
        const [codeOrName, , , rateStr, minQtyStr, discStr] = cols;

        if (!codeOrName) continue;
        const matchedProduct = products.find(
          (p) => p.code?.toLowerCase() === codeOrName.toLowerCase() || p.name?.toLowerCase() === codeOrName.toLowerCase()
        );

        if (matchedProduct) {
          importedItems.push({
            productId: matchedProduct.id,
            rateRupees: rateStr || (matchedProduct.sellingPricePaise ? fromPaise(matchedProduct.sellingPricePaise) : ''),
            minQuantity: minQtyStr || '1',
            discountPercent: discStr || '0',
          });
        }
      }

      if (importedItems.length) {
        setItems(importedItems);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (items.some((i) => !i.productId || i.rateRupees === '')) {
      setError('Every line needs a product and a valid rate.');
      return;
    }

    let resolvedPriceType = form.priceType;
    let resolvedPartyId = undefined;
    let resolvedTier = undefined;

    if (form.applicableTo === 'SPECIFIC_PARTY') {
      resolvedPriceType = PriceType.PARTY_SPECIFIC;
      resolvedPartyId = form.partyId || undefined;
      if (!resolvedPartyId) {
        setError('Please select a specific customer or contractor for party-specific pricing.');
        return;
      }
    } else if (form.applicableTo === 'CUSTOMER_TIER') {
      resolvedPriceType = form.customerTier === 'Wholesale' ? PriceType.WHOLESALE : PriceType.RETAIL;
      resolvedTier = form.customerTier;
    } else {
      resolvedPriceType = PriceType.RETAIL;
    }

    const payload = {
      name: form.name,
      priceType: resolvedPriceType,
      partyId: resolvedPartyId,
      customerTier: resolvedTier,
      rateBasis: form.rateBasis,
      effectiveFrom: form.effectiveFrom || undefined,
      validUntil: form.validUntil || undefined,
      isDefault: form.isDefault,
      items: items.map((i) => ({
        productId: i.productId,
        ratePaise: toPaise(i.rateRupees),
        minQuantity: Number(i.minQuantity) || 1,
        discountPercent: Number(i.discountPercent) || 0,
      })),
    };

    const mutation = isEditing ? updateMutation.mutateAsync({ id: priceListId, ...payload, status: form.status }) : createMutation.mutateAsync(payload);
    mutation.then(() => { toast.success(isEditing ? 'Price list updated' : 'Price list created'); onOpenChange(false); }).catch((err) => setError(err.response?.data?.message || 'Failed to save price list.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[calc(100vh-60px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Price List' : 'New Price List & Rate Contract'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0">
            {error}
          </div>
        )}

        <form id="price-list-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* CARD 1: CORE HEADER & TARGET SCOPE */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>🏷️</span> Scope & General Pricing Policy
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pl-name">
                  Price List Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pl-name"
                  placeholder="e.g. Standard Wholesale List FY26-27"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="pl-applicable-to">
                  Applicable To <span className="text-destructive">*</span>
                </Label>
                <select
                  id="pl-applicable-to"
                  value={form.applicableTo}
                  onChange={(e) => setForm({ ...form, applicableTo: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                >
                  <option value="ALL_CUSTOMERS">All Customers (General / Default)</option>
                  <option value="CUSTOMER_TIER">Customer Group / Tier</option>
                  <option value="SPECIFIC_PARTY">Specific Customer / Contractor</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <Label>Rate Basis</Label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="plRateBasis"
                      value="TAX_EXCLUSIVE"
                      checked={form.rateBasis === 'TAX_EXCLUSIVE'}
                      onChange={(e) => setForm({ ...form, rateBasis: e.target.value })}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Tax Exclusive</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="plRateBasis"
                      value="TAX_INCLUSIVE"
                      checked={form.rateBasis === 'TAX_INCLUSIVE'}
                      onChange={(e) => setForm({ ...form, rateBasis: e.target.value })}
                      className="text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>MRP / Tax Incl.</span>
                  </label>
                </div>
              </div>
            </div>

            {/* CONDITIONAL ROW: TIER SELECTOR OR SPECIFIC PARTY SELECTOR */}
            {form.applicableTo === 'SPECIFIC_PARTY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label htmlFor="pl-party">
                    Select Specific Customer / Contractor <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="pl-party"
                    value={form.partyId}
                    onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                    required
                  >
                    <option value="" disabled>Select party</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.partyType}) {p.code ? `[${p.code}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground pb-1">
                    Special negotiated rates will automatically override standard price lists on sales orders for this party.
                  </p>
                </div>
              </div>
            )}

            {form.applicableTo === 'CUSTOMER_TIER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label htmlFor="pl-tier">Customer Group / Tier</Label>
                  <select
                    id="pl-tier"
                    value={form.customerTier}
                    onChange={(e) => setForm({ ...form, customerTier: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium"
                  >
                    <option value="Wholesale">Wholesale / Trade Channel</option>
                    <option value="Distributor">Primary Distributor / Stockist</option>
                    <option value="Institutional">Institutional / Project Contract</option>
                    <option value="Retail">Retail Walk-in / Direct Consumer</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground pb-1">
                    Automatically applies to customers configured under this customer category.
                  </p>
                </div>
              </div>
            )}

            {/* ROW 3: EFFECTIVE DATE RANGE & DEFAULT CHECKBOX */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-border/40">
              <div className="space-y-1.5">
                <Label htmlFor="pl-effective-from">Effective From</Label>
                <Input
                  id="pl-effective-from"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pl-valid-until">Valid Until</Label>
                <Input
                  id="pl-valid-until"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Is Default Base Price List</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Acts as general fallback for sales orders when no specific tier matches.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* CARD 2: LINE-LEVEL RATES & SLAB PRICING TABLE */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span>📊</span> Product Rates & Volume Slab Pricing
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Configure unit selling rates, minimum order slabs, and default discounts.
                </p>
              </div>

              {/* Bulk Operation Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePopulateAllProducts}
                  className="h-8 gap-1.5 text-xs"
                  title="Load all active catalogue products into table"
                >
                  <Zap size={13} className="text-amber-500" /> Populate All Products
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 gap-1.5 text-xs"
                  title="Import spreadsheet CSV"
                >
                  <Upload size={13} /> Import CSV
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCsv}
                  accept=".csv"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-8 gap-1.5 text-xs"
                  title="Export rates table to CSV"
                >
                  <Download size={13} /> Export CSV
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={addItem}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Plus size={13} /> Add Line
                </Button>
              </div>
            </div>

            {/* Table Header & Rows */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1.8fr_140px_110px_110px_36px] gap-2.5 px-1 text-xs font-semibold text-muted-foreground">
                <span>Product Item & Cost Reference</span>
                <span>Selling Rate (₹)</span>
                <span>Min Qty Slab</span>
                <span>Discount (%)</span>
                <span></span>
              </div>

              {items.map((item, index) => {
                const prod = productMap.get(item.productId);
                const uomCode = prod?.uom?.code || 'Unit';
                const stdCostPaise = prod?.standardCostPaise || 0;
                const stdCostRupees = stdCostPaise ? fromPaise(stdCostPaise) : 0;
                const isBelowCost = item.rateRupees && Number(item.rateRupees) < Number(stdCostRupees) && Number(stdCostRupees) > 0;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-[1.8fr_140px_110px_110px_36px] gap-2.5 items-center p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors"
                  >
                    {/* Product Selector + Standard Cost Badge */}
                    <div className="space-y-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium"
                        required
                      >
                        <option value="" disabled>Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) [{p.uom?.code || 'Unit'}]
                          </option>
                        ))}
                      </select>

                      {prod && (
                        <div className="flex items-center gap-2 px-1 text-[10px]">
                          <span className="text-muted-foreground">
                            Std Cost: <strong className="font-mono text-foreground">₹{formatINR(stdCostPaise)}</strong>
                          </span>
                          {isBelowCost && (
                            <span className="flex items-center gap-1 font-semibold text-destructive">
                              <AlertTriangle size={11} /> Below Cost!
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rate Input + UoM Indicator */}
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[11px] text-muted-foreground font-semibold">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.rateRupees}
                        onChange={(e) => updateItem(index, 'rateRupees', e.target.value)}
                        required
                        className={`h-8 text-xs pl-6 pr-12 font-medium ${isBelowCost ? 'border-destructive focus-visible:ring-destructive text-destructive' : ''}`}
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-semibold whitespace-nowrap pointer-events-none">
                        /{uomCode}
                      </span>
                    </div>

                    {/* Min Quantity (Tier/Slab) */}
                    <Input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="Min Qty"
                      value={item.minQuantity}
                      onChange={(e) => updateItem(index, 'minQuantity', e.target.value)}
                      required
                      className="h-8 text-xs font-medium"
                    />

                    {/* Default Discount (%) */}
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={item.discountPercent}
                        onChange={(e) => updateItem(index, 'discountPercent', e.target.value)}
                        className="h-8 text-xs pr-6"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground font-semibold">%</span>
                    </div>

                    {/* Remove Action */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors flex items-center justify-center"
                      title="Remove rate row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="price-list-form" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Price List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
