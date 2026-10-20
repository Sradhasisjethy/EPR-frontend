import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { cn } from '@/lib/utils';
import { useConsents, useRecordConsent, useWithdrawConsent, useMyPrivacy, usePrivacyOrganisations } from '@/hooks/use-privacy';
import { CONSENT_METHODS, PRINCIPAL_TYPES, SELECT, TEXTAREA } from './privacy-labels';

/**
 * The consent register: every consent given and withdrawn, and a form for
 * consent given on paper or by phone by someone with no record in the system.
 * Consent for a lead or party is usually recorded from that record's own page.
 */
export function PrivacyConsentsTab() {
  const canCreate = true; // only the application owner reaches this desk
  const canWithdraw = true; // only the application owner reaches this desk
  const [status, setStatus] = useState('');
  const [tenantId, setTenantId] = useState('');
  const { data: organisations = [] } = usePrivacyOrganisations();
  const [form, setForm] = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);

  const { tableProps } = usePaginated(useConsents, { ...(status ? { status } : {}), ...(tenantId ? { tenantId } : {}) });
  const { data: mine } = useMyPrivacy();
  const record = useRecordConsent();
  const withdraw = useWithdrawConsent();
  const purposes = (mine?.notice?.purposes || []).filter((p) => p.lawfulBasis === 'CONSENT');
  const label = (code) => purposes.find((p) => p.code === code)?.label || code;

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form };
    if (!body.principalId) delete body.principalId;
    try {
      await record.mutateAsync(body);
      toast.success('Consent recorded');
      setForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record consent.');
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        columns={[
          { id: 'who', header: 'Person', cell: ({ row }) => row.original.principalName || '—' },
          { id: 'organisation', header: 'Organisation', cell: ({ row }) => row.original.organisationName || '—' },
          { id: 'type', header: 'Record', cell: ({ row }) => PRINCIPAL_TYPES[row.original.principalType] },
          { id: 'purpose', header: 'Purpose', cell: ({ row }) => label(row.original.purposeCode) },
          { id: 'how', header: 'How given', cell: ({ row }) => `${CONSENT_METHODS[row.original.method]}${row.original.isMinor ? ' · by guardian' : ''}` },
          { id: 'when', header: 'Given', cell: ({ row }) => <DateText value={row.original.grantedAt} /> },
          { id: 'notice', header: 'Notice', cell: ({ row }) => (row.original.noticeVersion ? `v${row.original.noticeVersion}` : '—') },
          {
            id: 'status', header: 'Status',
            cell: ({ row }) => (row.original.status === 'GRANTED' ? (
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">Given</span>
                {canWithdraw && <button className="text-xs text-primary hover:underline" onClick={() => setWithdrawing(row.original)}>Withdraw</button>}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Withdrawn <DateText value={row.original.withdrawnAt} /></span>
            )),
          },
        ]}
        {...tableProps}
        searchPlaceholder="Search name, contact, purpose…"
        actionsNode={
          <div className="flex items-center gap-2">
            <select aria-label="Organisation" className={SELECT} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              <option value="">All organisations</option>
              {organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select aria-label="Status" className={SELECT} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="GRANTED">Given</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
            {canCreate && purposes.length > 0 && (
              <Button onClick={() => setForm({ tenantId: tenantId || '', principalType: 'OTHER', principalName: '', principalContact: '', purposeCode: purposes[0].code, method: 'WRITTEN', evidence: '' })}>
                <Plus size={16} /> Record consent
              </Button>
            )}
          </div>
        }
      />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record consent</DialogTitle>
            <DialogDescription>For consent given on paper, by phone or by email by someone with no record in the system. Only purposes the published notice bases on consent can be recorded.</DialogDescription>
          </DialogHeader>
          {form && (
            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="c-org">Organisation they deal with</Label>
                  <select id="c-org" required className={cn(SELECT, 'w-full')} value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                    <option value="">Choose…</option>
                    {organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-ptype">Their record</Label>
                  <select id="c-ptype" className={cn(SELECT, 'w-full')} value={form.principalType} onChange={(e) => setForm({ ...form, principalType: e.target.value, principalId: '' })}>
                    {Object.entries(PRINCIPAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-pid">Record id</Label>
                  <Input
                    id="c-pid"
                    placeholder="From the address of their record"
                    disabled={form.principalType === 'OTHER'}
                    required={form.principalType !== 'OTHER'}
                    value={form.principalId || ''}
                    onChange={(e) => setForm({ ...form, principalId: e.target.value.trim() })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-name">Name</Label>
                  <Input id="c-name" required={form.principalType === 'OTHER'} maxLength={160} value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-contact">Phone or email</Label>
                  <Input id="c-contact" maxLength={160} value={form.principalContact} onChange={(e) => setForm({ ...form, principalContact: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-purpose">Purpose</Label>
                  <select id="c-purpose" className={cn(SELECT, 'w-full')} value={form.purposeCode} onChange={(e) => setForm({ ...form, purposeCode: e.target.value })}>
                    {purposes.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-method">How given</Label>
                  <select id="c-method" className={cn(SELECT, 'w-full')} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {Object.entries(CONSENT_METHODS).filter(([k]) => k !== 'IN_APP').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.isMinor} onChange={(e) => setForm({ ...form, isMinor: e.target.checked })} />
                This person is under 18 (consent comes from a parent or guardian)
              </label>
              {form.isMinor && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input aria-label="Guardian name" placeholder="Guardian name" required value={form.guardianName || ''} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
                  <Input aria-label="Relationship" placeholder="Relationship" value={form.guardianRelation || ''} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })} />
                  <Input aria-label="How verified" placeholder="How verified" required value={form.guardianVerification || ''} onChange={(e) => setForm({ ...form, guardianVerification: e.target.value })} />
                </div>
              )}
              <textarea aria-label="Evidence" className={TEXTAREA} maxLength={2000} placeholder="Evidence: form number, where it is filed…" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit" disabled={record.isPending}>Record</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={!!withdrawing}
        onOpenChange={(o) => !o && setWithdrawing(null)}
        title="Withdraw consent"
        description="Processing for this purpose stops from now."
        confirmText="Withdraw"
        required={false}
        onConfirm={async (reason) => {
          const result = await withdraw.mutateAsync({ id: withdrawing.id, reason });
          toast.success(result.erasureRequest ? `Withdrawn. Erasure request ${result.erasureRequest.requestNumber} opened.` : 'Consent withdrawn');
        }}
      />
    </div>
  );
}
