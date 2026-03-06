'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface BackButtonProps {
  floating?: boolean;
}

export function BackButton({ floating = false }: BackButtonProps) {
  const router = useRouter();
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }, [router]);

  if (floating) {
    return (
      <button
        onClick={goBack}
        aria-label="Назад"
        className="fixed top-20 left-4 z-[70] h-10 px-3 rounded-xl border border-zinc-700/80 bg-zinc-950/80 backdrop-blur-md text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5 shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Назад</span>
      </button>
    );
  }

  return (
    <button
      onClick={goBack}
      className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      Назад
    </button>
  );
}
