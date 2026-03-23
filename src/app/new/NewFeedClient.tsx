'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { proxifyImageUrl } from '@/lib/image-proxy';
import type { AnimeShort } from '@/lib/db/anime';

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
];

const KIND_LABELS: Record<string, string> = {
  tv: 'TV', tv_13: 'TV', tv_24: 'TV', tv_48: 'TV',
  movie: 'Фильм', ova: 'OVA', ona: 'ONA', special: 'Спешл', music: 'Клип',
};

const PAGE_SIZE = 30;

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function statusLabel(item: AnimeShort): string {
  if (item.anime_status === 'anons') return 'Анонс';
  if (item.anime_status === 'released') return 'Завершён';
  if (item.anime_status === 'ongoing' && item.last_episode) {
    const total = item.episodes_count || 0;
    return `Серия ${item.last_episode} из ${total > 0 ? total : '?'}`;
  }
  return '';
}

interface FeedItem extends AnimeShort {
  kodik_updated_at?: string | null;
}

interface Props {
  initialItems: FeedItem[];
}

export function NewFeedClient({ initialItems }: Props) {
  const [period, setPeriod] = useState<Period>('all');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(initialItems.length >= PAGE_SIZE);

  // Отмечаем просмотр на клиенте (корректно работает при ISR)
  useEffect(() => {
    fetch('/api/new/viewed', { method: 'POST' }).catch(() => {});
  }, []);

  const fetchPage = useCallback(async (newPeriod: Period, newPage: number) => {
    if (newPeriod === 'all' && newPage === 0 && initialItems.length > 0) {
      setItems(initialItems);
      setHasNext(initialItems.length >= PAGE_SIZE);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(newPage * PAGE_SIZE) });
      if (newPeriod !== 'all') params.set('period', newPeriod);
      const res = await fetch(`/api/new?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as { items: FeedItem[] };
      const next = json.items ?? [];
      setItems(next);
      setHasNext(next.length >= PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [initialItems]);

  function handlePeriod(newPeriod: Period) {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setPage(0);
    void fetchPage(newPeriod, 0);
  }

  function handlePrev() {
    const newPage = page - 1;
    setPage(newPage);
    void fetchPage(period, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNext() {
    const newPage = page + 1;
    setPage(newPage);
    void fetchPage(period, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const btnBase: React.CSSProperties = {
    padding: '7px 18px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  };
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.3,
    cursor: 'default',
  };

  return (
    <>
      {/* Фильтр по периоду */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handlePeriod(value)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: period === value ? 'none' : '1px solid rgba(255,255,255,0.14)',
              background: period === value ? 'var(--accent, #6C3CE1)' : 'transparent',
              color: period === value ? '#fff' : 'rgba(255,255,255,0.55)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Список */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px dashed rgba(255,255,255,0.14)',
            padding: '22px 18px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 14,
          }}
        >
          Нет обновлений за выбранный период
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/anime/${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                padding: '10px 14px 10px 10px',
                textDecoration: 'none',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              {item.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxifyImageUrl(item.poster_url, 120)}
                  alt={item.title}
                  style={{ width: 46, height: 66, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  style={{
                    width: 46,
                    height: 66,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.07)',
                    flexShrink: 0,
                  }}
                />
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                  {KIND_LABELS[item.anime_kind ?? ''] ?? item.anime_kind ?? ''}
                  {item.year ? ` · ${item.year}` : ''}
                  {statusLabel(item) ? ` · ${statusLabel(item)}` : ''}
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.3)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {formatRelativeDate(item.kodik_updated_at ?? null)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Пагинация */}
      {!loading && (items.length > 0 || page > 0) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <button
            onClick={handlePrev}
            disabled={page === 0}
            style={page === 0 ? btnDisabled : btnBase}
          >
            ← Назад
          </button>

          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', minWidth: 80, textAlign: 'center' }}>
            Страница {page + 1}
          </span>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            style={!hasNext ? btnDisabled : btnBase}
          >
            Вперёд →
          </button>
        </div>
      )}
    </>
  );
}
