import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { DateText } from './date-text';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

const settings = (rows) =>
  apiClient.get.mockResolvedValue({ data: { data: rows } });

/**
 * DateText is what makes the Settings > General date format mean anything: it
 * renders inside the table cell, so every date on screen follows the setting
 * without each page having to read it.
 */
describe('DateText', () => {
  beforeEach(() => apiClient.get.mockReset());

  it('renders the date in the tenant format', async () => {
    settings([{ key: 'dateFormat', value: 'DD/MM/YYYY' }]);
    renderWithQuery(<DateText value="2026-09-04" />);
    await waitFor(() => expect(screen.getByText('04/09/2026')).toBeInTheDocument());
  });

  it('follows a different tenant format', async () => {
    settings([{ key: 'dateFormat', value: 'MM/DD/YYYY' }]);
    renderWithQuery(<DateText value="2026-09-04" />);
    await waitFor(() => expect(screen.getByText('09/04/2026')).toBeInTheDocument());
  });

  it('applies the tenant timezone to a timestamp', async () => {
    settings([
      { key: 'dateFormat', value: 'DD/MM/YYYY' },
      { key: 'timezone', value: 'Asia/Kolkata' },
    ]);
    // 20:00Z is already the next day in Kolkata.
    renderWithQuery(<DateText value="2026-09-04T20:00:00.000Z" withTime />);
    await waitFor(() => expect(screen.getByText('05/09/2026 01:30')).toBeInTheDocument());
  });

  it('shows a fallback rather than a blank cell for a missing date', async () => {
    settings([{ key: 'dateFormat', value: 'DD/MM/YYYY' }]);
    renderWithQuery(<DateText value={null} />);
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument());
  });

  it('falls back to the default format when the tenant has saved nothing', async () => {
    settings([]);
    renderWithQuery(<DateText value="2026-09-04" />);
    await waitFor(() => expect(screen.getByText('04/09/2026')).toBeInTheDocument());
  });

  it('does not blank the date when the settings payload is not a list', async () => {
    // Defensive: the settings endpoint is a generic key/JSONB store, and every
    // date in the app renders through here — a surprising shape must degrade to
    // the default rather than emptying every cell on screen.
    apiClient.get.mockResolvedValue({ data: { data: null } });
    renderWithQuery(<DateText value="2026-09-04" />);
    await waitFor(() => expect(screen.getByText('04/09/2026')).toBeInTheDocument());
  });

});
