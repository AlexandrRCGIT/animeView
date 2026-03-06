'use client';

import { useState, useRef, useEffect } from 'react';
import type { Genre } from '@/lib/api/shikimori';

interface MultiSelectProps {
  options: Genre[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Жанр / Тег',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const q = search.toLowerCase();
  const filtered = options.filter(
    (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
  );
  const genres = filtered.filter((o) => o.type === 'genre');

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  const hasSelected = selected.length > 0;

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      {/* Кнопка-триггер */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-zinc-800 cursor-pointer outline-none ${
          hasSelected
            ? 'border-violet-500 text-white'
            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
        }`}
      >
        {hasSelected ? `Выбрано: ${selected.length}` : placeholder}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Выпадающий список */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-80">
          {/* Поиск */}
          <div className="p-2 border-b border-zinc-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              autoFocus
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-white placeholder-zinc-500 outline-none border border-zinc-700 focus:border-violet-500"
            />
          </div>

          {/* Список жанров */}
          <div className="overflow-y-auto flex-1">
            {genres.length > 0 ? (
              genres.map((g) => (
                <OptionRow
                  key={g.value}
                  label={g.label}
                  checked={selected.includes(g.value)}
                  onToggle={() => toggle(g.value)}
                />
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-zinc-500 text-center">
                Ничего не найдено
              </p>
            )}
          </div>

          {/* Сброс */}
          {hasSelected && (
            <div className="border-t border-zinc-800 p-2">
              <button
                onClick={() => onChange([])}
                className="w-full text-xs text-zinc-400 hover:text-white py-1 transition-colors"
              >
                Сбросить всё
              </button>
            </div>
          )}
        </div>
      )}

      {/* Чипы выбранных */}
      {hasSelected && (
        <div className="flex flex-wrap gap-1">
          {selected.map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span
                key={val}
                className="flex items-center gap-1 bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs px-2 py-0.5 rounded-full"
              >
                {opt?.label ?? val}
                <button
                  onClick={() => toggle(val)}
                  className="hover:text-white leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OptionRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-zinc-800 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="accent-violet-500 w-3.5 h-3.5 flex-none"
      />
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
  );
}
