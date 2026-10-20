import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Download } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateText } from '@/components/date-text';
import { usePaginated } from '@/hooks/use-paginated';
import { cn } from '@/lib/utils';
import {
  usePrivacyRequests, usePrivacyRequest, useCreatePrivacyRequest, useUpdatePrivacyRequest, usePrivacyRequestAction, downloadRequestData,
  usePrivacyOrganisations,
} from '@/hooks/use-privacy';
import { REQUEST_TYPES, REQUEST_STATUS, CHANNELS, PRINCIPAL_TYPES, SELECT, TEXTAREA, formatDateTime } from './privacy-labels';

const StatusPill = ({ status }) => (
  <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', REQUEST_STATUS[status]?.className)}>
    {REQUEST_STATUS[status]?.label || status}
  </span>
);

const EMPTY = { type: 'ACCESS', channel: 'EMAIL', requesterName: '', requesterEmail: '', requesterPhone: '', requesterRelation: 'SELF', details: '', tenantId: '', principalType: '', principalId: '' };

/** Data principal requests: the queue, a form for ones that arrive by email or post, and the detail. */
export function PrivacyRequestsTab() {
  const canCreate = true; // only the application owner reaches this desk
  const [filter, setFilter] = useState('open');
  const [tenantId, setTenantId] = useState('');
  const { data: organisations = [] } = usePrivacyOrganisations();
  const [creating, setCreating] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const filters = {
    ...(filter === 'open' ? { openOnly: 'true' } : filter === 'overdue' ? { overdueOnly: 'true' } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
  const { tableProps } = usePaginated(usePrivacyRequests, filters);
  const create = useCreatePrivacyRequest();

  const save = async (e) => {
    e.preventDefault();
    const body = { ...creating };
    if (!body.principalType || !body.principalId) { delete body.principalType; delete body.principalId; }
    if (!body.tenantId) delete body.tenantId;
    try {
      const created = await create.mutateAsync(body);
      toast.success(`Recorded as ${created.requestNumber}`);
      setCreating(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record the request.');
    }
  };

  return (
    <div className="space-y-4">
      {(
        <DataTable
          columns={[
            {
              id: 'number', header: 'Request',
              cell: ({ row }) => (
                <button className="text-primary hover:underline text-left" onClick={() => setViewingId(row.original.id)}>
                  {row.original.requestNumber}
                  <span className="block text-xs text-muted-foreground">{REQUEST_TYPES[row.original.type]?.officer}</span>
                </button>
              ),
            },
            { id: 'who', header: 'From', cell: ({ row }) => row.original.requesterName },
            {
              id: 'organisation', header: 'Organisation',
              cell: ({ row }) => row.original.organisationName
                || <span className="text-amber-600">{row.original.requesterOrganisation ? `"${row.original.requesterOrganisation}" — not matched` : 'Not matched yet'}</span>,
            },
            { id: 'channel', header: 'Came in by', cell: ({ row }) => CHANNELS[row.original.channel] },
            {
              id: 'due', header: 'Due',
              cell: ({ row }) => (
                <span className={cn(row.original.isOverdue && 'font-medium text-rose-600')}>
                  <DateText value={row.original.dueDate} />{row.original.isOverdue ? ' · overdue' : ''}
                </span>
              ),
            },
            { id: 'assignee', header: 'With', cell: ({ row }) => row.original.assigneeName || '—' },
            { id: 'status', header: 'Status', cell: ({ row }) => <StatusPill status={row.original.status} /> },
          ]}
          {...tableProps}
          searchPlaceholder="Search number, name, email, phone…"
          actionsNode={
            <div className="flex items-center gap-2">
              <select aria-label="Organisation" className={SELECT} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">All organisations</option>
                {organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select aria-label="Show" className={SELECT} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
                <option value="all">All</option>
              </select>
              {canCreate && <Button onClick={() => setCreating(EMPTY)}><Plus size={16} /> Record request</Button>}
            </div>
          }
        />
      )}

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record a request</DialogTitle>
            <DialogDescription>For a request that came by email, letter or phone. Requests from the public form and from staff arrive here by themselves.</DialogDescription>
          </DialogHeader>
          {creating && (
            <form onSubmit={save} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="r-type">Type</Label>
                  <select id="r-type" className={cn(SELECT, 'w-full')} value={creating.type} onChange={(e) => setCreating({ ...creating, type: e.target.value })}>
                    {Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.officer}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-channel">Came in by</Label>
                  <select id="r-channel" className={cn(SELECT, 'w-full')} value={creating.channel} onChange={(e) => setCreating({ ...creating, channel: e.target.value })}>
                    {['EMAIL', 'WRITTEN', 'PHONE'].map((k) => <option key={k} value={k}>{CHANNELS[k]}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-name">Name</Label>
                  <Input id="r-name" required maxLength={160} value={creating.requesterName} onChange={(e) => setCreating({ ...creating, requesterName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-relation">Acting as</Label>
                  <select id="r-relation" className={cn(SELECT, 'w-full')} value={creating.requesterRelation} onChange={(e) => setCreating({ ...creating, requesterRelation: e.target.value })}>
                    <option value="SELF">The person themselves</option>
                    <option value="NOMINEE">Their nominee</option>
                    <option value="GUARDIAN">Parent or guardian</option>
                    <option value="AUTHORISED">Someone they authorised</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-email">Email</Label>
                  <Input id="r-email" type="email" maxLength={160} value={creating.requesterEmail} onChange={(e) => setCreating({ ...creating, requesterEmail: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="r-phone">Phone</Label>
                  <Input id="r-phone" maxLength={20} value={creating.requesterPhone} onChange={(e) => setCreating({ ...creating, requesterPhone: e.target.value })} />
                </div>
              </div>
              <PrincipalPicker value={creating} onChange={(v) => setCreating({ ...creating, ...v })} />
              <div className="space-y-1">
                <Label htmlFor="r-details">What they asked</Label>
                <textarea id="r-details" className={TEXTAREA} maxLength={4000} value={creating.details} onChange={(e) => setCreating({ ...creating, details: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreating(null)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending}>Record</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <RequestDetailDialog id={viewingId} onOpenChange={(o) => !o && setViewingId(null)} />
    </div>
  );
}

/**
 * Which record the request is about. An id pasted from the record's own page:
 * a search across staff, parties and leads would show this desk everyone's
 * details at once, which is the opposite of the point.
 */
function PrincipalPicker({ value, onChange }) {
  const { data: organisations = [] } = usePrivacyOrganisations();
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_12rem_1fr]">
      <div className="space-y-1">
        <Label htmlFor="p-org">Organisation</Label>
        <select id="p-org" className={cn(SELECT, 'w-full')} value={value.tenantId || ''} onChange={(e) => onChange({ tenantId: e.target.value, principalId: '' })}>
          <option value="">Not known yet</option>
          {organisations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-type">Record type</Label>
        <select id="p-type" className={cn(SELECT, 'w-full')} disabled={!value.tenantId} value={value.principalType || ''} onChange={(e) => onChange({ principalType: e.target.value })}>
          <option value="">Not linked yet</option>
          {['USER', 'PARTY', 'LEAD'].map((k) => <option key={k} value={k}>{PRINCIPAL_TYPES[k]}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-id">Record id</Label>
        <Input
          id="p-id"
          placeholder="Copy it from the person's record (the id in its address)"
          disabled={!value.principalType}
          value={value.principalId || ''}
          onChange={(e) => onChange({ principalId: e.target.value.trim() })}
        />
      </div>
    </div>
  );
}

function RequestDetailDialog({ id, onOpenChange }) {
  const canModify = true; // only the application owner reaches this desk
  const canExport = true; // only the application owner reaches this desk
  const canErase = true; // only the application owner reaches this desk
  const { data: request } = usePrivacyRequest(id);
  const update = useUpdatePrivacyRequest();
  const action = usePrivacyRequestAction();

  const [link, setLink] = useState(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [nominee, setNominee] = useState({ nomineeName: '', relationship: '' });
  const [confirmErase, setConfirmErase] = useState(false);

  const run = async (fn, ok) => {
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(err.response?.data?.message || 'That did not work.');
    }
  };

  const complete = () => run(() => action.mutateAsync({
    id, action: 'complete', resolution: resolution || undefined,
    ...(request.type === 'NOMINATION' ? { nominee } : {}),
  }), 'Request completed');

  const open = request && ['RECEIVED', 'VERIFYING', 'IN_PROGRESS'].includes(request.status);

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {!request ? (
          <div className="h-40 animate-pulse" />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{request.requestNumber} · {REQUEST_TYPES[request.type]?.officer}</DialogTitle>
              <DialogDescription>{REQUEST_TYPES[request.type]?.help}</DialogDescription>
            </DialogHeader>

            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Status</dt><dd><StatusPill status={request.status} /></dd>
              <dt className="text-muted-foreground">From</dt>
              <dd>{request.requesterName} ({request.requesterRelation.toLowerCase()}) {[request.requesterEmail, request.requesterPhone].filter(Boolean).join(' · ')}</dd>
              <dt className="text-muted-foreground">Received</dt><dd>{formatDateTime(request.receivedAt)} by {CHANNELS[request.channel]}</dd>
              <dt className="text-muted-foreground">Due</dt><dd className={cn(request.isOverdue && 'text-rose-600 font-medium')}><DateText value={request.dueDate} /></dd>
              <dt className="text-muted-foreground">Organisation</dt>
              <dd>{request.organisationName || (request.requesterOrganisation ? `Not matched — they said "${request.requesterOrganisation}"` : 'Not matched yet')}</dd>
              <dt className="text-muted-foreground">About</dt>
              <dd>{request.principalType ? `${PRINCIPAL_TYPES[request.principalType]} ${request.principalId}` : 'Not linked to a record yet'}</dd>
              <dt className="text-muted-foreground">Identity</dt>
              <dd>{request.identityVerifiedAt ? `Verified ${formatDateTime(request.identityVerifiedAt)}${request.verificationNote ? ` — ${request.verificationNote}` : ''}` : 'Not verified'}</dd>
            </dl>
            {request.details && <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{request.details}</p>}
            {request.resolution && <p className="text-sm"><span className="text-muted-foreground">Resolution: </span>{request.resolution}</p>}
            {request.outcome?.fieldsErased && (
              <div className="rounded-md border border-border p-3 text-xs">
                <p>Erased: {request.outcome.fieldsErased.join(', ')}</p>
                <p className="text-muted-foreground">Kept: {request.outcome.retained}</p>
              </div>
            )}

            {open && canModify && (
              <div className="space-y-4 border-t border-border pt-4">
                {!request.principalId && (
                  link ? (
                    <div className="space-y-2">
                      <PrincipalPicker value={link} onChange={(v) => setLink({ ...link, ...v })} />
                      <Button size="sm" disabled={!link.tenantId || !link.principalId} onClick={() => run(() => update.mutateAsync({ id, ...link }).then(() => setLink(null)), 'Linked')}>Link</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setLink({ tenantId: request.tenantId || '', principalType: 'PARTY', principalId: '' })}>Link to the person's record</Button>
                  )
                )}

                {!request.identityVerifiedAt && (
                  <div className="space-y-2">
                    <Label htmlFor="v-note">How identity was checked</Label>
                    <Input id="v-note" placeholder="e.g. called back on the phone number we hold; saw Aadhaar in person" value={note} onChange={(e) => setNote(e.target.value)} />
                    <Button size="sm" disabled={note.trim().length < 3} onClick={() => run(() => action.mutateAsync({ id, action: 'verify', note }), 'Identity verified')}>
                      Mark verified
                    </Button>
                  </div>
                )}

                {request.type === 'ACCESS' && canExport && request.identityVerifiedAt && request.principalId && (
                  <Button size="sm" variant="outline" onClick={() => run(() => downloadRequestData(request), 'Downloaded')}>
                    <Download size={14} /> Download their data
                  </Button>
                )}

                {request.type === 'NOMINATION' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Nominee name" value={nominee.nomineeName} onChange={(e) => setNominee({ ...nominee, nomineeName: e.target.value })} />
                    <Input placeholder="Relationship" value={nominee.relationship} onChange={(e) => setNominee({ ...nominee, relationship: e.target.value })} />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="resolution">What was done</Label>
                  <textarea id="resolution" className={TEXTAREA} maxLength={4000} value={resolution} onChange={(e) => setResolution(e.target.value)} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {request.type === 'ERASURE' ? (
                    <Button variant="destructive" disabled={!canErase} onClick={() => setConfirmErase(true)}>
                      Erase and complete
                    </Button>
                  ) : (
                    <Button onClick={complete}>Complete</Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={resolution.trim().length < 3}
                    onClick={() => run(() => action.mutateAsync({ id, action: 'reject', reason: resolution }), 'Request rejected')}
                  >
                    Reject (give the reason above)
                  </Button>
                </div>
              </div>
            )}

            <ConfirmDialog
              open={confirmErase}
              onOpenChange={setConfirmErase}
              title="Erase this person's details?"
              description="Their contact details, identity numbers, bank details, documents and address are wiped, here and in the audit trail. Records the law requires us to keep (invoices, wages) keep only the name. This cannot be undone."
              confirmText="Erase"
              variant="destructive"
              onConfirm={complete}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
