'use client';

import { useState } from 'react';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import type { AnimeShort } from '@/lib/db/anime';
import type { WatchStatus } from '@/app/actions/favorites';

type TabKey = WatchStatus | 'favorited';

const TABS: { key: TabKey; label: string; color: string; icon: string }[] = [
  { key: 'watching',  label: 'Смотрю',       color: '#3CE1A8', icon: '▶' },
  { key: 'completed', label: 'Просмотрено',   color: '#6C3CE1', icon: '✓' },
  { key: 'planned',   label: 'Буду смотреть', color: '#3C7EE1', icon: '◷' },
  { key: 'on_hold',   label: 'Отложено',      color: '#E1A83C', icon: '⏸' },
  { key: 'favorited', label: 'Избранное',     color: '#E13C6E', icon: '♥' },
  { key: 'dropped',   label: 'Брошено',       color: '#666',    icon: '✕' },
];

interface Props {
  groups: Record<TabKey, AnimeShort[]>;
  allIds: Set<number>;
  totalNonDropped: number;
}

export function FavoritesTabs({ groups, allIds, totalNonDropped }: Props) {
  const firstNonEmpty = TABS.find(t => groups[t.key].length > 0)?.key ?? 'favorited';
  const [activeTab, setActiveTab] = useState<TabKey>(firstNonEmpty);

  const activeAnimes = groups[activeTab] ?? [];

  function plural(n: number, one: string, few: string, many: string) {
    const m10 = n % 10, m100 = n % 100;
    if (m100 >= 11 && m100 <= 19) return many;
    if (m10 === 1) return one;
    if (m10 >= 2 && m10 <= 4) return few;
    return many;
  }

  return (
    <>
      {/* Заголовок */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 34, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.03em', margin: 0,
        }}>Мои аниме</h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 }}>
          {totalNonDropped} {plural(totalNonDropped, 'тайтл', 'тайтла', 'тайтлов')} в списке
        </p>
      </div>

      {/* Вкладки */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 36,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {TABS.map(tab => {
          const count = groups[tab.key].length;
          if (count === 0) return null;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: '10px 10px 0 0',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'color 0.1s, background 0.1s',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                color: active ? tab.color : 'rgba(255,255,255,0.4)',
                borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              <span style={{ fontSize: 11 }}>{tab.icon}</span>
              {tab.label}
              <span style={{
                padding: '1px 7px', borderRadius: 6, fontSize: 11,
                background: active ? `${tab.color}22` : 'rgba(255,255,255,0.06)',
                color: active ? tab.color : 'rgba(255,255,255,0.3)',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Сетка */}
      {activeAnimes.length > 0 ? (
        <AnimeGrid
          animes={activeAnimes}
          favoritedIds={allIds}
          isLoggedIn={true}
        />
      ) : (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          color: 'rgba(255,255,255,0.25)', fontSize: 16,
        }}>
          Здесь пока пусто
        </div>
      )}
    </>
  );
}
