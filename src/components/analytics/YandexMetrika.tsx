'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, Suspense } from 'react';

const YM_ID = 108380633;

declare global {
  interface Window {
    ym?: (id: number, action: string, url?: string, params?: object) => void;
  }
}

function YandexMetrikaInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.ym?.(YM_ID, 'hit', url);
  }, [pathname, searchParams]);

  return null;
}

export function YandexMetrika() {
  return (
    <Suspense fallback={null}>
      <YandexMetrikaInner />
    </Suspense>
  );
}
