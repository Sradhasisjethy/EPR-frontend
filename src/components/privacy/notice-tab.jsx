import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import {
  usePrivacyProfile, useUpdatePrivacyProfile, usePrivacyNotices, useCreateNotice, useUpdateNotice, usePublishNotice, useDeleteNotice,
} from '@/hooks/use-privacy';
import { NoticeView } from './notice-view';
import { PRINCIPAL_TYPES, LAWFUL_BASIS, SELECT, TEXTAREA, formatDateTime } from './privacy-labels';

const fail = (err, fallback) => toast.error(err.response?.data?.message || fallback);

/** The privacy contact (s.8(9), Rule 9) and the versioned notice (s.5, Rule 3). */
export function PrivacyNoticeTab() {
  const canModify = true; // only the application owner reaches this desk
  return (
    <div className="space-y-6">
      <ContactForm canModify={canModify} />
      <Notices canModify={canModify} />
    </div>
  );
}

function ContactForm({ canModify }) {
  const { data: profile } = usePrivacyProfile();
  const save = useUpdatePrivacyProfile();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        contactName: profile.contactName || '', contactDesignation: profile.contactDesignation || '',
        contactEmail: profile.contactEmail || '', contactPhone: profile.contactPhone || '',
        postalAddress: profile.postalAddress || '', responseDays: profile.responseDays || 30,
        dataLocation: profile.dataLocation || '', isSignificantDataFiduciary: !!profile.isSignificantDataFiduciary,
      });
    }
  }, [profile]);

  if (!form) return null;
  const blankToNull = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save.mutateAsync(blankToNull({ ...form, responseDays: Number(form.responseDays) }));
      toast.success('Privacy contact saved');
    } catch (err) {
      fail(err, 'Could not save.');
    }
  };

  const input = (key, label, props = {}) => (
    <div className="space-y-1">
      <Label htmlFor={`p-${key}`}>{label}</Label>
      <Input id={`p-${key}`} disabled={!canModify} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium">Privacy contact</p>
        <p className="text-sm text-muted-foreground">Who people write to about their data, for every organisation using the application. Published on the notice and the public page.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {input('contactName', 'Name', { maxLength: 120 })}
        {input('contactDesignation', 'Designation', { maxLength: 120 })}
        {input('contactEmail', 'Email', { type: 'email', maxLength: 160 })}
        {input('contactPhone', 'Phone', { maxLength: 20 })}
        {input('responseDays', 'We answer within (days, at most 90)', { type: 'number', min: 1, max: 90 })}
        {input('dataLocation', 'Where the data is stored', { maxLength: 200, placeholder: 'e.g. AWS Mumbai (ap-south-1), India' })}
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-address">Postal address</Label>
        <textarea id="p-address" className={TEXTAREA} disabled={!canModify} maxLength={1000} value={form.postalAddress} onChange={(e) => setForm({ ...form, postalAddress: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={form.isSignificantDataFiduciary} disabled={!canModify} onCheckedChange={(v) => setForm({ ...form, isSignificantDataFiduciary: v })} />
        Notified by the Government as a Significant Data Fiduciary (needs a DPO based in India, audits and DPIAs, s.10)
      </label>
      {canModify && <Button type="submit" disabled={save.isPending}>Save contact</Button>}
    </form>
  );
}

function Notices({ canModify }) {
  const { data: notices = [] } = usePrivacyNotices();
  const create = useCreateNotice();
  const publish = usePublishNotice();
  const remove = useDeleteNotice();
  const [editingId, setEditingId] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [publishing, setPublishing] = useState(null);

  const draft = notices.find((n) => n.status === 'DRAFT');
  const editing = notices.find((n) => n.id === editingId);
  const preview = notices.find((n) => n.id === previewId);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">Privacy notice</p>
          <p className="text-sm text-muted-foreground">One notice for the whole application, shown on the login page and to every user of every organisation. A published version is never edited: changes go into a new version, and every user is asked to read it again.</p>
        </div>
        <div className="flex gap-2">
          <a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Public page <ExternalLink size={14} />
          </a>
          {canModify && !draft && (
            <Button size="sm" onClick={() => create.mutateAsync({}).then((n) => setEditingId(n.id)).catch((e) => fail(e, 'Could not start a draft.'))}>
              <Plus size={14} /> New version
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border text-sm">
        {notices.length === 0 && <li className="p-3 text-muted-foreground">No notice yet. Start one from the template.</li>}
        {notices.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              v{n.version} · {n.title}
              <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs',
                n.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600' : n.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground')}
              >
                {n.status === 'PUBLISHED' ? `In force since ${formatDateTime(n.publishedAt)}` : n.status.toLowerCase()}
              </span>
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPreviewId(previewId === n.id ? null : n.id)}>{previewId === n.id ? 'Hide' : 'Preview'}</Button>
              {n.status === 'DRAFT' && canModify && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(n.id)}>Edit</Button>
                  <Button size="sm" onClick={() => setPublishing(n)}>Publish</Button>
                  <Button size="sm" variant="ghost" aria-label="Delete draft" onClick={() => remove.mutateAsync(n.id).catch((e) => fail(e, 'Could not delete.'))}><Trash2 size={14} /></Button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {preview && <div className="rounded-lg border border-border p-4"><NoticeView notice={preview} /></div>}
      {editing && editing.status === 'DRAFT' && <NoticeEditor notice={editing} onDone={() => setEditingId(null)} />}

      <ConfirmDialog
        open={!!publishing}
        onOpenChange={(o) => !o && setPublishing(null)}
        title={`Publish version ${publishing?.version}?`}
        description="It replaces the notice in force, appears on the public page, and every user is asked to read it on their next visit. It cannot be edited afterwards."
        confirmText="Publish"
        onConfirm={() => publish.mutateAsync(publishing.id).then(() => toast.success('Published')).catch((e) => fail(e, 'Could not publish.'))}
      />
    </div>
  );
}

const blankPurpose = () => ({
  code: '', label: '', description: '', dataItemsText: '', principalTypes: ['PARTY'], lawfulBasis: 'CONSENT', legalReference: '', retention: '', optional: true,
});

function NoticeEditor({ notice, onDone }) {
  const update = useUpdateNotice();
  const [form, setForm] = useState(() => ({
    title: notice.title, language: notice.language, summary: notice.summary || '', body: notice.body || '',
    purposes: (notice.purposes || []).map(({ dataItems, ...p }) => ({ ...p, dataItemsText: (dataItems || []).join(', '), legalReference: p.legalReference || '', retention: p.retention || '' })),
    processors: (notice.processors || []).map((p) => ({ ...p, location: p.location || '' })),
  }));

  const setPurpose = (i, patch) => setForm({ ...form, purposes: form.purposes.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const setProcessor = (i, patch) => setForm({ ...form, processors: form.processors.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const save = async (e) => {
    e.preventDefault();
    try {
      const purposes = form.purposes.map(({ dataItemsText, ...p }) => ({ ...p, dataItems: dataItemsText.split(',').map((x) => x.trim()).filter(Boolean) }));
      await update.mutateAsync({ id: notice.id, ...form, purposes });
      toast.success('Draft saved');
      onDone();
    } catch (err) {
      fail(err, 'Could not save the draft.');
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-primary/30 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-1">
          <Label htmlFor="n-title">Title</Label>
          <Input id="n-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="n-lang">Language</Label>
          <Input id="n-lang" maxLength={40} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="n-summary">Summary, in plain words</Label>
        <textarea id="n-summary" className={TEXTAREA} maxLength={4000} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Purposes</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, purposes: [...form.purposes, blankPurpose()] })}><Plus size={14} /> Add purpose</Button>
        </div>
        {form.purposes.map((p, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <Input aria-label="Code" placeholder="CODE" required value={p.code} onChange={(e) => setPurpose(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })} />
              <Input aria-label="Label" placeholder="Short name" required value={p.label} onChange={(e) => setPurpose(i, { label: e.target.value })} />
              <Button type="button" size="sm" variant="ghost" aria-label="Remove purpose" onClick={() => setForm({ ...form, purposes: form.purposes.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
            </div>
            <textarea aria-label="Description" className={TEXTAREA} required placeholder="What the data is used for, in words the person understands" value={p.description} onChange={(e) => setPurpose(i, { description: e.target.value })} />
            <Input aria-label="Data used" placeholder="Data used, comma separated" required value={p.dataItemsText} onChange={(e) => setPurpose(i, { dataItemsText: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select aria-label="Basis" className={SELECT} value={p.lawfulBasis} onChange={(e) => setPurpose(i, { lawfulBasis: e.target.value })}>
                {Object.entries(LAWFUL_BASIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Input aria-label="Legal reference" placeholder="e.g. DPDP Act s.7(i)" value={p.legalReference} onChange={(e) => setPurpose(i, { legalReference: e.target.value })} />
              <Input aria-label="Kept for" placeholder="How long it is kept" value={p.retention} onChange={(e) => setPurpose(i, { retention: e.target.value })} />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {['USER', 'PARTY', 'LEAD'].map((t) => (
                  <label key={t} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.principalTypes.includes(t)}
                      onChange={(e) => setPurpose(i, { principalTypes: e.target.checked ? [...p.principalTypes, t] : p.principalTypes.filter((x) => x !== t) })}
                    />
                    {PRINCIPAL_TYPES[t].split(' ')[0]}
                  </label>
                ))}
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={!!p.optional} onChange={(e) => setPurpose(i, { optional: e.target.checked })} /> optional
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Who else handles the data (processors)</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, processors: [...form.processors, { name: '', purpose: '', location: '' }] })}><Plus size={14} /> Add</Button>
        </div>
        {form.processors.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_auto]">
            <Input aria-label="Name" placeholder="Name" required value={p.name} onChange={(e) => setProcessor(i, { name: e.target.value })} />
            <Input aria-label="What they do" placeholder="What they do" required value={p.purpose} onChange={(e) => setProcessor(i, { purpose: e.target.value })} />
            <Input aria-label="Where" placeholder="Where (country / region)" value={p.location} onChange={(e) => setProcessor(i, { location: e.target.value })} />
            <Button type="button" size="sm" variant="ghost" aria-label="Remove processor" onClick={() => setForm({ ...form, processors: form.processors.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="n-body">Anything else (optional, shown below the purposes)</Label>
        <textarea id="n-body" className={cn(TEXTAREA, 'min-h-[120px]')} maxLength={50000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={update.isPending}>Save draft</Button>
        <Button type="button" variant="outline" onClick={onDone}>Close</Button>
      </div>
    </form>
  );
}
