'use client';

import { useAuth } from '@/lib/authContext';
import { useState } from 'react';
import ProfileDrawer from './ProfileDrawer';

export default function UserProfileAvatar() {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!user) return null;

  const initials = (user.name || user.email || '?')
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Pick a stable color based on email length/characters
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 
    'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-rose-500'
  ];
  let charCodeSum = 0;
  for (let i = 0; i < (user.email?.length || 0); i++) {
    charCodeSum += user.email!.charCodeAt(i);
  }
  const colorIndex = charCodeSum % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <>
      <button 
        onClick={() => setIsDrawerOpen(true)}
        className={`w-9 h-9 rounded-full ${bgColor} flex items-center justify-center text-white font-semibold text-sm shadow-sm hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all focus:outline-none`}
        title={user.email}
      >
        {initials || '?'}
      </button>

      <ProfileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
}
