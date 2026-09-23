import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountGroups, useCreateAccount, useUpdateAccount } from '@/hooks/use-ledger';
import { useFactories } from '@/hooks/use-factory';
import { toPaise } from '@/lib/money';
import { today } from '@/lib/date-format';
import { toast } from 'sonner';

const SELECT = 'w-full h-9 px-3 rounded-md border border-input bg-background text-sm';

/** Mirrors the backend's MONEY_ACCOUNT_GROUPS: where a bank or cash account may sit. */
const MONEY_GROUPS = {
  BANK: ['CURRENT_ASSET', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY'],
  CASH: ['CURRENT_ASSET'],
};

const TYPE_ORDER = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
const TYPE_LABEL = { ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Capital', INCOME: 'Income', EXPENSE: 'Expenses' };

const blank = (preset = {}) => ({
  code: '', name: '', accountGroup: preset.accountGroup || '', subType: preset.subType || '',
  description: '', bankName: '', accountNumber: '', ifsc: '', branch: '',
  withOpening: false, openingFactoryId: '', openingDate: today(), openingRupees: '', openingSide: '',
});

/**
 * Create or edit an account. `preset` pre-selects a group and kind — the
 * "Add bank account" button opens this with { accountGroup: CURRENT_ASSET,
 * subType: BANK } so the person only types names and numbers.
 */
export function AccountFormDialog({ open, onOpenChange, account = null, preset = null }) {
  const editing = !!account;
  const system = !!account?.isSystem;
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');

  const { data: groups = [] } = useAccountGroups();
  const { data: factoryData } = useFactories({ page: 1, limit: 100 });
  const create = useCreateAccount();
  const update = useUpdateAccount();

  useEffect(() => {
    if (!open) return;
    setError('');
    if (account) {
      setForm({
        ...blank(),
        code: account.code, name: account.name, accountGroup: account.accountGroup || '', subType: account.subType || '',
        description: account.description || '', bankName: account.bankName || '', accountNumber: account.accountNumber || '',
        ifsc: account.ifsc || '', branch: account.branch || '',
      });
    } else {
      setForm(blank(preset || {}));
    }
  }, [open, account, preset]);

  const factories = factoryData?.rows || [];
  useEffect(() => {
    if (open && form.withOpening && !form.openingFactoryId && factories.length === 1) {
      setForm((f) => ({ ...f, openingFactoryId: factories[0].id }));
    }
  }, [open, form.withOpening, form.openingFactoryId, factories]);

  const groupedOptions = useMemo(
    () => TYPE_ORDER.map((type) => ({ type, groups: groups.filter((g) => g.type === type) })).filter((g) => g.groups.length),
    [groups]
  );

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // A kind that the chosen group cannot hold is dropped rather than submitted
  // for the server to refuse.
  const kindAllowed = (kind) => !kind || (MONEY_GROUPS[kind] || []).includes(form.accountGroup);
  const onGroupChange = (accountGroup) => {
    const next = { accountGroup };
    if (form.subType && !(MONEY_GROUPS[form.subType] || []).includes(accountGroup)) next.subType = '';
    set(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const details = {
      description: form.description || null,
      ...(form.subType === 'BANK'
        ? { bankName: form.bankName || null, accountNumber: form.accountNumber || null, ifsc: form.ifsc || null, branch: form.branch || null }
        : {}),
    };

    try {
      if (editing) {
        const payload = system ? details : { name: form.name, accountGroup: form.accountGroup, subType: form.subType || null, ...details };
        await update.mutateAsync({ id: account.id, ...payload });
        toast.success('Account updated');
      } else {
        const payload = {
          code: form.code, name: form.name, accountGroup: form.accountGroup, subType: form.subType || null, ...details,
          ...(form.withOpening && toPaise(form.openingRupees) > 0
            ? {
                openingBalance: {
                  factoryId: form.openingFactoryId,
                  asOfDate: form.openingDate,
                  amountPaise: toPaise(form.openingRupees),
                  ...(form.openingSide ? { side: form.openingSide } : {}),
                },
              }
            : {}),
        };
        await create.mutateAsync(payload);
        toast.success(`${form.name} added`);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the account.');
    }
  };

  const pending = create.isPending || update.isPending;
  const title = editing ? `Edit ${account.name}` : form.subType === 'BANK' ? 'Add Bank Account' : form.subType === 'CASH' ? 'Add Cash Account' : 'Add Account';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {system && (
            <DialogDescription>
              This is a system account the sales, purchase and payment screens post to. Its name and group are fixed; you can fill in the bank details.
            </DialogDescription>
          )}
        </DialogHeader>
        {error && <div role="alert" className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-code">Code</Label>
              <Input id="acc-code" value={form.code} onChange={(e) => set({ code: e.target.value })} disabled={editing} placeholder="e.g. 1011" required />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="acc-name">Name</Label>
              <Input id="acc-name" value={form.name} onChange={(e) => set({ name: e.target.value })} disabled={system} placeholder="e.g. HDFC Current A/c" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="acc-group">Group</Label>
              <select id="acc-group" className={SELECT} value={form.accountGroup} onChange={(e) => onGroupChange(e.target.value)} disabled={system} required>
                <option value="" disabled>Select where it belongs</option>
                {groupedOptions.map(({ type, groups: gs }) => (
                  <optgroup key={type} label={TYPE_LABEL[type]}>
                    {gs.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-kind">Money account</Label>
              <select id="acc-kind" className={SELECT} value={form.subType} onChange={(e) => set({ subType: e.target.value })} disabled={system}>
                <option value="">No</option>
                <option value="BANK" disabled={!kindAllowed('BANK')}>Bank</option>
                <option value="CASH" disabled={!kindAllowed('CASH')}>Cash</option>
              </select>
            </div>
          </div>

          {form.subType === 'BANK' && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-bank">Bank</Label>
                <Input id="acc-bank" value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} placeholder="HDFC Bank" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-number">Account number</Label>
                <Input id="acc-number" value={form.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-ifsc">IFSC</Label>
                <Input id="acc-ifsc" value={form.ifsc} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} maxLength={11} placeholder="HDFC0001234" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-branch">Branch</Label>
                <Input id="acc-branch" value={form.branch} onChange={(e) => set({ branch: e.target.value })} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="acc-desc">Description (optional)</Label>
            <Input id="acc-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>

          {!editing && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.withOpening} onChange={(e) => set({ withOpening: e.target.checked })} />
                It already has a balance
              </label>
              {form.withOpening && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-ob-factory">Factory</Label>
                    <select id="acc-ob-factory" className={SELECT} value={form.openingFactoryId} onChange={(e) => set({ openingFactoryId: e.target.value })} required>
                      <option value="" disabled>Select factory</option>
                      {factories.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-ob-date">As of</Label>
                    <Input id="acc-ob-date" type="date" value={form.openingDate} onChange={(e) => set({ openingDate: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-ob-amount">Balance (₹)</Label>
                    <Input id="acc-ob-amount" type="number" step="0.01" min="0" value={form.openingRupees} onChange={(e) => set({ openingRupees: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-ob-side">Side</Label>
                    <select id="acc-ob-side" className={SELECT} value={form.openingSide} onChange={(e) => set({ openingSide: e.target.value })}>
                      <option value="">Usual for this group</option>
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit (e.g. overdrawn)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save' : 'Add account'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
