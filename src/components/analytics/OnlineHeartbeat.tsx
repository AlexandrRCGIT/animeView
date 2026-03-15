'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL_MS = 30_000;

async function sendHeartbeat(path: string) {
  try {
    await fetch('/api/online/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      cache: 'no-store',
      keepalive: true,
    });
  } catch {
    // no-op
  }
}

export function OnlineHeartbeat() {
  const pathname = usePathname() || '/';
  const pathRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pathRef.current = pathname;
    void sendHeartbeat(pathname);
  }, [pathname]);

  useEffect(() => {
    function stopTimer() {
      if (!timerRef.current) return;
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    function startTimer() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        void sendHeartbeat(pathRef.current);
      }, HEARTBEAT_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat(pathRef.current);
        startTimer();
      } else {
        stopTimer();
      }
    }

    function onFocus() {
      if (document.visibilityState !== 'visible') return;
      void sendHeartbeat(pathRef.current);
    }

    if (document.visibilityState === 'visible') {
      startTimer();
      void sendHeartbeat(pathRef.current);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
