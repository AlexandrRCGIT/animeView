'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface AnimeInfo {
  shikimori_id: number;
  title: string;
  title_orig: string | null;
  poster_url: string | null;
  year: number | null;
  anime_kind: string | null;
  anime_status: string | null;
  episodes_count: number | null;
  last_season: number | null;
  last_episode: number | null;
  synced_at: string | null;
}

interface DmcaEntry {
  shikimori_id: number;
  title: string;
  title_orig: string | null;
  blocked_at: string;
  reason: string | null;
}

interface InfoResult {
  found: boolean;
  anime?: AnimeInfo;
  translations_count?: number;
  dmca_blocked?: DmcaEntry | null;
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 15,
  padding: '10px 14px',
  outline: 'none',
  flex: 1,
  minWidth: 260,
};

const BTN: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

function parseId(raw: string): number | null {
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const animeMatch = trimmed.match(/\/anime\/(?:[^/]*-)?(\d+)/);
  if (animeMatch) return Number(animeMatch[1]);
  const shikiMatch = trimmed.match(/\/animes\/(?:[^/]*-)?(\d+)/);
  if (shikiMatch) return Number(shikiMatch[1]);
  return null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AdminDmcaClient() {
  const [inputVal, setInputVal] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [info, setInfo] = useState<InfoResult | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ title: string; deleted: Record<string, number | string> } | null>(null);
  const [blockedList, setBlockedList] = useState<DmcaEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const loadList = useCallback(async () => {
    const res = await fetch('/api/admin/dmca/list');
    const data = await res.json() as { items: DmcaEntry[] };
    setBlockedList(data.items ?? []);
    setListLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadList(); }, []);

  async function handleLookup() {
    const id = parseId(inputVal);
    if (!id) { setError('Не удалось распознать ID. Введи число или ссылку.'); return; }
    setLoading(true); setError(''); setInfo(null); setConfirm(false); setDeleteResult(null);
    const res = await fetch(`/api/admin/anime/info?id=${id}`);
    const data = await res.json() as InfoResult;
    setLoading(false);
    if (!res.ok) { setError((data as { error?: string }).error ?? 'Ошибка'); return; }
    setInfo(data);
    if (!data.found && !data.dmca_blocked) {
      setError(`Тайтл с ID ${id} не найден в базе данных`);
    }
  }

  async function handleDelete() {
    if (!info?.anime) return;
    setDeleting(true); setError('');
    const res = await fetch('/api/admin/anime/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shikimori_id: info.anime.shikimori_id, reason }),
    });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok || !data.ok) { setError(data.error ?? 'Ошибка удаления'); return; }
    setDeleteResult({ title: data.title, deleted: data.deleted });
    setInfo(null); setConfirm(false); setInputVal(''); setReason('');
    void loadList();
  }

  async function handleUnblock(id: number) {
    const res = await fetch('/api/admin/dmca/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shikimori_id: id }),
    });
    if (res.ok) {
      setBlockedList(prev => prev.filter(e => e.shikimori_id !== id));
      if (info?.dmca_blocked?.shikimori_id === id) setInfo(null);
    }
  }

  async function handleImportFromKodik(id: number) {
    setImporting(true); setError('');
    const res = await fetch('/api/admin/kodik/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shikimori_id: id }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? 'Ошибка импорта из Kodik');
      return;
    }
    // Перечитываем
    const infoRes = await fetch(`/api/admin/anime/info?id=${id}`);
    const infoData = await infoRes.json() as InfoResult;
    setInfo(infoData);
  }

  const a = info?.anime;
  const dmca = info?.dmca_blocked;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '32px clamp(14px,4vw,40px) 60px' }}>
      <AdminHeader title="DMCA / Удаление тайтла" />

      {/* Поиск */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxWidth: 680, marginBottom: 28 }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Введи ID или ссылку:</p>
        <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>
          <li>Число: <code style={{ color: '#A78BFA' }}>20</code></li>
          <li>Ссылка на сайт: <code style={{ color: '#A78BFA' }}>https://anime-view.org/anime/20</code></li>
          <li>Shikimori: <code style={{ color: '#A78BFA' }}>https://shikimori.one/animes/20</code></li>
        </ul>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            style={INPUT_STYLE}
            placeholder="ID или ссылка"
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setError(''); setInfo(null); setConfirm(false); setDeleteResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button style={{ ...BTN, background: loading ? 'rgba(108,60,225,0.4)' : '#6C3CE1', color: '#fff' }} onClick={handleLookup} disabled={loading || !inputVal.trim()}>
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </div>
        {error && !dmca && <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
      </div>

      {/* Тайтл в dmca_blocked (не в anime) */}
      {!a && dmca && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 16, padding: 24, maxWidth: 680, marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#FBB724', marginBottom: 8 }}>
            ⚠ Тайтл заблокирован по DMCA
          </div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>{dmca.title}{dmca.title_orig ? ` / ${dmca.title_orig}` : ''}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>ID: {dmca.shikimori_id} · Заблокирован: {formatDate(dmca.blocked_at)}</div>
          {dmca.reason && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Причина: {dmca.reason}</div>}
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Чтобы снова добавить в базу — сначала разблокируй, затем импортируй из Kodik.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              style={{ ...BTN, background: '#3CE1A8', color: '#08080E' }}
              onClick={() => handleUnblock(dmca.shikimori_id)}
            >
              Разблокировать
            </button>
          </div>
        </div>
      )}

      {/* Тайтл не найден нигде — предложить импорт из Kodik */}
      {info && !info.found && !info.dmca_blocked && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, maxWidth: 680, marginBottom: 28 }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
            Тайтл не найден в базе и не заблокирован. Можно импортировать из Kodik.
          </div>
          <button
            style={{ ...BTN, background: importing ? 'rgba(108,60,225,0.4)' : '#6C3CE1', color: '#fff' }}
            onClick={() => { const id = parseId(inputVal); if (id) handleImportFromKodik(id); }}
            disabled={importing}
          >
            {importing ? 'Импортируем...' : 'Импортировать из Kodik'}
          </button>
          {error && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: 13 }}>{error}</p>}
        </div>
      )}

      {/* Найденный тайтл — удаление */}
      {a && !deleteResult && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 16, padding: 24, maxWidth: 680, marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {a.poster_url && <img src={a.poster_url} alt={a.title} style={{ width: 80, height: 114, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{a.title}</div>
              {a.title_orig && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{a.title_orig}</div>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, marginBottom: 8 }}>
                {a.year && <Tag>{a.year}</Tag>}
                {a.anime_kind && <Tag>{a.anime_kind.toUpperCase()}</Tag>}
                {a.anime_status && <Tag accent={a.anime_status === 'ongoing' ? '#3CE1A8' : undefined}>{a.anime_status}</Tag>}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                ID: {a.shikimori_id} · Переводов в БД: {info?.translations_count ?? 0}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>Причина удаления (для лога):</label>
            <input style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} placeholder="Например: DMCA от правообладателя" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          {!confirm ? (
            <button style={{ ...BTN, background: '#DC2626', color: '#fff' }} onClick={() => setConfirm(true)}>Удалить из базы данных</button>
          ) : (
            <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#f87171' }}>⚠️ Подтверди удаление «{a.title}»</p>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Будут удалены: запись в <b>anime</b>, {info?.translations_count ?? 0} переводов, прогресс, избранное, отзывы, комментарии.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...BTN, background: deleting ? 'rgba(220,38,38,0.4)' : '#DC2626', color: '#fff' }} onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Удаляем...' : 'Да, удалить безвозвратно'}
                </button>
                <button style={{ ...BTN, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }} onClick={() => setConfirm(false)} disabled={deleting}>Отмена</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Результат удаления */}
      {deleteResult && (
        <div style={{ background: 'rgba(60,225,168,0.08)', border: '1px solid rgba(60,225,168,0.3)', borderRadius: 16, padding: 24, maxWidth: 560, marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3CE1A8', marginBottom: 12 }}>✓ «{deleteResult.title}» удалён из базы</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Переводов: {deleteResult.deleted.translations}</span>
            <span>Прогресса: {deleteResult.deleted.watch_progress}</span>
            <span>Избранного: {deleteResult.deleted.favorites}</span>
            <span>Отзывов: {deleteResult.deleted.reviews}</span>
            <span>Комментариев: {deleteResult.deleted.comments}</span>
          </div>
          <button style={{ ...BTN, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', marginTop: 16 }} onClick={() => setDeleteResult(null)}>Удалить ещё</button>
        </div>
      )}

      {/* Список заблокированных */}
      <div style={{ maxWidth: 780 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>
          Заблокированные тайтлы {!listLoading && blockedList.length > 0 && <span style={{ color: '#f87171', fontSize: 14 }}>({blockedList.length})</span>}
        </h2>

        {listLoading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Загрузка...</p>}

        {!listLoading && blockedList.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Нет заблокированных тайтлов</p>
        )}

        {!listLoading && blockedList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blockedList.map(entry => (
              <div key={entry.shikimori_id} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{entry.title}</div>
                  {entry.title_orig && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{entry.title_orig}</div>}
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>ID: {entry.shikimori_id}</span>
                    <span>{formatDate(entry.blocked_at)}</span>
                    {entry.reason && <span style={{ color: 'rgba(255,180,0,0.6)' }}>{entry.reason}</span>}
                  </div>
                </div>
                <button
                  style={{ ...BTN, background: 'rgba(60,225,168,0.12)', color: '#3CE1A8', border: '1px solid rgba(60,225,168,0.3)', fontSize: 12, padding: '6px 14px' }}
                  onClick={() => handleUnblock(entry.shikimori_id)}
                >
                  Разблокировать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20,
      background: accent ? `${accent}22` : 'rgba(255,255,255,0.08)',
      border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,0.12)'}`,
      color: accent ?? 'rgba(255,255,255,0.6)',
      fontWeight: 600, fontSize: 11,
    }}>
      {children}
    </span>
  );
}
