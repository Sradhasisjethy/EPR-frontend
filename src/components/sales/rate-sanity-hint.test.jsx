import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithQuery } from '@/test/render';
import { RateSanityHint } from './rate-sanity-hint';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));
const { apiClient } = await import('@/lib/api-client');

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.get.mockResolvedValue({
    data: { data: { rows: [{ id: 'p1', name: 'RCC Pipe 600mm', sellingPricePaise: 450000 }], count: 1 } },
  });
});

describe('RateSanityHint', () => {
  it('shows what the product usually sells for', async () => {
    renderWithQuery(<RateSanityHint productId="p1" rateRupees="4500" />);
    expect(await screen.findByText('Usually ₹4,500.00 each')).toBeInTheDocument();
  });

  // The exact mistake behind INV/BBSR/0006: ₹4,500 typed as 450000.
  it('warns when the typed rate is an order of magnitude off the list price', async () => {
    renderWithQuery(<RateSanityHint productId="p1" rateRupees="450000" />);
    expect(await screen.findByText(/100× the usual price of ₹4,500.00 each — check the rate is per unit/)).toBeInTheDocument();
  });

  it('warns the other way too, when a rate is typed far too low', async () => {
    renderWithQuery(<RateSanityHint productId="p1" rateRupees="45" />);
    expect(await screen.findByText(/100× the usual price/)).toBeInTheDocument();
  });

  it('says nothing about a price a little above list — that is a real sale, not a typo', async () => {
    renderWithQuery(<RateSanityHint productId="p1" rateRupees="5200" />);
    expect(await screen.findByText('Usually ₹4,500.00 each')).toBeInTheDocument();
  });

  it('stays quiet for a product with no list price', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { rows: [{ id: 'p2', name: 'Custom job', sellingPricePaise: 0 }], count: 1 } } });
    const { container } = renderWithQuery(<RateSanityHint productId="p2" rateRupees="999" />);
    expect(container).toBeEmptyDOMElement();
  });
});
