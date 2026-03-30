'use client';

import { useState } from 'react';
import Link from 'next/link';

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

interface InfoResult {
  found: boolean;
  anime?: AnimeInfo;
  translations_count?: number;
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

/** Извлекает shikimori_id из URL или числа */
function parseId(raw: string): number | null {
  const trimmed = raw.trim();
  // Чистое число
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  // /anime/123 или /anime/slug-123
  const animeMatch = trimmed.match(/\/anime\/(?:[^/]*-)?(\d+)/);
  if (animeMatch) return Number(animeMatch[1]);

  // shikimori.one/animes/123 или /animes/slug-123
  const shikiMatch = trimmed.match(/\/animes\/(?:[^/]*-)?(\d+)/);
  if (shikiMatch) return Number(shikiMatch[1]);

  return null;
}

export function AdminDmcaClient() {
  const [inputVal, setInputVal] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [info, setInfo] = useState<InfoResult | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ title: string; deleted: Record<string, number | string> } | null>(null);

  async function handleLookup() {
    const id = parseId(inputVal);
    if (!id) { setError('Не удалось распознать ID. Введи число или ссылку на аниме.'); return; }

    setLoading(true);
    setError('');
    setInfo(null);
    setConfirm(false);
    setDeleteResult(null);

    const res = await fetch(`/api/admin/anime/info?id=${id}`);
    const data = await res.json() as InfoResult;
    setLoading(false);

    if (!res.ok) { setError((data as { error?: string }).error ?? 'Ошибка'); return; }
    if (!data.found) { setError(`Тайтл с ID ${id} не найден в базе данных`); return; }
    setInfo(data);
  }

  async function handleDelete() {
    if (!info?.anime) return;
    setDeleting(true);
    setError('');

    const res = await fetch('/api/admin/anime/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shikimori_id: info.anime.shikimori_id, reason }),
    });
    const data = await res.json();
    setDeleting(false);

    if (!res.ok || !data.ok) {
      setError(data.error ?? 'Ошибка удаления');
      return;
    }

    setDeleteResult({ title: data.title, deleted: data.deleted });
    setInfo(null);
    setConfirm(false);
    setInputVal('');
    setReason('');
  }

  const a = info?.anime;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '32px clamp(14px,4vw,40px) 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <Link href="/admin/kodik" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
          ← Kodik Admin
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <Link href="/admin/rutube" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
          Rutube Admin
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-unbounded), sans-serif' }}>
          DMCA / Удаление тайтла
        </h1>
      </div>

      {/* Поиск */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 24,
        maxWidth: 680,
        marginBottom: 28,
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Введи ID или ссылку:
        </p>
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
          <button
            style={{ ...BTN, background: loading ? 'rgba(108,60,225,0.4)' : '#6C3CE1', color: '#fff' }}
            onClick={handleLookup}
            disabled={loading || !inputVal.trim()}
          >
            {loading ? 'Поиск...' : 'Найти'}
          </button>
        </div>
        {error && <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
      </div>

      {/* Результат поиска */}
      {a && !deleteResult && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,80,80,0.3)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 680,
        }}>
          {/* Превью тайтла */}
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
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Эпизодов: {a.episodes_count ?? '?'} · Сезон: {a.last_season ?? 1}
              </div>
            </div>
          </div>

          {/* Поле причины */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
              Причина удаления (необязательно, для лога):
            </label>
            <input
              style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }}
              placeholder="Например: DMCA от правообладателя"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          {!confirm ? (
            <button
              style={{ ...BTN, background: '#DC2626', color: '#fff' }}
              onClick={() => setConfirm(true)}
            >
              Удалить из базы данных
            </button>
          ) : (
            <div style={{
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.4)',
              borderRadius: 12,
              padding: '16px 18px',
            }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#f87171' }}>
                ⚠️ Подтверди удаление «{a.title}»
              </p>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Будут удалены: запись в <b>anime</b>, {info?.translations_count ?? 0} переводов,
                прогресс просмотра пользователей, записи избранного.
                Тайтл исчезнет из sitemap при следующей генерации.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  style={{ ...BTN, background: deleting ? 'rgba(220,38,38,0.4)' : '#DC2626', color: '#fff' }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Удаляем...' : 'Да, удалить безвозвратно'}
                </button>
                <button
                  style={{ ...BTN, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                  onClick={() => setConfirm(false)}
                  disabled={deleting}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Результат удаления */}
      {deleteResult && (
        <div style={{
          background: 'rgba(60,225,168,0.08)',
          border: '1px solid rgba(60,225,168,0.3)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 560,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3CE1A8', marginBottom: 12 }}>
            ✓ «{deleteResult.title}» удалён из базы
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Переводов удалено: {deleteResult.deleted.translations}</span>
            <span>Записей прогресса удалено: {deleteResult.deleted.watch_progress}</span>
            <span>Записей избранного удалено: {deleteResult.deleted.favorites}</span>
            <span style={{ marginTop: 6, color: 'rgba(255,255,255,0.35)' }}>
              Sitemap обновится при следующем запросе.
            </span>
          </div>
          <button
            style={{ ...BTN, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', marginTop: 16 }}
            onClick={() => setDeleteResult(null)}
          >
            Удалить ещё один тайтл
          </button>
        </div>
      )}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 20,
      background: accent ? `${accent}22` : 'rgba(255,255,255,0.08)',
      border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,0.12)'}`,
      color: accent ?? 'rgba(255,255,255,0.6)',
      fontWeight: 600,
      fontSize: 11,
    }}>
      {children}
    </span>
  );
}
