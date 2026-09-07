import { useEffect, useState } from 'react';
import { Plus, Trash2, ClipboardList, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatUom } from '@/lib/utils';
import { useCreateIndent } from '@/hooks/use-indents';
import { useFactories } from '@/hooks/use-factory';
import { useProducts } from '@/hooks/use-products';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const emptyLine = { productId: '', quantity: '' };

/**
 * FR-M11-1: an indent asks for a quantity. Price is deliberately absent — that
 * is decided by the buyer when the indent is converted into a purchase order.
 */
export function IndentFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState({ factoryId: '', indentDate: '', requiredByDate: '', remarks: '' });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [error, setError] = useState('');

  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const { data: productData } = useProducts({ page: 1, limit: 100 });
  const createMutation = useCreateIndent();

  const productMap = new Map((productData?.rows || []).map((p) => [p.id, p]));

  useEffect(() => {
    if (open) {
      setForm({ factoryId: '', indentDate: today(), requiredByDate: '', remarks: '' });
      setLines([{ ...emptyLine }]);
      setError('');
    }
  }, [open]);

  const updateLine = (i, field, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const filledLinesCount = lines.filter((l) => l.productId && Number(l.quantity) > 0).length;

  // Group quantities by Unit of Measure (UoM) to avoid summing mismatched units (e.g. Bags + MT)
  const qtyByUom = lines.reduce((acc, l) => {
    if (!l.productId || !l.quantity || Number(l.quantity) <= 0) return acc;
    const prod = productMap.get(l.productId);
    const uom = prod?.uom?.code || prod?.uomCode || 'units';
    acc[uom] = (acc[uom] || 0) + Number(l.quantity);
    return acc;
  }, {});
  const uomEntries = Object.entries(qtyByUom);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.factoryId) {
      setError('Please select a target factory.');
      return;
    }

    if (!form.indentDate) {
      setError('Please select an indent date.');
      return;
    }

    if (lines.length === 0 || lines.some((l) => !l.productId || !l.quantity || Number(l.quantity) <= 0)) {
      setError('Every line needs a product and a valid quantity greater than 0.');
      return;
    }

    // Check for duplicate products
    const productIds = lines.map((l) => l.productId);
    const duplicateId = productIds.find((id, index) => productIds.indexOf(id) !== index);
    if (duplicateId) {
      const prod = productMap.get(duplicateId);
      setError(`Duplicate item selected: "${prod?.name || 'Item'}". Please combine duplicate lines into a single quantity.`);
      return;
    }

    createMutation
      .mutateAsync({
        ...form,
        requiredByDate: form.requiredByDate || undefined,
        remarks: form.remarks?.trim() || undefined,
        lines: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      })
      .then(() => { toast.success('Purchase indent raised'); onOpenChange(false); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to raise the indent.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[calc(100vh-60px)] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0 bg-background">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ClipboardList size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Raise Purchase Indent</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Internal requisition for raw materials and stock items (pricing is determined when converted to a PO).
              </p>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm shrink-0 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="indent-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* HEADER PARAMETERS CARD */}
          <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3.5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-2">
              <span>📋</span> Indent Header Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="indent-factory" className="text-xs font-medium">
                  Factory / Plant <span className="text-destructive">*</span>
                </Label>
                <select
                  id="indent-factory"
                  value={form.factoryId}
                  onChange={(e) => setForm({ ...form, factoryId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="" disabled>Select factory</option>
                  {(factoryData?.rows || []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="indent-date" className="text-xs font-medium">
                  Indent Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="indent-date"
                  type="date"
                  value={form.indentDate}
                  onChange={(e) => setForm({ ...form, indentDate: e.target.value })}
                  className="h-9 text-sm font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="indent-required-by" className="text-xs font-medium">
                  Required By Date <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="indent-required-by"
                  type="date"
                  value={form.requiredByDate}
                  onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })}
                  className="h-9 text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="indent-remarks" className="text-xs font-medium">
                Remarks / Purpose <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="indent-remarks"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Why this requisition is needed (e.g., Raw material replenishment for upcoming production schedule)"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* LINES SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <span>📦</span> Requisition Line Items
                </Label>
                <p className="text-xs text-muted-foreground">
                  Specify products and required quantities needed for the factory.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-8 gap-1.5 text-xs font-medium">
                <Plus size={14} /> Add Line
              </Button>
            </div>

            {/* Table Container */}
            <div className="border border-border rounded-xl overflow-hidden bg-card/40 shadow-sm">
              <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                  {/* Table Column Headers */}
                  <div className="grid grid-cols-[44px_1fr_110px_160px_44px] gap-3 px-4 py-2.5 bg-muted/60 border-b border-border text-xs font-semibold text-muted-foreground items-center">
                    <div className="text-center">#</div>
                    <div>Product / Material <span className="text-destructive">*</span></div>
                    <div className="text-center">UoM</div>
                    <div className="text-right">Required Qty <span className="text-destructive">*</span></div>
                    <div className="text-center"></div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border/60">
                    {lines.map((line, i) => {
                      const prod = productMap.get(line.productId);
                      const uomCode = prod?.uom?.code || prod?.uomCode || '—';

                      return (
                        <div key={i} className="p-2.5 px-4 hover:bg-muted/20 transition-colors">
                          <div className="grid grid-cols-[44px_1fr_110px_160px_44px] gap-3 items-center">
                            {/* Row index */}
                            <div className="text-center text-xs font-mono font-medium text-muted-foreground">
                              {i + 1}
                            </div>

                            {/* Product Select */}
                            <div>
                              <select
                                value={line.productId}
                                onChange={(e) => updateLine(i, 'productId', e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs sm:text-sm font-medium focus:ring-1 focus:ring-primary truncate"
                                required
                              >
                                <option value="" disabled>Select product or raw material...</option>
                                {(productData?.rows || []).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code ? `[${p.code}] ` : ''}{p.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* UoM Pill */}
                            <div className="text-center">
                              <span className={cn(
                                "inline-flex items-center justify-center px-2 py-1 rounded text-xs font-mono border border-border/60 w-full truncate",
                                prod ? "bg-muted/80 text-foreground font-medium" : "bg-muted/30 text-muted-foreground"
                              )}>
                                {uomCode}
                              </span>
                            </div>

                            {/* Required Qty */}
                            <div>
                              <Input
                                type="number"
                                step="any"
                                min="0.0001"
                                placeholder="Qty"
                                value={line.quantity}
                                onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                                className="h-9 text-right font-mono text-sm"
                                required
                              />
                            </div>

                            {/* Delete Action */}
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLine(i)}
                                disabled={lines.length === 1}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/30 shadow-sm items-center">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground block">Line Items Count</span>
              <span className="text-sm font-bold tabular-nums">
                {lines.length} {lines.length === 1 ? 'line' : 'lines'} {filledLinesCount > 0 && `(${filledLinesCount} completed)`}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-[11px] font-medium text-muted-foreground block">
                {uomEntries.length <= 1 ? 'Total Requisition Quantity' : 'Requisition Quantity by UoM'}
              </span>
              {uomEntries.length === 0 ? (
                <span className="text-sm font-bold tabular-nums text-muted-foreground">—</span>
              ) : uomEntries.length === 1 ? (
                <span className="text-sm font-bold tabular-nums text-primary font-mono">
                  {uomEntries[0][1].toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                  <span className="ml-1 text-xs font-sans text-foreground/80 font-normal">
                    {formatUom(uomEntries[0][0], uomEntries[0][1])}
                  </span>
                </span>
              ) : (
                <div className="flex flex-wrap items-center sm:justify-end gap-1.5 pt-1">
                  {uomEntries.map(([uom, qty]) => (
                    <span
                      key={uom}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold border border-primary/20"
                    >
                      {qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                      <span className="ml-1 text-[11px] font-sans text-foreground/80 font-normal">
                        {formatUom(uom, qty)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-background/95 backdrop-blur shrink-0 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            <span>Approved indents can be converted into purchase orders directly.</span>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="indent-form"
              disabled={createMutation.isPending}
              className="font-semibold px-5"
            >
              {createMutation.isPending ? 'Raising Indent...' : 'Raise Indent'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

