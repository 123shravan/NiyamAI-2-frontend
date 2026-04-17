'use client';

/**
 * AdminGuard — In-page React guard for admin portal pages.
 * L5 — Frontend Route Guard (secondary, in-page check). (Section 7.2)
 *
 * This is a secondary check inside React — the Next.js middleware (middleware.ts) is the
 * primary server-side guard. AdminGuard handles the case where client-side navigation
 * bypasses the middleware (e.g., direct state manipulation in React).
 *
 * Security reminder: Both guards are UX-only. Real security is in L1–L4. (Section 7.3)
 */
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      // Non-admin or unauthenticated — redirect away from admin portal
      router.replace('/dashboard');
    }
  }, [user, isLoading, isAdmin, router]);

  // Render nothing while checking auth state or if not admin
  if (isLoading || !user?.is_admin) {
    return (
      <div className="admin-guard-loading">
        <div className="admin-guard-spinner" />
        <span>Verifying admin access...</span>
      </div>
    );
  }

  // Only admins see this
  return <>{children}</>;
}
