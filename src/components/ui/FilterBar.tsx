'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { ANIME_GENRES, SORT_OPTIONS } from '@/lib/api/anilist';
import { MultiSelect } from './MultiSelect';

export type ViewMode = 'grid' | 'list';

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort    = searchParams.get('sort') ?? '';
  const currentGenres  = searchParams.getAll('genre');
  const currentYear    = searchParams.get('year') ?? '';
  const currentSeason  = searchParams.get('season') ?? '';
  const currentStatus  = searchParams.get('status') ?? '';
  const currentView    = (searchParams.get('view') ?? 'grid') as ViewMode;

  const SEASONS = [
    { value: 'WINTER', label: 'Зима' },
    { value: 'SPRING', label: 'Весна' },
    { value: 'SUMMER', label: 'Лето' },
    { value: 'FALL',   label: 'Осень' },
  ];

  const years = Array.from(
    { length: new Date().getFullYear() - 1959 },
    (_, i) => new Date().getFullYear() - i
  );

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== 'view') params.delete('page');
      router.replace(`${pathname}?${params}`);
    },
    [router, pathname, searchParams]
  );

  function toggleSort(value: string) {
    update('sort', currentSort === value ? null : value);
  }

  function toggleView(value: ViewMode) {
    update('view', value);
  }

  function setGenres(values: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('genre');
    for (const v of values) params.append('genre', v);
    params.delete('page');
    router.replace(`${pathname}?${params}`);
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

      {/* Фильтры: жанр/тег, год, сезон */}
      <div className="flex items-start gap-2 flex-wrap">
        <MultiSelect
          options={ANIME_GENRES}
          selected={currentGenres}
          onChange={setGenres}
        />

        <select
          value={currentYear}
          onChange={(e) => update('year', e.target.value || null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-zinc-800 cursor-pointer outline-none ${
            currentYear
              ? 'border-violet-500 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
          }`}
        >
          <option value="">Любой год</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={currentSeason}
          onChange={(e) => update('season', e.target.value || null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-zinc-800 cursor-pointer outline-none ${
            currentSeason
              ? 'border-violet-500 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
          }`}
        >
          <option value="">Любой сезон</option>
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={currentStatus}
          onChange={(e) => update('status', e.target.value || null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors bg-zinc-800 cursor-pointer outline-none ${
            currentStatus
              ? 'border-violet-500 text-white'
              : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
          }`}
        >
          <option value="">Любой статус</option>
          <option value="RELEASING">Онгоинг</option>
          <option value="FINISHED">Завершён</option>
          <option value="NOT_YET_RELEASED">Анонс</option>
          <option value="CANCELLED">Отменён</option>
        </select>
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
