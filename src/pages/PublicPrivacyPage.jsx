import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfideepLogo } from '@/components/auth/infideep-logo';
import { REQUEST_TYPES, LAWFUL_BASIS, SELECT, TEXTAREA } from '@/components/privacy/privacy-labels';
import { usePublicPrivacy, useSubmitPublicRequest } from '@/hooks/use-privacy';
import {
  POLICY_PRODUCT, POLICY_EFFECTIVE_DATE, POLICY_DEFAULT_RESPONSE_DAYS, DEFAULT_PURPOSES, DEFAULT_PROCESSORS, POLICY_SECTIONS,
} from '@/constants/privacy-policy';
import { cn } from '@/lib/utils';

const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * /privacy — no sign-in. The application owner's privacy policy, which the
 * login page's "Privacy Policy" link opens, and the form for making a request.
 *
 * The policy itself ships with the app (constants/privacy-policy.js), so the
 * page is complete the moment it opens, whether or not a notice has been
 * published and whether or not the API is awake. What the owner publishes from
 * Data Protection replaces the defaults where they overlap: contact, purposes,
 * processors, response time, data location and version.
 *
 * Nothing about anyone is shown back from a request: the reply goes to the
 * contact details given, after the owner has checked who is asking.
 */
export default function PublicPrivacyPage() {
  const { data: live } = usePublicPrivacy();
  const notice = live?.notice;
  const contact = live?.contact;
  const responseDays = live?.responseDays || POLICY_DEFAULT_RESPONSE_DAYS;

  const sections = [
    ...POLICY_SECTIONS,
    ...(notice?.body ? [{ id: 'additional', title: `${POLICY_SECTIONS.length + 1}. Additional terms`, blocks: [notice.body] }] : []),
    { id: 'request', title: `${POLICY_SECTIONS.length + (notice?.body ? 2 : 1)}. Make a request` },
  ];

  const slots = {
    purposes: <Purposes purposes={notice?.purposes?.length ? notice.purposes : DEFAULT_PURPOSES} />,
    processors: <Processors processors={notice?.processors?.length ? notice.processors : DEFAULT_PROCESSORS} />,
    location: (
      <p>
        {live?.dataLocation
          ? `The application's data is stored in: ${live.dataLocation}.`
          : 'The application\'s data is stored with the hosting providers listed above. Ask us if you need to know the location.'}
      </p>
    ),
    contact: <Contact contact={contact} responseDays={responseDays} />,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/login" aria-label={`${POLICY_PRODUCT} sign in`}>
            <InfideepLogo className="h-8 w-auto" />
          </Link>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-12">
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-8 space-y-1 text-sm">
            <p className="mb-2 font-medium">Contents</p>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <main className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{notice?.title || 'Privacy Policy'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {POLICY_PRODUCT}
            {' · '}
            {notice ? `Version ${notice.version}, in force since ${formatDay(notice.publishedAt)}` : `Effective ${formatDay(POLICY_EFFECTIVE_DATE)}`}
          </p>
          {notice?.summary && <p className="mt-6 rounded-xl border border-border bg-card p-4 leading-relaxed">{notice.summary}</p>}

          <details className="mt-6 rounded-xl border border-border p-4 lg:hidden">
            <summary className="cursor-pointer font-medium">Contents</summary>
            <div className="mt-2 space-y-1 text-sm">
              {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block text-muted-foreground hover:text-foreground">{s.title}</a>)}
            </div>
          </details>

          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-foreground/90">
                  {(section.blocks || []).map((block, i) =>
                    typeof block === 'string' ? (
                      <p key={i} className="whitespace-pre-wrap">{block}</p>
                    ) : (
                      <ul key={i} className="list-disc space-y-1 pl-6">
                        {block.list.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    )
                  )}
                  {section.slot && slots[section.slot]}
                  {section.id === 'request' && <RequestForm responseDays={responseDays} />}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function Purposes({ purposes }) {
  return (
    <div className="space-y-3">
      {purposes.map((p) => (
        <div key={p.code} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{p.label}</p>
            <span className="text-xs text-muted-foreground">
              {p.lawfulBasis === 'CONSENT' ? 'Basis: your consent' : `Basis: ${LAWFUL_BASIS[p.lawfulBasis] || p.lawfulBasis}`}
              {p.optional ? ' · optional' : ''}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[7rem_1fr]">
            <dt className="text-muted-foreground">Data used</dt>
            <dd>{(p.dataItems || []).join(', ')}</dd>
            {p.retention && (<><dt className="text-muted-foreground">Kept for</dt><dd>{p.retention}</dd></>)}
          </dl>
        </div>
      ))}
    </div>
  );
}

function Processors({ processors }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr><th className="px-3 py-2 font-medium">Service provider</th><th className="px-3 py-2 font-medium">What they do</th><th className="px-3 py-2 font-medium">Where</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {processors.map((p) => (
            <tr key={p.name}>
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.purpose}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.location || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Contact({ contact, responseDays }) {
  const named = contact && (contact.name || contact.email);
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm">
      {named ? (
        <dl className="grid gap-1 sm:grid-cols-[8rem_1fr]">
          {contact.name && (<><dt className="text-muted-foreground">Name</dt><dd>{contact.name}{contact.designation ? `, ${contact.designation}` : ''}</dd></>)}
          {contact.email && (<><dt className="text-muted-foreground">Email</dt><dd><a className="text-primary hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></dd></>)}
          {contact.phone && (<><dt className="text-muted-foreground">Phone</dt><dd>{contact.phone}</dd></>)}
          {contact.postalAddress && (<><dt className="text-muted-foreground">Post</dt><dd className="whitespace-pre-wrap">{contact.postalAddress}</dd></>)}
        </dl>
      ) : (
        <p>Use the request form at the end of this page. It reaches our Grievance Officer directly.</p>
      )}
      <p className="mt-3 text-muted-foreground">We reply within {responseDays} days, and in any case within the 90 days the Rules allow.</p>
    </div>
  );
}

function RequestForm({ responseDays }) {
  const submit = useSubmitPublicRequest();
  const [form, setForm] = useState({
    type: 'ACCESS', requesterName: '', requesterEmail: '', requesterPhone: '', requesterRelation: 'SELF',
    requesterOrganisation: '', details: '', website: '',
  });
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSent(await submit.mutateAsync(form));
    } catch (err) {
      setError(err.response?.data?.message || 'Your request could not be sent just now. Please try again in a minute.');
    }
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm" role="status">
        <p>Your request has been received. Your reference is <span className="font-semibold">{sent.reference}</span>.</p>
        <p className="mt-1 text-muted-foreground">We will contact you to confirm who you are, and reply by {sent.dueDate}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3 rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">To see, correct or erase your data, withdraw consent, name a nominee or raise a grievance. We reply within {responseDays} days.</p>
      <div className="space-y-1">
        <Label htmlFor="pr-type">What would you like?</Label>
        <select id="pr-type" className={cn(SELECT, 'w-full')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <p className="text-xs text-muted-foreground">{REQUEST_TYPES[form.type].help}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pr-name">Your name</Label>
          <Input id="pr-name" required maxLength={160} value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-relation">You are</Label>
          <select id="pr-relation" className={cn(SELECT, 'w-full')} value={form.requesterRelation} onChange={(e) => setForm({ ...form, requesterRelation: e.target.value })}>
            <option value="SELF">The person the data is about</option>
            <option value="NOMINEE">Their nominee</option>
            <option value="GUARDIAN">Their parent or guardian</option>
            <option value="AUTHORISED">Someone they authorised</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-email">Email</Label>
          <Input id="pr-email" type="email" maxLength={160} value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pr-phone">Phone</Label>
          <Input id="pr-phone" type="tel" maxLength={20} value={form.requesterPhone} onChange={(e) => setForm({ ...form, requesterPhone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pr-org">Which business do you deal with?</Label>
        <Input id="pr-org" maxLength={160} placeholder="e.g. the company you work for, buy from or supply" value={form.requesterOrganisation} onChange={(e) => setForm({ ...form, requesterOrganisation: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pr-details">Details</Label>
        <textarea id="pr-details" className={TEXTAREA} maxLength={4000} placeholder="How they know you (e.g. worker at the Bhubaneswar plant, customer since 2024) and what you need." value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
      </div>
      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">Give an email or phone number so we can reply. We use it only to answer this request.</p>
      <Button type="submit" disabled={submit.isPending}>{submit.isPending ? 'Sending…' : 'Send request'}</Button>
    </form>
  );
}
