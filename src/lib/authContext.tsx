'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

// L3 — User type includes is_admin flag read from JWT payload
// This is used ONLY for UX (showing/hiding admin UI).
// Real security enforcement is on the backend (L1–L4). (Section 7.3)
interface User {
  id: string;
  email: string;
  name: string | null;
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
  completeOnboarding: (onboardingRequest: any) => Promise<void>;
  sendOTP: (email: string) => Promise<void>;
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

  const checkSession = async () => {
    try {
      const res = await api.post('/auth/token/refresh');
      if (res.data?.access_token) {
        // Store token in state and axios headers
        setAccessToken(res.data.access_token);
        
        // Decode JWT payload to get user info including is_admin
        const payload = _decodeJwtPayload(res.data.access_token);
        if (payload) {
          setUser({
            id: res.data.user?.id || payload.sub || '',
            email: res.data.user?.email || payload.email || '',
            name: null,
            plan: 'free',
            is_admin: Boolean(res.data.user?.is_admin ?? payload.is_admin ?? false),
          });
        }
      }
    } catch {
      // No valid session
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = useCallback(async (email: string) => {
    setError(null);
    try {
      await api.post('/auth/otp/send', { email });
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
      
      // Handle existing user login
      const userData = res.data.user;
      
      // Store token
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      }
      
      setUser({
        id: userData.id || '',
        email: userData.email || email,
        name: userData.name || null,
        plan: userData.plan || 'free',
        is_admin: Boolean(userData.is_admin ?? false),  // From backend DB, not user input
      });
      return { status: 'logged_in' };
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Invalid verification code. Please try again.';
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
      const userData = res.data.user;
      
      // Store token
      if (res.data.access_token) {
        setAccessToken(res.data.access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      }
      
      // Clear onboarding token now that onboarding is complete
      setOnboardingToken(null);
      
      setUser({
        id: userData.id || '',
        email: userData.email || '',
        name: userData.name || null,
        plan: userData.plan || 'free',
        is_admin: Boolean(userData.is_admin ?? false),
      });
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to complete onboarding. Please try again.';
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
          const payload = _decodeJwtPayload(res.data.access_token);
          if (payload && res.data.user) {
            setUser({
              id: res.data.user.id || payload.sub || '',
              email: res.data.user.email || payload.email || '',
              name: null,
              plan: 'free',
              is_admin: Boolean(res.data.user.is_admin ?? payload.is_admin ?? false),
            });
            return true;
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
        completeOnboarding,
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
