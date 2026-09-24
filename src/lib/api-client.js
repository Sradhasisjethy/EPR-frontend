import axios from 'axios';

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
  return config;
});

// Handle auth redirects and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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
