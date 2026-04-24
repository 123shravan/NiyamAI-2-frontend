'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function BackendWakeup() {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const wakeup = async () => {
      // Start checking if backend is alive
      setIsWakingUp(true);
      
      const startTime = Date.now();
      let attempts = 0;
      const maxAttempts = 20; // Try for about 40 seconds
      
      const checkPing = async () => {
        try {
          const res = await api.get('/health/ping');
          if (res.data?.status === 'ok') {
            setIsReady(true);
            setIsWakingUp(false);
            return true;
          }
        } catch (err) {
          // Expected failure if backend is sleeping
          console.log('Backend waking up...', err);
        }
        return false;
      };

      // Initial check
      const ready = await checkPing();
      if (ready) return;

      // Retry loop
      const interval = setInterval(async () => {
        attempts++;
        const ready = await checkPing();
        if (ready || attempts >= maxAttempts) {
          clearInterval(interval);
          setIsWakingUp(false);
        }
      }, 2000);

      return () => clearInterval(interval);
    };

    wakeup();
  }, []);

  if (!isWakingUp) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm">
          <p className="text-white font-medium">Waking up server...</p>
          <p className="text-slate-400 text-xs">This may take a moment on first load.</p>
        </div>
      </div>
    </div>
  );
}
