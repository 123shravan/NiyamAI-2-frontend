'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!isOpen || !user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    onClose();
  };

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const fields = [
    { label: 'Full Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Phone Number', value: user.phone },
    { label: 'Designation', value: user.designation },
    { label: 'Organization', value: user.org_name },
    { label: 'Organization Type', value: user.org_type },
    { label: 'State of Operations', value: user.state },
    { label: 'Website', value: user.website },
  ];

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0, 32, 25, 0.25)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="absolute inset-y-0 right-0 w-full max-w-sm flex flex-col animate-slide-left shadow-2xl"
        style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #bccac1' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid #bccac1', backgroundColor: '#e6fff5' }}
        >
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-instrument-serif)', color: '#002019', fontSize: '22px' }}
          >
            Your Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors"
            style={{ color: '#3d4943' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#bbfbe6')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar + name row */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                backgroundColor: '#008560',
                color: '#f5fff7',
                fontFamily: 'var(--font-syne)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h3
                className="font-bold text-lg truncate"
                style={{ color: '#002019', fontFamily: 'var(--font-syne)' }}
              >
                {user.name || 'User'}
              </h3>
              <p
                className="text-sm truncate"
                style={{ color: '#3d4943', fontFamily: 'var(--font-syne)' }}
              >
                {user.email}
              </p>
              <span
                className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: '#bbfbe6',
                  color: '#008560',
                  fontFamily: 'var(--font-dm-mono)',
                }}
              >
                {user.plan === 'enterprise' ? 'Enterprise Plan' : 'Free Plan'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #bccac1' }} />

          {/* Profile details */}
          <div className="space-y-1">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#3d4943', fontFamily: 'var(--font-dm-mono)' }}
            >
              Profile Details
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid #bccac1' }}
            >
              {fields
                .filter(f => f.value !== undefined && f.value !== null && f.value !== '')
                .map((field, idx, arr) => (
                  <div
                    key={idx}
                    className="px-5 py-3 flex flex-col gap-0.5"
                    style={{
                      borderBottom: idx < arr.length - 1 ? '1px solid #bccac1' : 'none',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f5fff7',
                    }}
                  >
                    <span
                      className="text-[11px] uppercase tracking-wide"
                      style={{ color: '#3d4943', fontFamily: 'var(--font-dm-mono)' }}
                    >
                      {field.label}
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: '#002019', fontFamily: 'var(--font-syne)' }}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer — Sign Out */}
        <div
          className="p-5 flex-shrink-0"
          style={{ borderTop: '1px solid #bccac1', backgroundColor: '#e6fff5' }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all active:scale-95"
            style={{
              border: '1px solid #f87171',
              color: '#dc2626',
              backgroundColor: '#ffffff',
              fontFamily: 'var(--font-syne)',
              fontSize: '14px',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
