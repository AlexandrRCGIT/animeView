'use client';

import { useState, useCallback } from 'react';

interface SearchResult {
  shikimori_id: number;
  title: string;
  title_orig: string | null;
  year: number | null;
  anime_kind: string | null;
  rutube_episodes: Record<string, Record<string, string>> | null;
}

interface RutubeVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  season: number | null;
  episode: number | null;
}

interface EpisodeRow {
  rutubeId: string;
  title: string;
  thumbnail: string;
  season: number;
  episode: number;
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#08080E', color: '#fff', padding: '32px 24px', fontFamily: 'sans-serif' },
  h1: { fontSize: 22, fontWeight: 800, marginBottom: 28, color: '#fff', letterSpacing: '-0.02em' },
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '0 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  btn: { height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #E13C6E, #6C3CE1)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  btnSecondary: { height: 40, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnDanger: { height: 28, padding: '0 12px', borderRadius: 8, border: 'none', background: 'rgba(220,50,50,0.2)', color: '#f87171', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  row: { display: 'flex', gap: 10, alignItems: 'center' },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,60,225,0.2)', color: '#a78bfa', fontWeight: 600 },
};

function extractTvId(input: string): string {
  const match = input.match(/metainfo\/tv\/([^/?#]+)/);
  if (match) return match[1];
  const match2 = input.match(/rutube\.ru\/shows\/([^/?#]+)/);
  if (match2) return match2[1];
  return input.trim();
}

export function AdminRutubeClient() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<SearchResult | null>(null);

  const [tvInput, setTvInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ─── Поиск аниме ────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      const ids: number[] = (data.results ?? []).map((r: { shikimori_id: number }) => r.shikimori_id);
      if (!ids.length) { setSearchResults([]); return; }

      // Подгружаем rutube_episodes для каждого результата
      const detailed = await Promise.all(
        (data.results as SearchResult[]).map(async (r) => {
          const res2 = await fetch(`/api/admin/rutube/current?id=${r.shikimori_id}`);
          if (!res2.ok) return r;
          const d = await res2.json() as { rutube_episodes: Record<string, Record<string, string>> | null };
          return { ...r, rutube_episodes: d.rutube_episodes };
        })
      );
      setSearchResults(detailed);
    } finally {
      setSearching(false);
    }
  }

  function selectAnime(anime: SearchResult) {
    setSelected(anime);
    setEpisodes([]);
    setFetchError(null);
    setSaveMsg(null);

    // Если уже есть данные — сразу загружаем в таблицу
    if (anime.rutube_episodes) {
      const rows: EpisodeRow[] = [];
      for (const [s, eps] of Object.entries(anime.rutube_episodes)) {
        for (const [e, id] of Object.entries(eps)) {
          rows.push({ rutubeId: id, title: '', thumbnail: '', season: Number(s), episode: Number(e) });
        }
      }
      rows.sort((a, b) => a.season - b.season || a.episode - b.episode);
      setEpisodes(rows);
    }
  }

  // ─── Загрузка с Rutube ───────────────────────────────────────────────────────
  async function handleFetch() {
    if (!tvInput.trim()) return;
    const tvId = extractTvId(tvInput);
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/rutube/fetch?tv_id=${encodeURIComponent(tvId)}`);
      const data = await res.json() as { videos?: RutubeVideo[]; error?: string };
      if (!res.ok || data.error) { setFetchError(data.error ?? 'Ошибка загрузки'); return; }

      const videos = data.videos ?? [];
      const rows: EpisodeRow[] = videos.map((v, i) => ({
        rutubeId: v.id,
        title: v.title,
        thumbnail: v.thumbnail_url,
        season: v.season ?? 1,
        episode: v.episode ?? (i + 1),
      }));
      rows.sort((a, b) => a.season - b.season || a.episode - b.episode);
      setEpisodes(rows);
    } finally {
      setLoading(false);
    }
  }

  // ─── Редактирование строки ────────────────────────────────────────────────────
  const updateRow = useCallback((idx: number, field: 'season' | 'episode', val: number) => {
    setEpisodes(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }, []);

  const removeRow = useCallback((idx: number) => {
    setEpisodes(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ─── Сохранение ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected || !episodes.length) return;
    setSaving(true);
    setSaveMsg(null);

    const rutube_episodes: Record<string, Record<string, string>> = {};
    for (const row of episodes) {
      const s = String(row.season);
      const e = String(row.episode);
      if (!rutube_episodes[s]) rutube_episodes[s] = {};
      rutube_episodes[s][e] = row.rutubeId;
    }

    try {
      const res = await fetch('/api/admin/rutube/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shikimori_id: selected.shikimori_id, rutube_episodes }),
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      setSaveMsg(d.ok ? '✓ Сохранено!' : `Ошибка: ${d.error}`);
      if (d.ok) {
        setSelected(prev => prev ? { ...prev, rutube_episodes } : null);
        setSearchResults(prev => prev.map(r => r.shikimori_id === selected.shikimori_id ? { ...r, rutube_episodes } : r));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!selected || !confirm(`Удалить все Rutube-эпизоды для «${selected.title}»?`)) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin/rutube/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shikimori_id: selected.shikimori_id, rutube_episodes: null }),
      });
      const d = await res.json() as { ok?: boolean; error?: string };
      setSaveMsg(d.ok ? '✓ Очищено' : `Ошибка: ${d.error}`);
      if (d.ok) { setEpisodes([]); setSelected(prev => prev ? { ...prev, rutube_episodes: null } : null); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={S.h1}>📺 Rutube Admin</h1>

        {/* ─── Поиск аниме ─────────────────────────────────────────────────── */}
        <div style={S.section}>
          <span style={S.label}>Поиск аниме</span>
          <div style={{ ...S.row, marginBottom: searchResults.length ? 12 : 0 }}>
            <input
              style={S.input}
              placeholder="Название аниме..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button style={S.btn} onClick={handleSearch} disabled={searching}>
              {searching ? '...' : 'Найти'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(r => (
                <button
                  key={r.shikimori_id}
                  onClick={() => selectAnime(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 10, border: selected?.shikimori_id === r.shikimori_id
                      ? '1px solid #6C3CE1' : '1px solid rgba(255,255,255,0.06)',
                    background: selected?.shikimori_id === r.shikimori_id
                      ? 'rgba(108,60,225,0.12)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.title}</div>
                    {r.title_orig && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.title_orig}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.year}</div>
                  {r.rutube_episodes && (
                    <span style={S.badge}>
                      {Object.values(r.rutube_episodes).reduce((acc, eps) => acc + Object.keys(eps).length, 0)} серий
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Редактор эпизодов ────────────────────────────────────────────── */}
        {selected && (
          <div style={S.section}>
            <div style={{ ...S.row, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selected.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  ID: {selected.shikimori_id}
                  {selected.rutube_episodes && ' · Rutube подключён'}
                </div>
              </div>
              {selected.rutube_episodes && (
                <button style={S.btnDanger} onClick={handleClear} disabled={saving}>Очистить</button>
              )}
            </div>

            {/* Загрузка TV ID */}
            <span style={S.label}>Rutube TV ID или URL шоу</span>
            <div style={{ ...S.row, marginBottom: fetchError ? 8 : 16 }}>
              <input
                style={S.input}
                placeholder="Например: 12345 или https://rutube.ru/metainfo/tv/12345/"
                value={tvInput}
                onChange={e => setTvInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
              />
              <button style={S.btn} onClick={handleFetch} disabled={loading || !tvInput.trim()}>
                {loading ? 'Загрузка...' : 'Загрузить'}
              </button>
            </div>
            {fetchError && (
              <div style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{fetchError}</div>
            )}

            {/* Таблица эпизодов */}
            {episodes.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {episodes.length} серий
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    Можно отредактировать сезон/серию перед сохранением
                  </span>
                </div>

                {/* Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '60px 60px 1fr 160px 36px',
                  gap: 8, padding: '6px 10px',
                  fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <span>Сезон</span><span>Серия</span><span>Название</span><span>Rutube ID</span><span></span>
                </div>

                <div style={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {episodes.map((row, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '60px 60px 1fr 160px 36px',
                      gap: 8, alignItems: 'center', padding: '6px 10px',
                      borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <input
                        type="number" min={1} style={{ ...S.input, height: 32, padding: '0 8px', fontSize: 13 }}
                        value={row.season}
                        onChange={e => updateRow(i, 'season', Math.max(1, Number(e.target.value)))}
                      />
                      <input
                        type="number" min={1} style={{ ...S.input, height: 32, padding: '0 8px', fontSize: 13 }}
                        value={row.episode}
                        onChange={e => updateRow(i, 'episode', Math.max(1, Number(e.target.value)))}
                      />
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.title || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.rutubeId}
                      </div>
                      <button style={S.btnDanger} onClick={() => removeRow(i)} title="Удалить">×</button>
                    </div>
                  ))}
                </div>

                <div style={{ ...S.row, marginTop: 16 }}>
                  <button style={S.btn} onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить в БД'}
                  </button>
                  {saveMsg && (
                    <span style={{ fontSize: 13, color: saveMsg.startsWith('✓') ? '#3CE1A8' : '#f87171' }}>
                      {saveMsg}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
