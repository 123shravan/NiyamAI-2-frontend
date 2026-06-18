'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';
import { refreshAccessToken } from './refreshToken';

// L3 — User type includes is_admin flag read from JWT payload
// This is used ONLY for UX (showing/hiding admin UI).
// Real security enforcement is on the backend (L1–L4). (Section 7.3)
interface User {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  designation?: string | null;
  org_name?: string | null;
  org_type?: string | null;
  state?: string | null;
  website?: string | null;
  plan: string;
  is_admin: boolean;  // From JWT payload — cannot be self-assigned
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  accessToken: string | null;
  onboardingToken: string | null;
  login: (email: string, otp: string) => Promise<{ status: string; onboarding_token?: string } | void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  completeOnboarding: (onboardingRequest: any) => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  sendOTP: (email: string) => Promise<{ status: string; message?: string } | void>;
  logout: () => Promise<void>;
  validateSession: (allowRefresh?: boolean) => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [onboardingToken, setOnboardingToken] = useState<string | null>(null);

  // Auto-check session on mount
  // This is heavily required for Google OAuth since the flow relies on a cross-domain 
  // redirect that resets React state, and we need to validate cookies.
  useEffect(() => {
    checkSession();
  }, []);

  // Set Authorization header whenever accessToken changes
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [accessToken]);

  // Proactive token refresh — rotate the access token 3 minutes before its 15-minute
  // expiry so it never goes stale during an active session.  Using setTimeout (not
  // setInterval) means each successful refresh reschedules itself via the accessToken
  // dependency, creating a self-renewing chain that stays alive as long as the user
  // is logged in.  This eliminates the most common cause of unexpected mid-session
  // logouts: the 401 interceptor firing when the token quietly expires between requests.
  useEffect(() => {
    if (!accessToken) return;

    const PROACTIVE_REFRESH_MS = 12 * 60 * 1000; // refresh at minute 12 of a 15-min token
    const timer = setTimeout(async () => {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessToken(newToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        }
      } catch {
        // Proactive refresh failed (network blip, server restart, etc.).
        // Do NOT log the user out here — their cookies may still be valid.
        // The 401 interceptor in api.ts is the fallback for the next API call.
      }
    }, PROACTIVE_REFRESH_MS);

    return () => clearTimeout(timer);
  }, [accessToken]);

  const checkSession = async () => {
    // Do NOT abort the refresh request on timeout — aborting destroys the Set-Cookie
    // header in the response. If the server rotates the refresh token (deletes the old
    // one from Redis) but the client aborts before receiving the new cookie, the user
    // is permanently locked out with no valid refresh token in their browser.
    //
    // Instead: let the fetch run to completion but show the login UI after 10s so we
    // don't freeze a cold-start. If the response eventually arrives it still sets the
    // cookie and updates state via the `then` chain below.
    let settled = false;
    const refreshPromise = refreshAccessToken().then(async (newToken) => {
      if (newToken) {
        setAccessToken(newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        try {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data);
        } catch {
          // Profile fetch failed but token is valid — non-fatal
        }
      }
    }).catch(() => {
      // No valid session (401) or network error — clear state
      setUser(null);
      setAccessToken(null);
    }).finally(() => {
      settled = true;
      setIsLoading(false);
    });

    // After 10s, unblock the UI even if the backend is still responding.
    // The refreshPromise continues in the background and will still set cookies/state.
    await Promise.race([
      refreshPromise,
      new Promise<void>(resolve => setTimeout(() => {
        if (!settled) {
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
        }
        resolve();
      }, 10000)),
    ]);
  };

  const sendOTP = useCallback(async (email: string) => {
    setError(null);
    try {
      const res = await api.post('/auth/otp/send', { email });
      if (res.data?.status === 'password_required') {
        return res.data;
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Could not send verification code. Please try again.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const login = useCallback(async (email: string, otp: string) => {
    setError(null);
    try {
      const res = await api.post('/auth/otp/verify', { email, otp });
      
      // Handle new user onboarding flow
      if (res.data.status === 'new_user' && res.data.onboarding_token) {
        setOnboardingToken(res.data.onboarding_token);
        return { status: 'new_user', onboarding_token: res.data.onboarding_token };
      }
      
      // Store token early so we can fetch full profile
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        
        try {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data);
        } catch (meErr) {
          console.error("Failed to fetch full profile during login");
        }
      }
      return { status: 'logged_in' };
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Invalid verification code. Please try again.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.post('/auth/password/verify', { email, password });
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        
        try {
          const meRes = await api.get('/auth/me');
          setUser(meRes.data);
        } catch (meErr) {
          console.error("Failed to fetch full profile during password login");
        }
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Invalid email or password.';
      setError(message);
      throw new Error(message);
    }
  }, []);


  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if logout API fails, clear local session (server will invalidate on next request)
    }
    
    // ALWAYS clear local state and token, regardless of API response
    setUser(null);
    setAccessToken(null);
    setOnboardingToken(null);
    delete api.defaults.headers.common['Authorization'];
    
    // Also clear cookies locally (in case backend didn't send clear-cookie header)
    // This ensures cookies are gone even if response is intercepted
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=none; secure;';
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=none; secure;';
  }, []);

  const completeOnboarding = useCallback(async (onboardingRequest: any) => {
    setError(null);
    try {
      const res = await api.post('/auth/complete-onboarding', onboardingRequest);
      
      // Store token
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      }
      
      // Clear onboarding token now that onboarding is complete
      setOnboardingToken(null);
      
      try {
        const meRes = await api.get('/auth/me');
        setUser(meRes.data);
      } catch (meErr) {
        console.error("Failed to fetch full profile during onboarding completion");
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to complete onboarding. Please try again.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateProfile = useCallback(async (profileData: any) => {
    setError(null);
    try {
      const res = await api.put('/auth/profile', profileData);
      setUser(res.data);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to update profile. Please try again.';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const validateSession = useCallback(async (allowRefresh: boolean = false): Promise<boolean> => {
    try {
      if (allowRefresh) {
        // Explicit refresh: user clicked "Stay logged in" or similar
        const res = await api.post('/auth/token/refresh');
        if (res.data?.access_token) {
          setAccessToken(res.data.access_token);
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
          try {
            const meRes = await api.get('/auth/me');
            setUser(meRes.data);
            return true;
          } catch (e) {
            return false;
          }
        }
      } else {
        // Just validate without refreshing (checks if session in Redis is still valid)
        const res = await api.post('/auth/validate-session');
        return res.status === 200;
      }
      return false;
    } catch {
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: Boolean(user?.is_admin),
        accessToken,
        onboardingToken,
        login,
        loginWithPassword,
        completeOnboarding,
        updateProfile,
        sendOTP,
        logout,
        validateSession,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Decode JWT payload (base64) without verifying signature.
 * NOTE: This is ONLY used for UX display — the API verifies the signature on every request.
 * Never use this for security decisions. (Section 7.1 comment)
 */
function _decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1];
    const decoded = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
