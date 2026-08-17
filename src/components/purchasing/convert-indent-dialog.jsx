import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toPaise } from '@/lib/money';
import { useConvertIndent } from '@/hooks/use-indents';
import { useParties } from '@/hooks/use-parties';
import { PartyType } from '@/constants/enums';

/** Converts an approved indent into a PO, capturing the rate for every line. */
export function ConvertIndentDialog({ open, onOpenChange, indent }) {
  const [vendorPartyId, setVendorPartyId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [rates, setRates] = useState({});
  const [error, setError] = useState('');

  const { data: vendorData } = useParties({ page: 1, limit: 100, partyType: PartyType.VENDOR });
  const convert = useConvertIndent();

  useEffect(() => {
    if (open) {
      setVendorPartyId('');
      setOrderDate(new Date().toISOString().slice(0, 10));
      setRates({});
      setError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const missing = (indent?.lines || []).filter((l) => !rates[l.productId]);
    if (missing.length) {
      setError('Enter a rate for every line — the purchase order can’t be priced without them.');
      return;
    }

    convert
      .mutateAsync({
        id: indent.id,
        vendorPartyId,
        orderDate,
        lineRates: indent.lines.map((l) => ({ productId: l.productId, ratePaise: toPaise(rates[l.productId]) })),
      })
      .then(() => onOpenChange(false))
      .catch((err) => setError(err.response?.data?.message || 'Failed to convert the indent.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Convert {indent?.indentNumber} to a Purchase Order</DialogTitle></DialogHeader>
        {error && <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <select value={vendorPartyId} onChange={(e) => setVendorPartyId(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm" required>
                <option value="" disabled>Select vendor</option>
                {(vendorData?.rows || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rates</Label>
            {(indent?.lines || []).map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_100px_140px] gap-2 items-center text-sm">
                <span>{line.product?.name}</span>
                <span className="text-muted-foreground tabular-nums">{Number(line.quantity)}</span>
                <Input
                  type="number" step="0.01" min="0" placeholder="Rate (₹)"
                  value={rates[line.productId] ?? ''}
                  onChange={(e) => setRates({ ...rates, [line.productId]: e.target.value })}
                  required
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={convert.isPending}>{convert.isPending ? 'Converting...' : 'Create Purchase Order'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
