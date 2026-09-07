import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './date-format';

/**
 * Settings > General offered a date format that nothing read. Dates rendered
 * four ways depending on the call site — raw API value, browser locale, or a
 * formatDate pinned to en-US — so changing the setting changed nothing.
 *
 * These cases mirror tests/date-display.test.js in the API, which formats the
 * same dates onto printed documents. The two must agree.
 */
describe('formatDate', () => {
  it('renders each pattern the settings screen offers', () => {
    expect(formatDate('2026-09-04', { dateFormat: 'DD/MM/YYYY' })).toBe('04/09/2026');
    expect(formatDate('2026-09-04', { dateFormat: 'MM/DD/YYYY' })).toBe('09/04/2026');
    expect(formatDate('2026-09-04', { dateFormat: 'YYYY-MM-DD' })).toBe('2026-09-04');
  });

  it('falls back rather than failing when the tenant has set nothing', () => {
    expect(formatDate('2026-09-04')).toBe('04/09/2026');
    expect(formatDate('2026-09-04', { dateFormat: 'nonsense' })).toBe('04/09/2026');
  });

  it('never moves a plain calendar date across a timezone', () => {
    // A DATEONLY value is already the date that was meant. Shifting it a day
    // changes the business day on a dispatch, and the return period on an
    // invoice.
    for (const timeZone of ['Asia/Kolkata', 'America/New_York', 'Pacific/Kiritimati']) {
      expect(formatDate('2026-09-04', { dateFormat: 'DD/MM/YYYY', timeZone })).toBe('04/09/2026');
    }
  });

  it('converts a real timestamp into the tenant timezone', () => {
    const instant = '2026-09-04T20:00:00.000Z'; // already the 5th in Kolkata
    expect(formatDate(instant, { dateFormat: 'DD/MM/YYYY', timeZone: 'Asia/Kolkata' })).toBe('05/09/2026');
    expect(formatDate(instant, { dateFormat: 'DD/MM/YYYY', timeZone: 'America/New_York' })).toBe('04/09/2026');
  });

  it('returns empty for anything that is not a date', () => {
    for (const value of [null, undefined, '', 'not a date']) {
      expect(formatDate(value, { dateFormat: 'DD/MM/YYYY' })).toBe('');
    }
  });
});

describe('formatDateTime', () => {
  it('shows the clock time in the tenant timezone, 24-hour', () => {
    const instant = '2026-09-04T20:00:00.000Z';
    expect(formatDateTime(instant, { dateFormat: 'DD/MM/YYYY', timeZone: 'Asia/Kolkata' })).toBe('05/09/2026 01:30');
    expect(formatDateTime(instant, { dateFormat: 'DD/MM/YYYY', timeZone: 'UTC' })).toBe('04/09/2026 20:00');
  });

  it('does not invent a time for a plain calendar date', () => {
    // "2026-09-04" carries no time; printing 00:00 would be a fabrication.
    expect(formatDateTime('2026-09-04', { dateFormat: 'DD/MM/YYYY' })).toBe('04/09/2026');
  });
});
