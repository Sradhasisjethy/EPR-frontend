/**
 * An Idempotency-Key for each financial "Save", so a double click (or a retry
 * after a dropped connection) creates one document, not two.
 *
 * The server replays the first response to any repeat that carries the same key
 * (ERP-backend src/middlewares/idempotency.js, financialDoubleSubmitGuard). The
 * key is derived from what is being submitted plus a 30-second time bucket:
 * two clicks on the same form share it, while the same entry saved again a
 * minute later — a real second expense — gets a new one. A click that happens
 * to straddle a bucket boundary is not caught; that is the rare case this
 * accepts in exchange for needing no per-form wiring.
 */

// Mirrors FINANCIAL_CREATE_PATHS on the server, relative to the /api/v1 base.
export const FINANCIAL_CREATE_PATHS = new Set([
  '/sales/orders',
  '/receipts',
  '/payments',
  '/expenses',
  '/retail/counter-sales',
  '/ledger/vouchers',
  '/production/entries',
  '/production/wastage',
  '/purchasing/orders',
  '/purchasing/receipts',
  '/purchasing/invoices',
  '/returns/sales-returns',
  '/returns/purchase-returns',
  '/returns/credit-notes',
  '/returns/debit-notes',
  '/workforce/advances',
  '/workforce/contractor/material-issues',
  '/workforce/contractor/production-entries',
  '/invoices',
  '/dispatch/challans',
  '/transfers',
  '/inventory/adjustments',
  '/cash-register/sessions',
]);

const BUCKET_MS = 30_000;

/** JSON with object keys sorted, so key order never changes the fingerprint. */
export const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

/**
 * 64-bit FNV-1a as two 32-bit halves. Synchronous (crypto.subtle is async and
 * absent on plain-http LAN hosts); collisions only matter within one user's
 * 30-second window, and the server refuses a key reused for a different body.
 */
const fnv1a64 = (text) => {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193 ^ 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
};

const pathOf = (url) => {
  const path = String(url || '').split('?')[0].replace(/\/+$/, '');
  // An absolute URL (rare: callers pass paths) — keep only what follows /api/v1.
  const at = path.indexOf('/api/v1/');
  return at >= 0 ? path.slice(at + '/api/v1'.length) : path;
};

/** The key for this request, or null when it is not a financial create. */
export const submissionKeyFor = (config, now = Date.now()) => {
  if (String(config?.method || '').toLowerCase() !== 'post') return null;
  const path = pathOf(config.url);
  if (!FINANCIAL_CREATE_PATHS.has(path.toLowerCase())) return null;
  let body = config.data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* hash the raw string */ }
  }
  const bucket = Math.floor(now / BUCKET_MS);
  return `fs-${fnv1a64(`POST ${path}\n${stableStringify(body)}\n${bucket}`)}`;
};
