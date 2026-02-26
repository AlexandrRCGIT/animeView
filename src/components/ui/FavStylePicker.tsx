'use client';

import { useState, useTransition } from 'react';
import { setFavStyle, type FavStyle } from '@/app/actions/settings';

interface Props {
  value: FavStyle;
}

const OPTIONS: { value: FavStyle; label: string; desc: string; preview: React.ReactNode }[] = [
  {
    value: 'icon',
    label: 'Иконка на постере',
    desc: 'Сердечко появляется при наведении на обложку',
    preview: (
      <div className="relative w-10 h-14 rounded bg-zinc-700 flex-none">
        <div className="absolute bottom-1 right-1 w-5 h-5 rounded bg-black/70 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </div>
      </div>
    ),
  },
  {
    value: 'button',
    label: 'Кнопка на странице',
    desc: 'Кнопка «В избранное» всегда видна под постером',
    preview: (
      <div className="flex-none px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <span className="text-[10px] text-zinc-400">В избранное</span>
      </div>
    ),
  },
];

export function FavStylePicker({ value }: Props) {
  const [current, setCurrent] = useState<FavStyle>(value);
  const [, startTransition] = useTransition();

  const handleSelect = (style: FavStyle) => {
    if (style === current) return;
    setCurrent(style);
    startTransition(() => setFavStyle(style));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`flex-1 flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
              active
                ? 'border-violet-500 bg-violet-600/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            {opt.preview}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${active ? 'text-violet-300' : 'text-zinc-200'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center ${
              active ? 'border-violet-500' : 'border-zinc-600'
            }`}>
              {active && <div className="w-2 h-2 rounded-full bg-violet-500" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
