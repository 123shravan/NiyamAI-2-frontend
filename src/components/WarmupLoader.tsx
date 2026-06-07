'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function WarmupLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    let pingTimeout: NodeJS.Timeout | null = null;

    const doPing = async () => {
      const start = Date.now();
      try {
        await api.get('/health/ping');
        const elapsed = Date.now() - start;
        if (mounted && elapsed > 2000) {
          // server responded but slow — show warmup UI and trigger warmup
          setShow(true);
          // Trigger warmup in background
          api.get('/health/warmup').catch(() => {});
        }
        if (mounted && elapsed <= 2000) {
          setShow(false);
        }
      } catch (err) {
        // No response — show UI and trigger warmup
        if (mounted) {
          setShow(true);
          api.get('/health/warmup').catch(() => {});
        }
      }

      // Poll ping every 3s until healthy
      const poll = async () => {
        try {
          await api.get('/health/ping');
          if (mounted) setShow(false);
        } catch {
          if (mounted) setShow(true);
          if (pingTimeout) clearTimeout(pingTimeout as any);
          pingTimeout = setTimeout(poll, 3000);
        }
      };

      // Start short delay before polling
      pingTimeout = setTimeout(poll, 3000);
    };

    // Start initial ping but don't block UI
    doPing();

    return () => {
      mounted = false;
      if (pingTimeout) clearTimeout(pingTimeout as any);
    };
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071021]">
      <div className="max-w-lg w-full p-8 rounded-xl text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#8b5cf6] flex items-center justify-center shadow-2xl animate-spin [animation-duration:6s]">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
          </div>

          <h2 className="text-white text-2xl font-semibold">Niyam AI</h2>

          <p className="text-slate-200 animate-pulse">Starting compliance engine... Loading EPR framework...</p>

          <p className="text-slate-400 text-sm mt-2">This may take a few seconds. We&apos;ll notify you when ready.</p>
        </div>
      </div>
    </div>
  );
}
