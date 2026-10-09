import { describe, it, expect } from 'vitest';
import { needsCloseGrant } from './financial-year-rules';

describe('needsCloseGrant', () => {
  it('requires the grant to lock, close or reopen', () => {
    expect(needsCloseGrant('ACTIVE', 'SOFT_CLOSED', false)).toBe(true);
    expect(needsCloseGrant('SOFT_CLOSED', 'CLOSED', false)).toBe(true);
    expect(needsCloseGrant('SOFT_CLOSED', 'ACTIVE', false)).toBe(true);
  });

  it('requires it to activate a year while another is current', () => {
    expect(needsCloseGrant('PLANNED', 'ACTIVE', true)).toBe(true);
  });

  it('does not require it for the first year, or for no change', () => {
    expect(needsCloseGrant('PLANNED', 'ACTIVE', false)).toBe(false);
    expect(needsCloseGrant('ACTIVE', 'ACTIVE', true)).toBe(false);
    expect(needsCloseGrant('PLANNED', 'PLANNED', true)).toBe(false);
  });

  it('treats re-saving a non-current ACTIVE year as activating it', () => {
    expect(needsCloseGrant('ACTIVE', 'ACTIVE', true, false)).toBe(true);
    expect(needsCloseGrant('ACTIVE', 'ACTIVE', false, false)).toBe(false);
  });
});
