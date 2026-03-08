'use client';

import { useState, useTransition } from 'react';
import { forgetUserDevice, type UserDevice } from '@/app/actions/settings';

interface Props {
  devices: UserDevice[];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getViaLabel(via: string | null): string {
  if (via === 'tv') return 'TV';
  if (via === 'web') return 'Web';
  return 'Устройство';
}

export function DevicesList({ devices }: Props) {
  const [items, setItems] = useState<UserDevice[]>(devices);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(deviceId: string) {
    setError('');
    setPendingId(deviceId);

    startTransition(async () => {
      const result = await forgetUserDevice(deviceId);
      if (!result.ok) {
        setError(result.error ?? 'Не удалось удалить устройство');
        setPendingId(null);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== deviceId));
      setPendingId(null);
    });
  }

  if (!items.length) {
    return (
      <p className="text-sm text-zinc-500">
        Пока нет подключенных устройств.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {items.map((device) => {
        const removing = isPending && pendingId === device.id;
        return (
          <div
            key={device.id}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {device.device_name || 'Устройство'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="inline-flex h-5 items-center rounded-md bg-zinc-800 px-2 text-zinc-300">
                  {getViaLabel(device.created_via)}
                </span>
                <span>Подключено: {formatDate(device.first_connected_at)}</span>
                <span>Последняя активность: {formatDate(device.last_seen_at)}</span>
              </div>
            </div>

            <button
              onClick={() => handleRemove(device.id)}
              disabled={removing}
              className="shrink-0 px-3 py-1.5 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              {removing ? 'Удаляем...' : 'Удалить'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
