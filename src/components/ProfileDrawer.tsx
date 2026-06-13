'use client';

import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_ICONS: Record<string, string> = {
  'Full Name': 'person',
  'Email': 'mail',
  'Phone Number': 'call',
  'Designation': 'badge',
  'Organization': 'business',
  'Organization Type': 'category',
  'State of Operations': 'location_on',
  'Website': 'language',
};

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
    .map((n: string) => n[0])
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
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');

  const isPro = user.plan === 'pro';
  const isEnterprise = user.plan === 'enterprise';

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: 'rgba(0, 32, 25, 0.30)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="absolute inset-y-0 right-0 w-full max-w-sm flex flex-col animate-slide-left shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#f5fff7', borderLeft: '1px solid #bccac1' }}
      >
        {/* ── Hero Banner ─────────────────────────────────── */}
        <div
          className="relative flex-shrink-0 px-6 pt-5 pb-6"
          style={{
            background: 'linear-gradient(135deg, #002019 0%, #003d2e 60%, #005a41 100%)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #00ff99 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #00cc77 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          {/* Close button */}
          <div className="flex justify-end mb-4 relative z-10">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full transition-colors"
              style={{ color: '#bbfbe6' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(187,251,230,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-3">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full opacity-40 blur-md"
                style={{ backgroundColor: '#00cc77', transform: 'scale(1.1)' }} />
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                style={{
                  background: 'linear-gradient(135deg, #008560 0%, #00cc77 100%)',
                  borderColor: 'rgba(187,251,230,0.5)',
                  color: '#f5fff7',
                  fontFamily: 'var(--font-syne)',
                }}
              >
                {initials}
              </div>
            </div>

            <h3
              className="text-lg font-bold text-white mb-0.5"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {user.name || 'User'}
            </h3>
            <p className="text-sm mb-3" style={{ color: '#a3d9c4', fontFamily: 'var(--font-syne)' }}>
              {user.email}
            </p>

            {/* Plan badge */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: isEnterprise
                  ? 'rgba(168,85,247,0.25)'
                  : isPro
                  ? 'rgba(59,130,246,0.25)'
                  : 'rgba(0,133,96,0.35)',
                color: isEnterprise ? '#e9d5ff' : isPro ? '#bfdbfe' : '#bbfbe6',
                border: `1px solid ${isEnterprise ? 'rgba(168,85,247,0.4)' : isPro ? 'rgba(59,130,246,0.4)' : 'rgba(0,204,119,0.4)'}`,
                fontFamily: 'var(--font-dm-mono)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                {isEnterprise ? 'workspace_premium' : isPro ? 'verified' : 'eco'}
              </span>
              {isEnterprise ? 'Enterprise' : isPro ? 'Pro' : 'Free'} Plan
            </span>
          </div>
        </div>

        {/* ── Fields ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-1"
            style={{ color: '#3d4943', fontFamily: 'var(--font-dm-mono)' }}
          >
            Profile Details
          </p>

          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 px-4 py-3 rounded-xl transition-colors group"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d4ede2',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#edfff5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: '#e6fff5' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#008560' }}>
                    {FIELD_ICONS[field.label] ?? 'info'}
                  </span>
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] uppercase tracking-wide mb-0.5"
                    style={{ color: '#6b8f7a', fontFamily: 'var(--font-dm-mono)' }}
                  >
                    {field.label}
                  </p>
                  <p
                    className="text-sm font-medium break-all"
                    style={{ color: '#002019', fontFamily: 'var(--font-syne)' }}
                  >
                    {field.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div
          className="px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #bccac1', backgroundColor: '#edfff6' }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #fff1f1 0%, #ffe4e4 100%)',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              fontFamily: 'var(--font-syne)',
              fontSize: '14px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
              e.currentTarget.style.borderColor = '#f87171';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #fff1f1 0%, #ffe4e4 100%)';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
