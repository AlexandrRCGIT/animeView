'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Translation {
  kodik_id: string;
  translation_id: number;
  translation_title: string;
  translation_type: 'voice' | 'subtitles';
  last_season: number | null;
  last_episode: number | null;
  episodes_count: number;
}

interface CanonicalInfo {
  shikimori_id: number;
  title: string;
  title_orig: string;
  poster_url: string | null;
  year: number | null;
  anime_kind: string | null;
  anime_status: string | null;
  genres: string[];
  shikimori_rating: number | null;
  episodes_count: number;
  last_season: number | null;
  last_episode: number | null;
  description: string | null;
}

interface LookupResult {
  found: boolean;
  total: number;
  canonical: CanonicalInfo;
  translations: Translation[];
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 15,
  padding: '10px 14px',
  outline: 'none',
  width: 220,
};

const BTN: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

export function AdminKodikClient() {
  const [inputId, setInputId] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [importMsg, setImportMsg] = useState('');

  async function handleLookup() {
    const id = Number(inputId.trim());
    if (!id) { setError('Введи корректный Shikimori ID'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setImportStatus('idle');

    const res = await fetch(`/api/admin/kodik/lookup?id=${id}`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) { setError(data.error ?? 'Ошибка API'); return; }
    if (!data.found) { setError('Тайтл не найден в Kodik'); return; }
    setResult(data);
  }

  async function handleImport() {
    if (!result) return;
    setImporting(true);
    setImportStatus('idle');

    const res = await fetch('/api/admin/kodik/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shikimori_id: result.canonical.shikimori_id }),
    });
    const data = await res.json();
    setImporting(false);

    if (data.ok) {
      setImportStatus('ok');
      setImportMsg(`✓ «${data.title}» загружен в базу (${data.translations_in_kodik} переводов в Kodik)`);
    } else {
      setImportStatus('error');
      setImportMsg(data.error ?? 'Ошибка импорта');
    }
  }

  const c = result?.canonical;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff', padding: '32px clamp(14px,4vw,40px) 60px' }}>
      <AdminHeader title="Импорт тайтла из Kodik" />

      {/* Search form */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '24px',
        marginBottom: 28,
        maxWidth: 560,
      }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Введи Shikimori ID тайтла (число из URL shikimori.one/animes/<b style={{ color: '#A78BFA' }}>ID</b>)
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            style={INPUT_STYLE}
            placeholder="Например: 20"
            value={inputId}
            onChange={e => setInputId(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button
            style={{ ...BTN, background: loading ? 'rgba(108,60,225,0.4)' : '#6C3CE1', color: '#fff' }}
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? 'Поиск...' : 'Найти в Kodik'}
          </button>
        </div>
        {error && <p style={{ marginTop: 10, color: '#f87171', fontSize: 13 }}>{error}</p>}
      </div>

      {/* Result */}
      {result && c && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 700,
        }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.poster_url && <img src={c.poster_url} alt={c.title} style={{ width: 90, height: 130, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{c.title}</div>
              {c.title_orig && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{c.title_orig}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12, marginBottom: 8 }}>
                {c.year && <Tag>{c.year}</Tag>}
                {c.anime_kind && <Tag>{c.anime_kind.toUpperCase()}</Tag>}
                {c.anime_status && <Tag accent={c.anime_status === 'ongoing' ? '#3CE1A8' : undefined}>{c.anime_status}</Tag>}
                {c.shikimori_rating && <Tag accent="#FFD700">★ {c.shikimori_rating}</Tag>}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                Эпизодов: {c.episodes_count || '?'} · Сезон: {c.last_season ?? 1} · Эп: {c.last_episode ?? '?'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Shikimori ID: {c.shikimori_id}
              </div>
            </div>
          </div>

          {c.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16, maxHeight: 80, overflow: 'hidden' }}>
              {c.description}
            </p>
          )}

          {/* Translations */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
              Переводы в Kodik ({result.total})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.translations.map(t => (
                <div key={t.kodik_id} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 6,
                }}>
                  <span>
                    <span style={{ color: '#A78BFA', fontWeight: 600 }}>#{t.translation_id}</span>
                    {' '}{t.translation_title}
                    {' '}<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>({t.translation_type})</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    S{t.last_season ?? 1} E{t.last_episode ?? '?'} · {t.episodes_count} эп.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Import button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              style={{ ...BTN, background: importing ? 'rgba(60,225,168,0.3)' : '#3CE1A8', color: '#08080E' }}
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'Загружаем...' : '↓ Загрузить в базу'}
            </button>
            <Link
              href={`/anime/${c.shikimori_id}`}
              target="_blank"
              style={{ fontSize: 13, color: '#A78BFA', textDecoration: 'none' }}
            >
              Открыть на сайте →
            </Link>
          </div>

          {importStatus !== 'idle' && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: importStatus === 'ok' ? 'rgba(60,225,168,0.12)' : 'rgba(248,113,113,0.12)',
              color: importStatus === 'ok' ? '#3CE1A8' : '#f87171',
              fontSize: 13,
              fontWeight: 600,
            }}>
              {importMsg}
            </div>
          )}
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
