'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface OnlineStatsResponse {
  window_minutes: number;
  total_online: number;
  authenticated_online: number;
  guests_online: number;
  updated_at: string;
}

const WINDOW_OPTIONS = [1, 3, 5, 10, 15];
const POLL_INTERVAL_MS = 10_000;

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14,
  padding: '16px 18px',
  minWidth: 180,
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: color ?? '#fff' }}>{value}</div>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AdminOnlineClient() {
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OnlineStatsResponse | null>(null);

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/online/now?window=${windowMinutes}`, {
        cache: 'no-store',
        signal,
      });
      const payload = (await response.json()) as OnlineStatsResponse & { error?: string };
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? 'Не удалось получить статистику онлайн');
      }
      setStats(payload);
      setError(null);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [windowMinutes]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStats(controller.signal);
    return () => controller.abort();
  }, [loadStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadStats();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadStats]);

  const updatedAt = useMemo(() => formatTime(stats?.updated_at ?? null), [stats?.updated_at]);

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '32px clamp(14px,4vw,40px) 60px' }}>
      <AdminHeader title="Онлайн пользователи" />

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 18,
        maxWidth: 760,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Окно активности:</span>
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setWindowMinutes(option)}
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  background: windowMinutes === option ? 'rgba(108,60,225,0.28)' : 'rgba(255,255,255,0.06)',
                  color: windowMinutes === option ? '#c4b5fd' : 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                }}
              >
                {option} мин
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadStats()}
            style={{
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.06)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Обновить
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Последнее обновление: {updatedAt} {loading ? '· обновляем...' : ''}
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 13, color: '#fca5a5' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Онлайн всего" value={stats?.total_online ?? 0} />
        <StatCard label="Авторизованные" value={stats?.authenticated_online ?? 0} color="#a78bfa" />
        <StatCard label="Гости" value={stats?.guests_online ?? 0} color="#67e8f9" />
      </div>
    </div>
  );
}
