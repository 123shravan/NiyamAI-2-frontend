'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const { sendOTP, login, error, clearError, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Redirect if already authenticated (moved to useEffect to avoid render-time redirects)
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Handle Google OAuth error redirect
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'google_auth_failed') {
      setGoogleError('Could not complete sign-in with Google. Please try again.');
      // Clean the URL without reloading
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    clearError();
    setGoogleError(null);

    try {
      await sendOTP(email);
      setStep('otp');
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
      const result = await login(email, otp);
      
      // Check if user is new and needs onboarding
      if (result && result.status === 'new_user' && result.onboarding_token) {
        router.push('/onboard');
        return;
      }
      
      // Existing user logged in successfully
      router.push('/dashboard');
    } catch {
      // Error is set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and tagline */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Niyam AI</h1>
          <p className="text-blue-200 text-sm">
            Indian Environmental Law Intelligence
          </p>
        </div>

        {/* Login Card */}
        <div className="card-glass p-8 shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {step === 'email' && (
            <div className="mb-6 rounded-xl bg-slate-100 p-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  authMode === 'signin'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  authMode === 'signup'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          <h2 className="text-xl font-semibold text-slate-800 mb-1">
            {step === 'email'
              ? authMode === 'signin'
                ? 'Welcome back'
                : 'Create your account'
              : 'Enter Verification Code'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {step === 'email'
              ? authMode === 'signin'
                ? 'Sign in to access compliance guidance for PWM Rules.'
                : 'Verify your email to start onboarding and create your account.'
              : `We sent a 6-digit code to ${email}.`
            }
          </p>

          {/* Error message */}
          {(error || googleError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error || googleError}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOTP}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@company.com"
                  className="w-full px-4 py-3 input-focus text-slate-800 bg-white placeholder:text-slate-400"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full btn-primary py-3.5 text-base"
              >
                {isSubmitting
                  ? 'Sending code...'
                  : authMode === 'signin'
                    ? 'Send Sign-In Code'
                    : 'Send Sign-Up Code'}
              </button>
              <p className="text-xs text-slate-500 mt-3 text-center">
                {authMode === 'signin'
                  ? 'New users can switch to Sign Up above.'
                  : 'After verification, you will complete your profile in one quick step.'}
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 input-focus text-center text-2xl tracking-[0.5em] font-mono text-slate-800 bg-white"
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
                className="w-full py-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                Use a different email
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('authIntent', 'google');
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google`;
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-300/60 text-xs mt-6">
          © 2026 Niyam AI · Indian Environmental Law Intelligence Platform
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
