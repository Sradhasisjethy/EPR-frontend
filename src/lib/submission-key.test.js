import { describe, it, expect } from 'vitest';
import { submissionKeyFor, stableStringify } from './submission-key';

const NOW = 1_800_000_000_000;

describe('submissionKeyFor', () => {
  it('gives two clicks on the same financial Save the same key', () => {
    const a = submissionKeyFor({ method: 'post', url: '/receipts', data: { amountPaise: 100, partyId: 'p' } }, NOW);
    const b = submissionKeyFor({ method: 'post', url: '/receipts', data: '{"partyId":"p","amountPaise":100}' }, NOW + 1000);
    expect(a).toMatch(/^fs-[0-9a-f]{16}$/);
    expect(b).toBe(a);
  });

  it('gives a different key to a different entry or a later save', () => {
    const a = submissionKeyFor({ method: 'post', url: '/expenses', data: { amountPaise: 100 } }, NOW);
    expect(submissionKeyFor({ method: 'post', url: '/expenses', data: { amountPaise: 101 } }, NOW)).not.toBe(a);
    expect(submissionKeyFor({ method: 'post', url: '/expenses', data: { amountPaise: 100 } }, NOW + 60_000)).not.toBe(a);
  });

  it('leaves everything that is not a financial create alone', () => {
    expect(submissionKeyFor({ method: 'get', url: '/receipts' }, NOW)).toBeNull();
    expect(submissionKeyFor({ method: 'post', url: '/parties', data: {} }, NOW)).toBeNull();
    expect(submissionKeyFor({ method: 'post', url: '/receipts/abc/cancel', data: {} }, NOW)).toBeNull();
  });

  it('sorts object keys so key order never changes the fingerprint', () => {
    expect(stableStringify({ b: 1, a: [{ d: 1, c: 2 }] })).toBe(stableStringify({ a: [{ c: 2, d: 1 }], b: 1 }));
  });
});
