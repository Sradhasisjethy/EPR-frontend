/** Wording for the DPDP screens, in one place so every screen says it the same way. */

export const REQUEST_TYPES = {
  ACCESS: { label: 'See my data', officer: 'Access', help: 'A summary of the personal data held and what it is used for (s.11).' },
  CORRECTION: { label: 'Correct my data', officer: 'Correction', help: 'Correct, complete or update inaccurate data (s.12).' },
  ERASURE: { label: 'Erase my data', officer: 'Erasure', help: 'Erase data no longer needed, except what the law requires us to keep (s.12).' },
  NOMINATION: { label: 'Nominate someone', officer: 'Nomination', help: 'Someone to act for you after death or incapacity (s.14).' },
  GRIEVANCE: { label: 'Raise a grievance', officer: 'Grievance', help: 'A complaint about how your data was handled (s.13).' },
  CONSENT_WITHDRAWAL: { label: 'Withdraw consent', officer: 'Consent withdrawal', help: 'Stop processing that relied on your consent (s.6(4)).' },
};

export const REQUEST_STATUS = {
  RECEIVED: { label: 'Received', className: 'bg-slate-500/10 text-slate-600' },
  VERIFYING: { label: 'Checking identity', className: 'bg-blue-500/10 text-blue-600' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-amber-500/10 text-amber-600' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-500/10 text-rose-600' },
};

export const CHANNELS = {
  IN_APP: 'In the app',
  PUBLIC_FORM: 'Public form',
  EMAIL: 'Email',
  WRITTEN: 'Letter / written',
  PHONE: 'Phone',
};

export const CONSENT_METHODS = {
  IN_APP: 'In the app',
  WEB_FORM: 'Web form',
  WRITTEN: 'Signed form',
  EMAIL: 'Email',
  VERBAL_RECORDED: 'Verbal, recorded',
};

export const PRINCIPAL_TYPES = {
  USER: 'Staff member',
  PARTY: 'Party (customer, vendor, labour)',
  LEAD: 'Enquiry (lead)',
  OTHER: 'Someone not in the system',
};

export const BREACH_SEVERITY = {
  LOW: 'bg-slate-500/10 text-slate-600',
  MEDIUM: 'bg-amber-500/10 text-amber-600',
  HIGH: 'bg-orange-500/10 text-orange-600',
  CRITICAL: 'bg-rose-500/10 text-rose-600',
};

export const LAWFUL_BASIS = {
  CONSENT: 'Your consent',
  LEGITIMATE_USE: 'Legitimate use (s.7)',
};

export const TEXTAREA = 'w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm';
export const SELECT = 'h-9 px-3 rounded-md border border-input bg-background text-sm';

export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '');

/** "2026-10-14T10:00" for a datetime-local input, in the browser's zone. */
export const toLocalInput = (value) => {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A datetime-local value back to an ISO instant with offset, as the API wants. */
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : undefined);

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
