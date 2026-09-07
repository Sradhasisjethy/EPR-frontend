import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePincodeLookup } from './use-pincode';

/**
 * Filling city and state from a PIN code is a convenience. The rules that
 * matter are the ones about it failing: an address the lookup cannot resolve is
 * still a real address, so nothing here may block or clear the form.
 */
const reply = (payload) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })));

const SUCCESS = [
  {
    Status: 'Success',
    PostOffice: [{ Name: 'Sainik School', District: 'Khordha', State: 'Odisha', Country: 'India' }],
  },
];

describe('usePincodeLookup', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resolves a six-digit code to city, state and country', async () => {
    reply(SUCCESS);
    const onResolved = vi.fn();
    const { result } = renderHook(() => usePincodeLookup('751007', { onResolved }));

    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => expect(result.current).toBe('resolved'));
    expect(onResolved).toHaveBeenCalledWith({ city: 'Khordha', state: 'Odisha', country: 'India' });
  });

  it('does not look up an incomplete code', async () => {
    reply(SUCCESS);
    const { result } = renderHook(() => usePincodeLookup('7510'));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });

  it('waits for typing to settle rather than firing per keystroke', async () => {
    reply(SUCCESS);
    const { rerender } = renderHook(({ code }) => usePincodeLookup(code), {
      initialProps: { code: '751007' },
    });
    rerender({ code: '751008' });
    rerender({ code: '751009' });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith('https://api.postalpincode.in/pincode/751009', expect.anything());
  });

  it('reports a code the service does not know, without calling back', async () => {
    reply([{ Status: 'Error', PostOffice: null }]);
    const onResolved = vi.fn();
    const { result } = renderHook(() => usePincodeLookup('999999', { onResolved }));

    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => expect(result.current).toBe('notfound'));
    // The user types the address themselves; nothing is filled or cleared.
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('survives the service being unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const onResolved = vi.fn();
    const { result } = renderHook(() => usePincodeLookup('751007', { onResolved }));

    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => expect(result.current).toBe('error'));
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('does not re-fetch a code it has already resolved', async () => {
    reply(SUCCESS);
    const { rerender } = renderHook(({ code }) => usePincodeLookup(code), {
      initialProps: { code: '751007' },
    });
    await act(async () => { vi.advanceTimersByTime(400); });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Re-rendering must not overwrite a city the user has since corrected.
    rerender({ code: '751007' });
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
