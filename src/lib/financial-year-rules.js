/**
 * Which financial-year status changes need the FINANCIAL_YEAR_CLOSE grant.
 *
 * Mirrors the API (ERP-backend factory.controller.js, assertMayChangeYearStatus)
 * so the screens only offer what will be accepted: locking or closing a year,
 * reopening a locked one, and activating a year while another is current
 * (a rollover, which locks the current year) all need the grant. Activating the
 * very first year and saving without a status change do not.
 */
export const needsCloseGrant = (from, to, otherYearIsCurrent, isCurrent = from === 'ACTIVE') => {
  if (!to) return false;
  // Saving an ACTIVE year that is not the current one makes it current.
  if (to === from && (to !== 'ACTIVE' || isCurrent)) return false;
  if (to === 'SOFT_CLOSED' || to === 'CLOSED') return true;
  if (from === 'SOFT_CLOSED') return true;
  return to === 'ACTIVE' && otherYearIsCurrent;
};
