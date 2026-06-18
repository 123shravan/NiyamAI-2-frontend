/**
 * Shared token refresh singleton.
 *
 * Problem: multiple concurrent components/hooks can trigger a 401 at the same moment
 * (axios interceptor, SSE stream handler, proactive timer, etc.).  Each independently
 * calling /auth/token/refresh causes a token-rotation race: the first call rotates the
 * old refresh token and stores a new one in Redis.  The second call arrives with the now-
 * deleted old token → 401 → the user is logged out even though their session was valid.
 *
 * Solution: module-level promise that collapses all concurrent callers onto a single
 * in-flight HTTP request.  Any caller that arrives while a refresh is already running
 * gets the same promise — they all wait for the one request to settle and share the result.
 */

import api from './api';

let _refreshPromise: Promise<string | null> | null = null;

/**
 * Refresh the access token, deduplicating concurrent callers.
 *
 * Returns the new access_token string on success, or throws on failure.
 * All callers that overlap in time will share the same request.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = api
    .post('/auth/token/refresh')
    .then((res) => {
      _refreshPromise = null;
      return (res.data?.access_token as string) ?? null;
    })
    .catch((err) => {
      _refreshPromise = null;
      throw err;
    });

  return _refreshPromise;
}
