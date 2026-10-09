import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { apiClient, rateLimitDelayMs, RATE_LIMIT_MESSAGE } from './api-client';

/**
 * A 429 must never be read as a bad session (the old path refreshed and, when
 * the refresh was throttled too, signed the user out). GETs are retried once
 * after the server's delay when it is short; nothing else is retried.
 */

const reply = (config, status, { headers = {}, data = {} } = {}) => {
  const response = { status, statusText: String(status), headers, data, config };
  if (status < 400) return Promise.resolve(response);
  return Promise.reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, null, response));
};

describe('api-client on HTTP 429', () => {
  let adapter;
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = vi.fn();
    apiClient.defaults.adapter = adapter;
    localStorage.setItem('infideep-access-token', 'access');
    localStorage.setItem('infideep-refresh-token', 'refresh');
  });

  afterEach(() => {
    vi.useRealTimers();
    apiClient.defaults.adapter = originalAdapter;
    localStorage.clear();
  });

  it('retries a GET once after Retry-After', async () => {
    adapter
      .mockImplementationOnce((config) => reply(config, 429, { headers: { 'retry-after': '3' } }))
      .mockImplementationOnce((config) => reply(config, 200, { data: { ok: true } }));

    const pending = apiClient.get('/dashboard');
    await vi.advanceTimersByTimeAsync(2_900);
    expect(adapter).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);

    const res = await pending;
    expect(res.data).toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('infideep-access-token')).toBe('access');
  });

  it('gives up with a readable error when the retry is throttled too', async () => {
    adapter.mockImplementation((config) =>
      reply(config, 429, { headers: { 'ratelimit-reset': '1' }, data: { success: false, message: 'Too many requests, please try again after 15 minutes' } })
    );

    const pending = apiClient.get('/notifications').catch((e) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    const err = await pending;

    expect(adapter).toHaveBeenCalledTimes(2);
    expect(err.isRateLimited).toBe(true);
    expect(err.message).toBe('Too many requests, please try again after 15 minutes');
    // Never mistaken for an expired session.
    expect(localStorage.getItem('infideep-refresh-token')).toBe('refresh');
  });

  it('does not wait longer than 30 s: rejects at once instead', async () => {
    adapter.mockImplementation((config) => reply(config, 429, { headers: { 'retry-after': '600' }, data: 'Too many' }));

    const err = await apiClient.get('/reports').catch((e) => e);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(err.message).toBe(RATE_LIMIT_MESSAGE);
  });

  it('never retries a non-GET', async () => {
    adapter.mockImplementation((config) => reply(config, 429, { headers: { 'retry-after': '1' } }));

    const err = await apiClient.post('/sales-orders', { a: 1 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(err.isRateLimited).toBe(true);
    expect(err.response.status).toBe(429);
  });

  it('keeps the session when the token refresh itself is throttled', async () => {
    adapter.mockImplementation((config) => reply(config, 401));
    const post = vi.spyOn(axios, 'post').mockImplementation((url, body, config) => reply({ ...config, url, method: 'post' }, 429));

    const err = await apiClient.get('/dashboard').catch((e) => e);
    expect(post).toHaveBeenCalledTimes(1);
    expect(err.isRateLimited).toBe(true);
    expect(localStorage.getItem('infideep-access-token')).toBe('access');
    expect(localStorage.getItem('infideep-refresh-token')).toBe('refresh');
    post.mockRestore();
  });
});

describe('rateLimitDelayMs', () => {
  it('reads Retry-After seconds, Retry-After dates and RateLimit-Reset', () => {
    const now = Date.parse('2026-10-09T10:00:00Z');
    expect(rateLimitDelayMs({ 'retry-after': '5' }, now)).toBe(5_000);
    expect(rateLimitDelayMs({ 'retry-after': 'Fri, 09 Oct 2026 10:00:10 GMT' }, now)).toBe(10_000);
    expect(rateLimitDelayMs({ 'ratelimit-reset': '7' }, now)).toBe(7_000);
    expect(rateLimitDelayMs({}, now)).toBe(2_000);
  });
});
