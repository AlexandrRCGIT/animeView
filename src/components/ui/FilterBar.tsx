'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { ANIME_GENRES, SORT_OPTIONS } from '@/lib/api/anilist';

export type ViewMode = 'grid' | 'list';

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort  = searchParams.get('sort') ?? '';
  const currentGenre = searchParams.get('genre') ?? '';
  const currentView  = (searchParams.get('view') ?? 'grid') as ViewMode;

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // При смене фильтра/сортировки — сбрасываем на первую страницу
      if (key !== 'view') params.delete('page');
      router.replace(`${pathname}?${params}`);
    },
    [router, pathname, searchParams]
  );

  function toggleGenre(value: string) {
    update('genre', currentGenre === value ? null : value);
  }

  function toggleSort(value: string) {
    update('sort', currentSort === value ? null : value);
  }

  function toggleView(value: ViewMode) {
    update('view', value);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Строка: вид + сортировка */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Переключатель вида */}
        <div className="flex items-center rounded-lg overflow-hidden border border-zinc-700 flex-none">
          <button
            onClick={() => toggleView('grid')}
            title="Сетка"
            className={`flex items-center justify-center px-3 py-2 transition-colors ${
              currentView === 'grid'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <GridIcon />
          </button>
          <button
            onClick={() => toggleView('list')}
            title="Список"
            className={`flex items-center justify-center px-3 py-2 transition-colors ${
              currentView === 'list'
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <ListIcon />
          </button>
        </div>

        <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

        {/* Кнопки сортировки */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleSort(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                currentSort === opt.value
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Жанры — горизонтальный скролл */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {ANIME_GENRES.map((genre) => (
          <button
            key={genre.value}
            onClick={() => toggleGenre(genre.value)}
            className={`flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors border whitespace-nowrap ${
              currentGenre === genre.value
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {genre.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="3" rx="1" />
      <rect x="1" y="7" width="14" height="3" rx="1" />
      <rect x="1" y="12" width="14" height="3" rx="1" />
    </svg>
  );
}
