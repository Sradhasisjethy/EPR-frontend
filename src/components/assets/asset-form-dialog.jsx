import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCreateFixedAsset } from '@/hooks/use-fixed-assets';
import { useFactories } from '@/hooks/use-factory';
import { MoneyAccountSelect } from '@/components/ledger/money-account-select';
import { formatINR, toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';

/** Common categories for a precast plant; any other text is accepted too. */
const CATEGORIES = ['Moulds', 'Plant & Machinery', 'Vehicles', 'Buildings', 'Furniture & Fixtures', 'Computers', 'Tools & Equipment'];

const blank = () => ({
  factoryId: '', name: '', category: 'Moulds', serialNumber: '', acquisitionType: 'PURCHASED',
  acquisitionDate: today(), putToUseDate: '', costRupees: '', salvageRupees: '', method: 'SLM',
  lifeYears: '', ratePercent: '', paymentMode: 'BANK', accountId: undefined, priorDepRupees: '',
});

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('px-3 py-1.5 text-sm rounded-md transition-colors', value === o.value ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AssetFormDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const create = useCreateFixedAsset();
  const factories = factoryData?.rows || [];

  useEffect(() => {
    if (open) { setForm(blank()); setError(''); }
  }, [open]);
  useEffect(() => {
    if (open && !form.factoryId && factories.length === 1) setForm((f) => ({ ...f, factoryId: factories[0].id }));
  }, [open, form.factoryId, factories]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const existing = form.acquisitionType === 'EXISTING';
  const cost = toPaise(form.costRupees);
  const salvage = toPaise(form.salvageRupees);

  // A rough first-year charge so the person can sanity-check the numbers
  // before posting. The server does the real, day-by-day calculation.
  const yearlyCharge = (() => {
    if (!cost) return null;
    if (form.method === 'SLM' && Number(form.lifeYears) > 0) return Math.round((cost - salvage) / Number(form.lifeYears));
    if (form.method === 'WDV' && Number(form.ratePercent) > 0) {
      return Math.round((cost - (existing ? toPaise(form.priorDepRupees) : 0)) * (Number(form.ratePercent) / 100));
    }
    return null;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      factoryId: form.factoryId,
      name: form.name,
      category: form.category,
      serialNumber: form.serialNumber || undefined,
      acquisitionType: form.acquisitionType,
      acquisitionDate: form.acquisitionDate,
      ...(form.putToUseDate ? { putToUseDate: form.putToUseDate } : {}),
      costPaise: cost,
      salvageValuePaise: salvage,
      method: form.method,
      ...(form.method === 'SLM' ? { usefulLifeMonths: Math.round(Number(form.lifeYears) * 12) } : { ratePercent: Number(form.ratePercent) }),
      ...(existing
        ? { openingAccumulatedPaise: toPaise(form.priorDepRupees) }
        : { payment: { mode: form.paymentMode, ...(form.accountId ? { accountId: form.accountId } : {}) } }),
    };
    try {
      const asset = await create.mutateAsync(payload);
      toast.success(`${asset.assetNumber} registered`);
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register the asset.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register Fixed Asset</DialogTitle>
          <DialogDescription>Moulds, machinery, vehicles — anything the plant uses for more than a year.</DialogDescription>
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Segmented
            label="How it came onto the books" value={form.acquisitionType} onChange={(v) => set({ acquisitionType: v })}
            options={[{ value: 'PURCHASED', label: 'Bought now' }, { value: 'EXISTING', label: 'Already owned (go-live)' }]}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="fa-name">Asset name</Label>
              <Input id="fa-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. RCC Pipe Mould 600mm" required />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="fa-category">Category</Label>
              <Input id="fa-category" list="fa-categories" value={form.category} onChange={(e) => set({ category: e.target.value })} required />
              <datalist id="fa-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-factory">Factory</Label>
              <select id="fa-factory" className={SELECT} value={form.factoryId} onChange={(e) => set({ factoryId: e.target.value })} required>
                <option value="" disabled>Select factory</option>
                {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-serial">Serial / registration no. (optional)</Label>
              <Input id="fa-serial" value={form.serialNumber} onChange={(e) => set({ serialNumber: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fa-date">{existing ? 'Go-live date' : 'Purchase date'}</Label>
              <Input id="fa-date" type="date" value={form.acquisitionDate} onChange={(e) => set({ acquisitionDate: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-use">In use from</Label>
              <Input id="fa-use" type="date" value={form.putToUseDate} min={form.acquisitionDate} onChange={(e) => set({ putToUseDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-cost">Cost (₹)</Label>
              <Input id="fa-cost" type="number" step="0.01" min="0" value={form.costRupees} onChange={(e) => set({ costRupees: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-salvage">Scrap value (₹)</Label>
              <Input id="fa-salvage" type="number" step="0.01" min="0" value={form.salvageRupees} onChange={(e) => set({ salvageRupees: e.target.value })} placeholder="0" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Depreciation</span>
              <Segmented
                label="Depreciation method" value={form.method} onChange={(v) => set({ method: v })}
                options={[{ value: 'SLM', label: 'Straight line' }, { value: 'WDV', label: 'Written-down value' }]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {form.method === 'SLM' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fa-life">Useful life (years)</Label>
                  <Input id="fa-life" type="number" step="0.5" min="0" value={form.lifeYears} onChange={(e) => set({ lifeYears: e.target.value })} required />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="fa-rate">Rate per year (%)</Label>
                  <Input id="fa-rate" type="number" step="0.01" min="0" max="100" value={form.ratePercent} onChange={(e) => set({ ratePercent: e.target.value })} required />
                </div>
              )}
              {existing && (
                <div className="space-y-1.5">
                  <Label htmlFor="fa-prior">Depreciation already charged (₹)</Label>
                  <Input id="fa-prior" type="number" step="0.01" min="0" value={form.priorDepRupees} onChange={(e) => set({ priorDepRupees: e.target.value })} placeholder="0" />
                </div>
              )}
            </div>
            {yearlyCharge !== null && (
              <p className="text-xs text-muted-foreground">About {formatINR(yearlyCharge)} a year{form.method === 'WDV' ? ' in the first year, less each year after' : ''}.</p>
            )}
          </div>

          {!existing && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Paid from</Label>
                <Segmented
                  label="Paid from" value={form.paymentMode} onChange={(v) => set({ paymentMode: v, accountId: undefined })}
                  options={[{ value: 'BANK', label: 'Bank' }, { value: 'CASH', label: 'Cash' }]}
                />
              </div>
              <MoneyAccountSelect mode={form.paymentMode} value={form.accountId} onChange={(v) => set({ accountId: v })} aria-label="Paid from account" className="w-56" />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Registering…' : 'Register asset'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
