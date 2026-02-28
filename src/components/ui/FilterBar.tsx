'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SHIKIMORI_GENRES, KIND_OPTIONS } from '@/lib/api/shikimori';

export type ViewMode = 'grid' | 'list';

const SORT_OPTIONS = [
  { value: 'popularity', label: 'По популярности' },
  { value: 'ranked',     label: 'По рейтингу' },
  { value: 'aired_on',   label: 'По новизне' },
  { value: 'episodes',   label: 'По эпизодам' },
];

const STATUS_OPTIONS = [
  { value: 'ongoing',  label: 'Онгоинг',  accent: '#3CE1A8' },
  { value: 'released', label: 'Завершён', accent: '#6C3CE1' },
  { value: 'anons',    label: 'Анонс',    accent: '#3C7EE1' },
];

const SEASONS = [
  { value: 'winter', label: 'Зима' },
  { value: 'spring', label: 'Весна' },
  { value: 'summer', label: 'Лето' },
  { value: 'fall',   label: 'Осень' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);

// ─── Main component ────────────────────────────────────────────────────────────

export function FilterBar() {
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();
  const sortRef    = useRef<HTMLDivElement>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const currentSort     = sp.get('sort') || 'popularity';
  const currentGenres   = sp.getAll('genre');
  const currentKinds    = sp.getAll('kind');
  const currentStatus   = sp.get('status') ?? '';
  const currentSeason   = sp.get('season') ?? '';
  const currentYearFrom = sp.get('yearFrom') ?? '';
  const currentYearTo   = sp.get('yearTo')   ?? '';
  const currentView     = (sp.get('view') ?? 'grid') as ViewMode;

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buildQs = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        params.delete(k);
        if (v !== null) {
          Array.isArray(v) ? v.forEach(x => params.append(k, x)) : params.set(k, v);
        }
      }
      params.delete('page');
      return params.toString();
    },
    [sp],
  );

  const push = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      router.replace(`${pathname}?${buildQs(updates)}`);
    },
    [router, pathname, buildQs],
  );

  function toggle(key: string, value: string) {
    push({ [key]: sp.get(key) === value ? null : value });
  }

  function toggleMulti(key: string, current: string[], value: string) {
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    push({ [key]: next.length ? next : null });
  }

  function resetAll() {
    const q = sp.get('q');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('view', currentView);
    router.replace(`${pathname}?${params}`);
  }

  const hasFilters =
    currentGenres.length > 0 || currentKinds.length > 0 ||
    currentStatus || currentSeason || currentYearFrom || currentYearTo;

  type Chip = { key: string; value: string; label: string };
  const activeChips: Chip[] = [
    ...currentGenres.map(v => ({ key: 'genre',    value: v, label: SHIKIMORI_GENRES.find(g => g.value === v)?.label ?? v })),
    ...currentKinds.map(v  => ({ key: 'kind',     value: v, label: KIND_OPTIONS.find(k => k.value === v)?.label ?? v })),
    ...(currentStatus ? [{ key: 'status', value: currentStatus, label: STATUS_OPTIONS.find(s => s.value === currentStatus)?.label ?? currentStatus }] : []),
    ...(currentSeason ? [{ key: 'season', value: currentSeason, label: SEASONS.find(s => s.value === currentSeason)?.label ?? currentSeason }] : []),
    ...(currentYearFrom ? [{ key: 'yearFrom', value: currentYearFrom, label: `от ${currentYearFrom}` }] : []),
    ...(currentYearTo   ? [{ key: 'yearTo',   value: currentYearTo,   label: `до ${currentYearTo}` }] : []),
  ];

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === currentSort)?.label ?? 'По популярности';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Жанры ─────────────────────────────────────────────────────────────── */}
      <Section label="Жанры">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SHIKIMORI_GENRES.map(g => (
            <Chip
              key={g.value}
              label={g.label}
              active={currentGenres.includes(g.value)}
              onClick={() => toggleMulti('genre', currentGenres, g.value)}
            />
          ))}
        </div>
      </Section>

      {/* ── Тип | Статус | Сезон ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <Section label="Тип">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {KIND_OPTIONS.map(k => (
              <Chip
                key={k.value}
                label={k.label}
                active={currentKinds.includes(k.value)}
                onClick={() => toggleMulti('kind', currentKinds, k.value)}
              />
            ))}
          </div>
        </Section>

        <Section label="Статус">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STATUS_OPTIONS.map(s => (
              <Chip
                key={s.value}
                label={s.label}
                active={currentStatus === s.value}
                accent={s.accent}
                onClick={() => toggle('status', s.value)}
              />
            ))}
          </div>
        </Section>

        <Section label="Сезон">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SEASONS.map(s => (
              <Chip
                key={s.value}
                label={s.label}
                active={currentSeason === s.value}
                onClick={() => toggle('season', s.value)}
              />
            ))}
          </div>
        </Section>
      </div>

      {/* ── Год выхода ────────────────────────────────────────────────────────── */}
      <Section label="Год выхода">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <YearSelect
            value={currentYearFrom}
            placeholder="От"
            onChange={v => push({ yearFrom: v || null })}
          />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>—</span>
          <YearSelect
            value={currentYearTo}
            placeholder="До"
            onChange={v => push({ yearTo: v || null })}
          />
        </div>
      </Section>

      {/* ── Активные фильтры + Sort + View ────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Активные теги */}
        {activeChips.map(chip => (
          <button
            key={`${chip.key}:${chip.value}`}
            onClick={() => push({ [chip.key]: null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(108,60,225,0.15)',
              border: '1px solid rgba(108,60,225,0.35)',
              color: '#a78bfa', fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {chip.label}
            <span style={{ opacity: 0.7, fontSize: 14 }}>×</span>
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={resetAll}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}
          >
            Сбросить всё
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Sort dropdown (как на скриншоте) */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen(o => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
              fontSize: 14, color: 'rgba(255,255,255,0.45)',
            }}
          >
            Сортировать по:
            <span style={{ color: '#E13C6E', fontWeight: 600 }}>{currentSortLabel}</span>
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ transition: 'transform 0.2s', transform: sortOpen ? 'rotate(180deg)' : 'none', color: '#E13C6E' }}
            >
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {sortOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: '#12121C', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: 6, minWidth: 210, zIndex: 100,
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}>
              {SORT_OPTIONS.map(opt => {
                const active = currentSort === opt.value;
                return (
                  <SortItem
                    key={opt.value}
                    label={opt.label}
                    active={active}
                    onClick={() => { push({ sort: opt.value }); setSortOpen(false); }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', borderRadius: 10, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <ViewBtn active={currentView === 'grid'} title="Сетка"   onClick={() => push({ view: 'grid' })} icon={<GridIcon />} />
          <ViewBtn active={currentView === 'list'} title="Список"  onClick={() => push({ view: 'list' })} icon={<ListIcon />} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{
        fontFamily: 'var(--font-unbounded), sans-serif',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  label, active, accent = '#6C3CE1', onClick,
}: {
  label: string; active: boolean; accent?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'all 0.15s',
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${accent}55` : 'rgba(255,255,255,0.07)'}`,
        color: active ? accent : 'rgba(255,255,255,0.45)',
      }}
    >
      {label}
    </button>
  );
}

function YearSelect({ value, placeholder, onChange }: {
  value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: value ? '#fff' : 'rgba(255,255,255,0.35)',
        cursor: 'pointer', outline: 'none', appearance: 'none',
        minWidth: 100,
      }}
    >
      <option value="">{placeholder}</option>
      {YEAR_OPTIONS.map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );
}

function SortItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 14px', borderRadius: 9,
        background: active ? 'rgba(108,60,225,0.15)' : hovered ? 'rgba(255,255,255,0.04)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: active ? '#a78bfa' : 'rgba(255,255,255,0.65)',
        fontSize: 14, fontWeight: active ? 600 : 400,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ width: 16, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {active && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4.5l3.5 3.5L11 1" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function ViewBtn({ active, title, onClick, icon }: {
  active: boolean; title: string; onClick: () => void; icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 12px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        background: active ? '#6C3CE1' : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
      }}
    >
      {icon}
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="3" rx="1.5" />
      <rect x="1" y="7" width="14" height="3" rx="1.5" />
      <rect x="1" y="12" width="14" height="3" rx="1.5" />
    </svg>
  );
}
