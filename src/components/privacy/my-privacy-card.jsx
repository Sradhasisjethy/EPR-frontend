import { useState } from 'react';
import { toast } from 'sonner';
import { Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DateText } from '@/components/date-text';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui-store';
import {
  useMyPrivacy, useGiveMyConsent, useWithdrawMyConsent, useMyRequest, useSetMyNominee, downloadMyData,
} from '@/hooks/use-privacy';
import { NoticeView } from './notice-view';
import { REQUEST_TYPES, REQUEST_STATUS, TEXTAREA, SELECT } from './privacy-labels';

const SELF_REQUEST_TYPES = ['CORRECTION', 'ERASURE', 'GRIEVANCE', 'ACCESS'];

/**
 * A staff member's own rights under the DPDP Act, on My Profile: read the
 * notice, switch optional consents, download their data, make a request and
 * name a nominee. No permission is needed for any of it.
 */
export function MyPrivacyCard() {
  const { glassMode } = useUIStore();
  const { data, isLoading } = useMyPrivacy();
  const give = useGiveMyConsent();
  const withdraw = useWithdrawMyConsent();
  const submit = useMyRequest();
  const setNominee = useSetMyNominee();

  const [showNotice, setShowNotice] = useState(false);
  const [request, setRequest] = useState({ type: 'CORRECTION', details: '' });
  const [nominee, setNomineeForm] = useState(null);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !data) return null;

  const notice = data.notice;
  const optional = (notice?.purposes || []).filter((p) => p.lawfulBasis === 'CONSENT' && (p.principalTypes || []).includes('USER'));
  const live = Object.fromEntries((data.consents || []).filter((c) => c.status === 'GRANTED').map((c) => [c.purposeCode, c]));
  const fail = (err, fallback) => toast.error(err.response?.data?.message || fallback);

  const toggle = async (purpose, on) => {
    try {
      if (on) await give.mutateAsync(purpose.code);
      else await withdraw.mutateAsync({ id: live[purpose.code].id });
      toast.success(on ? 'Consent given' : 'Consent withdrawn');
    } catch (err) {
      fail(err, 'Could not change that.');
    }
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    try {
      const created = await submit.mutateAsync(request);
      toast.success(`Request ${created.requestNumber} sent. You will hear back by ${created.dueDate}.`);
      setRequest({ type: 'CORRECTION', details: '' });
    } catch (err) {
      fail(err, 'Could not send the request.');
    }
  };

  const saveNominee = async (e) => {
    e.preventDefault();
    try {
      await setNominee.mutateAsync(nominee);
      toast.success('Nominee saved');
      setNomineeForm(null);
    } catch (err) {
      fail(err, 'Could not save the nominee.');
    }
  };

  const doDownload = async () => {
    setDownloading(true);
    try {
      await downloadMyData();
    } catch (err) {
      fail(err, 'Could not prepare the download.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn('rounded-xl border border-border p-6 space-y-6', glassMode ? 'glass-card' : 'bg-card')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" />
          <div>
            <h2 className="text-lg font-semibold">My privacy</h2>
            <p className="text-sm text-muted-foreground">Your rights under the Digital Personal Data Protection Act, 2023.</p>
          </div>
        </div>
        <Button variant="outline" onClick={doDownload} disabled={downloading}>
          <Download size={16} /> {downloading ? 'Preparing…' : 'Download my data'}
        </Button>
      </div>

      {notice ? (
        <div className="text-sm">
          <p>
            Privacy notice version {notice.version}
            {data.acknowledgement && <span className="text-muted-foreground"> · read on <DateText value={data.acknowledgement.acknowledgedAt} /></span>}
          </p>
          <button type="button" className="text-primary hover:underline" onClick={() => setShowNotice((v) => !v)}>
            {showNotice ? 'Hide the notice' : 'Read the notice'}
          </button>
          {showNotice && (
            <div className="mt-3">
              <NoticeView
                notice={notice}
                principalType="USER"
                contact={{ name: data.profile?.contactName, email: data.profile?.contactEmail, phone: data.profile?.contactPhone }}
                responseDays={data.profile?.responseDays}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Your organisation has not published a privacy notice yet.</p>
      )}

      {optional.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Optional uses of your data</p>
          {optional.map((p) => (
            <div key={p.code} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
              <Switch
                checked={Boolean(live[p.code])}
                onCheckedChange={(on) => toggle(p, on)}
                disabled={give.isPending || withdraw.isPending}
                aria-label={p.label}
              />
            </div>
          ))}
        </div>
      )}

      <form onSubmit={sendRequest} className="space-y-2">
        <p className="text-sm font-medium">Make a request</p>
        <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
          <select aria-label="Request type" className={SELECT} value={request.type} onChange={(e) => setRequest({ ...request, type: e.target.value })}>
            {SELF_REQUEST_TYPES.map((t) => <option key={t} value={t}>{REQUEST_TYPES[t].label}</option>)}
          </select>
          <p className="self-center text-xs text-muted-foreground">{REQUEST_TYPES[request.type].help}</p>
        </div>
        <textarea
          aria-label="Details"
          className={TEXTAREA}
          maxLength={4000}
          placeholder="What would you like us to do?"
          value={request.details}
          onChange={(e) => setRequest({ ...request, details: e.target.value })}
        />
        <Button type="submit" disabled={submit.isPending}>Send request</Button>
      </form>

      {data.requests?.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Your requests</p>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {data.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>{r.requestNumber} · {REQUEST_TYPES[r.type]?.officer}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  due <DateText value={r.dueDate} />
                  <span className={cn('rounded-full px-2 py-0.5', REQUEST_STATUS[r.status]?.className)}>{REQUEST_STATUS[r.status]?.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Nominee</p>
        <p className="text-xs text-muted-foreground">Someone who may exercise these rights for you if you die or cannot act yourself (s.14).</p>
        {nominee ? (
          <form onSubmit={saveNominee} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="nominee-name">Name</Label>
              <Input id="nominee-name" required maxLength={160} value={nominee.nomineeName} onChange={(e) => setNomineeForm({ ...nominee, nomineeName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nominee-relation">Relationship</Label>
              <Input id="nominee-relation" maxLength={60} value={nominee.relationship} onChange={(e) => setNomineeForm({ ...nominee, relationship: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nominee-email">Email</Label>
              <Input id="nominee-email" type="email" maxLength={160} value={nominee.nomineeEmail} onChange={(e) => setNomineeForm({ ...nominee, nomineeEmail: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nominee-phone">Phone</Label>
              <Input id="nominee-phone" maxLength={20} value={nominee.nomineePhone} onChange={(e) => setNomineeForm({ ...nominee, nomineePhone: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={setNominee.isPending}>Save nominee</Button>
              <Button type="button" variant="outline" onClick={() => setNomineeForm(null)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>{data.nominee ? `${data.nominee.nomineeName}${data.nominee.relationship ? ` (${data.nominee.relationship})` : ''}` : 'No nominee named'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNomineeForm({
                nomineeName: data.nominee?.nomineeName || '',
                relationship: data.nominee?.relationship || '',
                nomineeEmail: data.nominee?.nomineeEmail || '',
                nomineePhone: data.nominee?.nomineePhone || '',
              })}
            >
              {data.nominee ? 'Change' : 'Name a nominee'}
            </Button>
            {data.nominee && (
              <Button variant="ghost" size="sm" onClick={() => setNominee.mutateAsync(null).then(() => toast.success('Nominee removed'))}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
