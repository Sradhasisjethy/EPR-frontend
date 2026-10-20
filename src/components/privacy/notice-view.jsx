import { LAWFUL_BASIS } from './privacy-labels';

/**
 * The itemised notice of DPDP s.5 / Rule 3: each purpose, the data used for it,
 * the basis, and how long it is kept. Shared by the sign-in acknowledgement,
 * My Profile, the officer's preview and the public page, so all four say the
 * same thing.
 */
export function NoticeView({ notice, contact, responseDays, principalType, compact = false }) {
  if (!notice) return null;
  const purposes = (notice.purposes || []).filter((p) => !principalType || !p.principalTypes || p.principalTypes.includes(principalType));

  return (
    <div className="space-y-4 text-sm">
      {notice.summary && <p className="leading-relaxed text-muted-foreground">{notice.summary}</p>}

      <div className="space-y-3">
        {purposes.map((p) => (
          <div key={p.code} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{p.label}</p>
              <span className="text-xs text-muted-foreground">
                {LAWFUL_BASIS[p.lawfulBasis] || p.lawfulBasis}
                {p.optional ? ' · optional' : ''}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{p.description}</p>
            {!compact && (
              <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">Data used</dt>
                <dd>{(p.dataItems || []).join(', ')}</dd>
                {p.retention && (
                  <>
                    <dt className="text-muted-foreground">Kept for</dt>
                    <dd>{p.retention}</dd>
                  </>
                )}
                {p.legalReference && (
                  <>
                    <dt className="text-muted-foreground">Basis</dt>
                    <dd>{p.legalReference}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        ))}
      </div>

      {!compact && notice.processors?.length > 0 && (
        <div>
          <p className="font-medium">Who else handles it for us</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {notice.processors.map((p) => (
              <li key={p.name}>
                {p.name}: {p.purpose}
                {p.location ? ` (${p.location})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice.body && !compact && <div className="whitespace-pre-wrap text-muted-foreground">{notice.body}</div>}

      <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">
        <p className="font-medium text-foreground">Your rights</p>
        <p className="mt-1 text-muted-foreground">
          You can see, correct or erase your data, withdraw consent, nominate someone to act for you and raise a grievance.
          {contact?.email ? ` Contact ${contact.name || 'our privacy contact'} at ${contact.email}${contact.phone ? ` or ${contact.phone}` : ''}.` : ''}
          {responseDays ? ` We answer within ${responseDays} days.` : ''} If you are not satisfied, you may complain to the Data
          Protection Board of India.
        </p>
      </div>
    </div>
  );
}
