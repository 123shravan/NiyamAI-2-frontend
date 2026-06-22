import axios from 'axios';
import { refreshAccessToken } from './refreshToken';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  withCredentials: true,  // M-06: Required for cross-origin cookies
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: auto-refresh token on 401.
//
// Two bugs this fixes:
// 1. The old code called api.post('/auth/token/refresh') directly — multiple concurrent
//    401s each triggered independent rotations, causing the second call to fail.
//    Now all concurrent 401s share a single in-flight refresh via the singleton.
//
// 2. The old code retried the original request without updating the Authorization header.
//    The backend checks the header first, so a retry with an old (expired) token in the
//    header always fails even though the cookie is now fresh.
//    Now the header is updated before retrying.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Auth and admin endpoints handle their own 401 flows — do not intercept them.
    const isAuthEndpoint = url.startsWith('/auth/');
    const isAdminEndpoint = url.startsWith('/admin/');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      !isAdminEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Update the shared default header so all subsequent requests use the new token.
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          // Also patch this specific retry so the header it sends is current.
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch {
        // Refresh failed (expired session, revoked token, network error).
        // Redirect to login only if we're in a browser context and not already there.
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatTurn {
  id: string;
  query_text: string;
  answer: string;
  cited_node_ids: string[];
  created_at: string;
  // Present only for a turn just answered in this session (carried over from the
  // live SSE stream). DB-loaded turns omit it — their `answer` already contains
  // the rendered citation blocks, so the UI parses citations from the text.
  citations?: {
    id: string;
    display_id?: string;
    text: string;
    breadcrumb?: string[];
    effective_from?: string;
  }[];
}

export const chatApi = {
  list: () => api.get<{ chats: ChatSummary[] }>('/chats'),
  rename: (id: string, title: string) => api.patch(`/chats/${id}`, { title }),
  remove: (id: string) => api.delete(`/chats/${id}`),
  messages: (id: string) => api.get<{ chat: ChatSummary; messages: ChatTurn[] }>(`/chats/${id}/messages`),
};

export default api;
