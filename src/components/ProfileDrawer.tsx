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
    { label: 'Website', value: user.website }
  ];

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col animate-slide-left">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Your Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">{user.name || 'User'}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                {user.plan === 'enterprise' ? 'Enterprise Plan' : 'Free Plan'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile Details</h4>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
              {fields.map((field, idx) => (field.value !== undefined && field.value !== null && field.value !== '') ? (
                <div key={idx} className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">{field.label}</span>
                  <span className="text-sm font-medium text-slate-800">{field.value}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
