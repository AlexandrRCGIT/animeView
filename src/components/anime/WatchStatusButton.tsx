'use client';

import { useTransition } from 'react';
import { setWatchStatus, type WatchStatus } from '@/app/actions/favorites';

const STATUSES: {
  value: WatchStatus;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: 'watching',  label: 'Смотрю',       color: '#3CE1A8', icon: '▶' },
  { value: 'completed', label: 'Просмотрено',   color: '#6C3CE1', icon: '✓' },
  { value: 'planned',   label: 'Буду смотреть', color: '#3C7EE1', icon: '◷' },
  { value: 'on_hold',   label: 'Отложено',      color: '#E1A83C', icon: '⏸' },
  { value: 'dropped',   label: 'Брошено',       color: '#E13C3C', icon: '✕' },
];

interface Props {
  shikimoriId: number;
  currentStatus: WatchStatus | null;
  isLoggedIn: boolean;
}

export function WatchStatusButton({ shikimoriId, currentStatus, isLoggedIn }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick(status: WatchStatus) {
    if (!isLoggedIn) return;
    startTransition(async () => {
      // Повторный клик по активному статусу — снимает его
      await setWatchStatus(shikimoriId, currentStatus === status ? null : status);
    });
  }

  if (!isLoggedIn) {
    return (
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
        Войдите, чтобы отслеживать аниме
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, opacity: pending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {STATUSES.map(s => {
        const active = currentStatus === s.value;
        return (
          <button
            key={s.value}
            onClick={() => handleClick(s.value)}
            disabled={pending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: pending ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
              background: active ? `${s.color}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? s.color + '66' : 'rgba(255,255,255,0.08)'}`,
              color: active ? s.color : 'rgba(255,255,255,0.45)',
            }}
          >
            <span style={{ fontSize: 11 }}>{s.icon}</span>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
