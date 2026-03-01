'use client';

import { useState } from 'react';
import { setThemeAccent } from '@/app/actions/settings';

const ACCENTS = [
  { color: '#6C3CE1', label: 'Фиолетовый' },
  { color: '#3C7EE1', label: 'Синий' },
  { color: '#3CE1A8', label: 'Изумрудный' },
  { color: '#E13C6E', label: 'Розовый' },
  { color: '#E1913C', label: 'Оранжевый' },
];

interface Props {
  current: string;
}

export function ThemePicker({ current }: Props) {
  const [active, setActive] = useState(current);

  async function handlePick(color: string) {
    setActive(color);
    document.documentElement.style.setProperty('--accent', color);
    document.body.style.setProperty('--accent', color);
    await setThemeAccent(color);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-zinc-400">Акцентный цвет</label>
      <div className="flex gap-3 flex-wrap">
        {ACCENTS.map(({ color, label }) => (
          <button
            key={color}
            onClick={() => handlePick(color)}
            title={label}
            className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{
              background: color,
              boxShadow: active === color ? `0 0 0 3px rgba(255,255,255,0.9)` : 'none',
            }}
          >
            {active === color && (
              <svg
                className="absolute inset-0 m-auto"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
