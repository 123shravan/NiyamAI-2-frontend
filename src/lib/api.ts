import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true,  // M-06: Required for cross-origin cookies
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: auto-refresh token on 401
// IMPORTANT: Auth endpoints (/auth/*) handle their own error flows.
// Only intercept 401s for protected resources (queries, admin, profile, etc.)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest.url || '';

    // Skip auto-refresh for auth endpoints — they handle their own 401s
    const isAuthEndpoint = url.startsWith('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        await api.post('/auth/token/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
