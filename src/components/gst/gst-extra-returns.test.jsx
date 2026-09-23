import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { TaxRateSummary, Gstr9 } from './gst-extra-returns';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

const PARAMS = { factoryId: 'f1', fromDate: '2026-04-01', toDate: '2026-06-30' };
const side = (taxable, tax) => ({ taxableValuePaise: taxable, cgstPaise: tax / 2, sgstPaise: tax / 2, igstPaise: 0, totalTaxPaise: tax });

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.get.mockImplementation((url) => {
    if (url.includes('tax-rate-summary')) {
      return Promise.resolve({ data: { data: {
        rows: [
          { gstRatePercent: 18, outward: side(50000, 9000), inward: side(0, 0) },
          { gstRatePercent: 28, outward: side(0, 0), inward: side(500000, 140000) },
        ],
        totals: { outward: { taxableValuePaise: 50000, totalTaxPaise: 9000 }, inward: { taxableValuePaise: 500000, totalTaxPaise: 140000 } },
      } } });
    }
    return Promise.reject({ response: { data: { message: 'This return shows amounts — it needs the "View rates and amounts" permission' } } });
  });
});

describe('TaxRateSummary', () => {
  it('shows each rate with output, input and the net between them', async () => {
    renderWithQuery(<TaxRateSummary params={PARAMS} />);
    expect(await screen.findByText('18%')).toBeInTheDocument();
    expect(screen.getByText('28%')).toBeInTheDocument();
    // Net across all rates: 90 − 1,400 = −1,310.
    expect(screen.getByText('-₹1,310.00')).toBeInTheDocument();
  });
});

describe('Gstr9', () => {
  it('shows the server’s reason when it refuses', async () => {
    renderWithQuery(<Gstr9 params={PARAMS} />);
    expect(await screen.findByText(/needs the "View rates and amounts" permission/)).toBeInTheDocument();
  });
});
