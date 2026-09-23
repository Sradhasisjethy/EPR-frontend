import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { WorkforceDetailDialog } from './workforce-detail-dialog';

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(() => Promise.resolve({ data: { data: [] } })) },
}));

const show = (props) =>
  renderWithQuery(<WorkforceDetailDialog open onOpenChange={() => {}} {...props} />);

/**
 * The dialog renders from the row the table already holds — the workforce list
 * endpoints include everything their detail endpoints do, so there is nothing
 * to fetch and no way for the dialog to disagree with the row behind it.
 */
describe('WorkforceDetailDialog', () => {
  it('lists the materials on an issue, which the table can only count', () => {
    show({
      kind: 'Material Issues',
      record: {
        issueNumber: 'CMI/BBSR/0002',
        contractor: { name: 'Utkal Manpower' },
        issueDate: '2026-09-09',
        status: 'POSTED',
        lines: [
          { id: 'l1', product: { name: 'Cement (OPC 43)' }, quantity: '12.0000' },
          { id: 'l2', product: { name: 'Sand' }, quantity: '4.5000' },
        ],
      },
    });

    expect(screen.getByText('Cement (OPC 43)')).toBeInTheDocument();
    expect(screen.getByText('Sand')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows the advance reason, which has nowhere to live in the table', () => {
    show({
      kind: 'Advances',
      record: {
        advanceNumber: 'ADV/BBSR/0001',
        party: { name: 'Utkal Manpower' },
        advanceDate: '2026-09-08',
        mode: 'CASH',
        status: 'POSTED',
        reason: 'Festival advance against October work',
      },
    });

    expect(screen.getByText('Festival advance against October work')).toBeInTheDocument();
  });

  it('hides money without VIEW_RATES (BR-07)', () => {
    const record = {
      entryNumber: 'CPE/BBSR/0001',
      contractor: { name: 'Utkal Manpower' },
      product: { name: 'RCC Pipe 600mm' },
      productionDate: '2026-09-08',
      quantity: '30.0000',
      status: 'POSTED',
      pieceRatePaise: 35400,
      totalValuePaise: 1062000,
    };

    const { unmount } = show({ kind: 'Production Entries', record, showRates: false });
    expect(screen.queryByText('Piece rate')).not.toBeInTheDocument();
    unmount();

    show({ kind: 'Production Entries', record, showRates: true });
    expect(screen.getByText('Piece rate')).toBeInTheDocument();
  });

  it('renders nothing without a record, rather than an empty shell', () => {
    const { container } = renderWithQuery(
      <WorkforceDetailDialog open onOpenChange={() => {}} kind="Advances" record={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
