'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter, useSearchParams } from 'next/navigation';

type WarmupState = 'checking' | 'warming' | 'ready';

// Typing this in the email field routes to the admin login portal
const ADMIN_PORTAL_KEY = 'NIYAM_CTRL';

function LoginContent() {
  const { sendOTP, login, loginWithPassword, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [warmup, setWarmup] = useState<WarmupState>('checking');
  const warmupRef = useRef(false);

  useEffect(() => {
    if (warmupRef.current) return;
    warmupRef.current = true;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      attempts++;
      // Only show the "Server starting..." banner after 5 consecutive failures (~10s).
      // A healthy-but-busy server occasionally returns slowly — we don't want to
      // falsely block the login button for returning users on every page load.
      if (attempts === 5) setWarmup('warming');

      try {
        // Use /health/ping — it's instant (no Redis/DB calls) so it never
        // returns a false 503 due to backend load. /health/auth-ready makes
        // live network calls on every poll and can appear "not ready" under load.
        const res = await fetch(`${backendUrl}/health/ping`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          setWarmup('ready');
          return;
        }
      } catch {
        // Backend not yet reachable — keep polling
      }

      if (attempts < 45) {
        timer = setTimeout(check, 2000);
      } else {
        setWarmup('ready');
      }
    };

    check();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (
      errorParam === 'google_auth_failed' ||
      errorParam === 'oauth_state_invalid' ||
      errorParam === 'oauth_state_missing'
    ) {
      setGoogleError('Could not complete sign-in with Google. Please try again.');
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (email.trim() === ADMIN_PORTAL_KEY) {
      router.push('/admin-login');
      return;
    }

    setIsSubmitting(true);
    clearError();
    setGoogleError(null);

    try {
      const res = await sendOTP(email.trim().toLowerCase());
      if (res && res.status === 'password_required') {
        setStep('password');
      } else {
        setStep('otp');
      }
    } catch {
      // Error is set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const result = await login(email.trim().toLowerCase(), otp);
      if (result && result.status === 'new_user' && result.onboarding_token) {
        router.push('/onboard');
        return;
      }
      router.push('/dashboard');
    } catch {
      // Error is set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    clearError();

    try {
      await loginWithPassword(email, password);
      router.push('/admin');
    } catch {
      // Error is set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle =
    step === 'email'
      ? authMode === 'signin'
        ? 'Welcome Back'
        : 'Join Niyam AI'
      : step === 'otp'
      ? 'Verify Your Email'
      : 'Admin Sign In';

  const headerSubtitle =
    step === 'email'
      ? authMode === 'signin'
        ? 'Sign in to access your compliance dashboard.'
        : 'Create your account with a one-time verification code.'
      : step === 'otp'
      ? `We sent a 6-digit code to ${email}.`
      : `Enter the admin password for ${email}.`;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #f0fdf9 0%, #e6fff5 50%, #f0fdf9 100%)' }}
    >
      {/* Subtle decorative blurs */}
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(0, 133, 96, 0.08)' }} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(0, 105, 76, 0.06)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Backend warm-up banner */}
        {warmup === 'warming' && (
          <div
            className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm animate-fade-in-up border"
            style={{ backgroundColor: '#e6fff5', borderColor: '#008560', color: '#00694c' }}
          >
            <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>Server is starting up — this takes about 30 seconds on first visit. Please wait…</span>
          </div>
        )}

        {/* Login Card */}
        <div className="rounded-3xl overflow-hidden shadow-xl animate-fade-in-up" style={{ animationDelay: '0.1s', border: '1px solid #c9ffec' }}>
          {/* Green Gradient Header */}
          <div
            className="px-8 pt-8 pb-7 text-center"
            style={{ background: 'linear-gradient(135deg, #00694c 0%, #008560 100%)' }}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
              style={{ backgroundColor: 'rgba(201, 255, 236, 0.25)', backdropFilter: 'blur(8px)' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{headerTitle}</h1>
            <p className="text-sm" style={{ color: '#c9ffec' }}>{headerSubtitle}</p>
          </div>

          {/* White Card Body */}
          <div className="bg-white px-8 py-6">
            {/* Sign In / Sign Up Tabs */}
            {step === 'email' && (
              <div className="mb-6 rounded-xl p-1 grid grid-cols-2 gap-1" style={{ backgroundColor: '#f0fdf9' }}>
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="rounded-lg py-2 text-sm font-medium transition-colors"
                  style={
                    authMode === 'signin'
                      ? { backgroundColor: 'white', color: '#002019', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                      : { color: '#6d7a73' }
                  }
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="rounded-lg py-2 text-sm font-medium transition-colors"
                  style={
                    authMode === 'signup'
                      ? { backgroundColor: 'white', color: '#002019', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                      : { color: '#6d7a73' }
                  }
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Error message */}
            {(error || googleError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error || googleError}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendOTP}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@company.com"
                    className="w-full px-4 py-3 input-focus bg-white placeholder:text-slate-400"
                    style={{ color: '#002019' }}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || warmup === 'warming'}
                  className="w-full btn-primary py-3.5 text-base"
                >
                  {isSubmitting
                    ? 'Sending code...'
                    : warmup === 'warming'
                    ? 'Server starting…'
                    : authMode === 'signin'
                    ? 'Send Sign-In Code'
                    : 'Send Sign-Up Code'}
                </button>
                <p className="text-xs mt-3 text-center" style={{ color: '#6d7a73' }}>
                  {authMode === 'signin'
                    ? 'New to Niyam AI? Switch to Sign Up above.'
                    : 'After verification, you will complete your profile in one quick step.'}
                </p>
              </form>
            ) : step === 'otp' ? (
              <form onSubmit={handleVerifyOTP}>
                <div className="mb-4">
                  <label htmlFor="otp" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 input-focus text-center text-2xl tracking-[0.5em] font-mono bg-white"
                    style={{ color: '#002019' }}
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6}
                  className="w-full btn-primary py-3.5 text-base mb-3"
                >
                  {isSubmitting
                    ? 'Verifying...'
                    : authMode === 'signin'
                    ? 'Verify and Sign In'
                    : 'Verify and Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); clearError(); }}
                  className="w-full py-2 text-sm transition-colors"
                  style={{ color: '#6d7a73' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#008560')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6d7a73')}
                >
                  Use a different email
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginWithPassword}>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#002019' }}>
                    Admin Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 input-focus bg-white placeholder:text-slate-400"
                    style={{ color: '#002019' }}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !password.trim()}
                  className="w-full btn-primary py-3.5 text-base mb-3"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In as Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setPassword(''); clearError(); }}
                  className="w-full py-2 text-sm transition-colors"
                  style={{ color: '#6d7a73' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#008560')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6d7a73')}
                >
                  Use a different email
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: '#e6fff5' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 tracking-wider" style={{ color: '#6d7a73' }}>or</span>
              </div>
            </div>

            {/* Google OAuth */}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google`}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all border"
              style={{ color: '#002019', borderColor: '#bccac1', backgroundColor: 'white' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#e6fff5'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'white'; }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#6d7a73' }}>
          © 2026 Niyam AI · Indian Environmental Law Intelligence Platform
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#e6fff5' }}>
          <div className="text-lg" style={{ color: '#002019' }}>Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
