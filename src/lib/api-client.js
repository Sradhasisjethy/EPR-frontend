import axios from 'axios';
import { submissionKeyFor } from './submission-key';

/**
 * Set once by the query provider, so the interceptor can drop cached permissions
 * after a refresh without importing React state into this module.
 *
 * The API now rejects an access token whose permissions have changed since it
 * was minted, and the 401 path below refreshes transparently. Without this, the
 * refresh succeeds and the request retries with the *new* grant while the UI
 * keeps rendering from the `currentUser` it cached under the old one — menus
 * and buttons for things the server has just started refusing.
 */
let onSessionRefreshed = null;
export const setSessionRefreshHandler = (fn) => { onSessionRefreshed = fn; };

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('infideep-access-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // A double click on a financial Save shares this key, so the server creates
  // one document and replays it to the second click (lib/submission-key.js).
  const submissionKey = submissionKeyFor(config);
  if (submissionKey && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = submissionKey;
  }
  return config;
});

/**
 * 429 handling.
 *
 * A 429 is the server saying "slow down", not "your session is bad", so it must
 * never reach the refresh/logout path below. A GET is retried once when the
 * server says it can be answered within MAX_RATE_LIMIT_WAIT_MS; a longer wait
 * is not worth holding a spinner for, and anything but a GET may already have
 * had its effect, so neither is retried — the caller gets a readable error.
 */
const MAX_RATE_LIMIT_WAIT_MS = 30_000;
const DEFAULT_RATE_LIMIT_WAIT_MS = 2_000;
export const RATE_LIMIT_MESSAGE = 'Too many requests right now. Please wait a moment and try again.';

// Retry-After is seconds or an HTTP date; RateLimit-Reset is seconds.
export const rateLimitDelayMs = (headers = {}, now = Date.now()) => {
  const retryAfter = headers['retry-after'];
  if (retryAfter != null && retryAfter !== '') {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const at = Date.parse(retryAfter);
    if (!Number.isNaN(at)) return Math.max(0, at - now);
  }
  const reset = Number(headers['ratelimit-reset']);
  if (headers['ratelimit-reset'] != null && Number.isFinite(reset)) return Math.max(0, reset * 1000);
  return DEFAULT_RATE_LIMIT_WAIT_MS;
};

const rateLimitError = (error) => {
  const serverMessage = error.response?.data?.message;
  error.message = typeof serverMessage === 'string' && serverMessage ? serverMessage : RATE_LIMIT_MESSAGE;
  error.isRateLimited = true;
  return error;
};

const handleRateLimited = async (error) => {
  const request = error.config;
  const method = (request?.method || 'get').toLowerCase();
  const delay = rateLimitDelayMs(error.response?.headers);
  if (!request || method !== 'get' || request._rateLimitRetried || delay > MAX_RATE_LIMIT_WAIT_MS) {
    throw rateLimitError(error);
  }
  request._rateLimitRetried = true;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return apiClient(request);
};

// Handle auth redirects and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) return handleRateLimited(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If the refresh or login itself fails with 401, clear tokens and redirect to login
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        localStorage.removeItem('infideep-access-token');
        localStorage.removeItem('infideep-refresh-token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('infideep-refresh-token');
        const refreshResponse = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken: storedRefreshToken || undefined },
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('infideep-access-token', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        if (newRefreshToken) {
          localStorage.setItem('infideep-refresh-token', newRefreshToken);
        }

        isRefreshing = false;
        processQueue(null, newAccessToken);
        // Permissions may have been what forced the refresh; re-read them.
        try { onSessionRefreshed?.(); } catch { /* never let this break the retry */ }

        return apiClient(originalRequest);
      } catch (err) {
        isRefreshing = false;
        // A throttled refresh says nothing about the session: keep the tokens
        // and stay on the page rather than signing the user out.
        if (err.response?.status === 429) {
          rateLimitError(err);
          processQueue(err, null);
          return Promise.reject(err);
        }
        processQueue(err, null);
        localStorage.removeItem('infideep-access-token');
        localStorage.removeItem('infideep-refresh-token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };
