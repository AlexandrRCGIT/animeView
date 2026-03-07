import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://kodikapi.com';
const PAGE_LIMIT = 100;
const UPSERT_BATCH = 200;

const KODIK_TOKEN = process.env.KODIK_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KODIK_TOKEN) {
  console.error('KODIK_TOKEN не задан');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toTimestamp(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? ts : 0;
}

function pickCanonical(best, cur) {
  if (!best) return cur;

  const bestHasSeasons = !!best.seasons && Object.keys(best.seasons).length > 0;
  const curHasSeasons = !!cur.seasons && Object.keys(cur.seasons).length > 0;
  if (!bestHasSeasons && curHasSeasons) return cur;

  const bestEpisodes = best.episodes_count ?? 0;
  const curEpisodes = cur.episodes_count ?? 0;
  if (curEpisodes > bestEpisodes) return cur;

  if (!best.material_data && cur.material_data) return cur;

  const bestUpdated = toTimestamp(best.updated_at);
  const curUpdated = toTimestamp(cur.updated_at);
  if (curUpdated > bestUpdated) return cur;

  return best;
}

function extractEpisodesInfo(seasons) {
  const result = {};
  if (!seasons) return null;

  for (const [seasonNum, seasonData] of Object.entries(seasons)) {
    result[seasonNum] = {};
    for (const [epNum, epData] of Object.entries(seasonData.episodes || {})) {
      result[seasonNum][epNum] = {
        title: epData.title ?? null,
        screenshot: epData.screenshots?.[0] ?? null,
        link: epData.link ?? null,
      };
    }
  }

  return Object.keys(result).length ? result : null;
}

function getRussianTitle(item) {
  return item.material_data?.title || item.title || item.title_orig;
}

function buildAnimeRow(item) {
  const md = item.material_data;
  return {
    shikimori_id: Number(item.shikimori_id),
    kinopoisk_id: item.kinopoisk_id ?? null,
    imdb_id: item.imdb_id ?? null,
    worldart_link: item.worldart_link ?? null,

    title: getRussianTitle(item),
    title_orig: item.title_orig || null,
    title_jp: item.other_title || null,
    title_en: md?.title_en ?? null,

    type: item.type,
    year: item.year ?? md?.year ?? null,
    anime_kind: md?.anime_kind ?? null,
    anime_status: md?.anime_status ?? md?.all_status ?? null,

    shikimori_rating: md?.shikimori_rating ?? null,
    shikimori_votes: md?.shikimori_votes ?? null,
    kinopoisk_rating: md?.kinopoisk_rating ?? null,
    kinopoisk_votes: md?.kinopoisk_votes ?? null,
    imdb_rating: md?.imdb_rating ?? null,
    imdb_votes: md?.imdb_votes ?? null,

    poster_url: md?.poster_url ?? md?.anime_poster_url ?? null,
    screenshots: item.screenshots?.slice(0, 5) ?? [],

    last_season: item.last_season ?? null,
    last_episode: item.last_episode ?? null,
    episodes_count: item.episodes_count ?? 0,
    episodes_info: extractEpisodesInfo(item.seasons),

    genres: md?.anime_genres ?? md?.all_genres ?? md?.genres ?? [],
    studios: md?.anime_studios ?? [],
    countries: md?.countries ?? [],
    description: md?.anime_description ?? md?.description ?? null,
    duration: md?.duration ?? null,
    rating_mpaa: md?.rating_mpaa ?? null,
    minimal_age: md?.minimal_age ?? null,

    material_data: md ?? null,
    blocked_countries: item.blocked_countries ?? [],

    kodik_updated_at: item.updated_at ?? null,
    synced_at: new Date().toISOString(),
  };
}

async function fetchJsonWithRetry(url, retries = 4) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      const backoff = attempt * 1000;
      console.warn(`[retry] attempt ${attempt}/${retries}, wait ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastError;
}

async function main() {
  const params = new URLSearchParams({
    token: KODIK_TOKEN,
    types: 'anime,anime-serial',
    has_field: 'shikimori_id',
    lgbt: 'false',
    with_episodes_data: 'true',
    with_material_data: 'true',
    sort: 'shikimori_rating',
    order: 'desc',
    limit: String(PAGE_LIMIT),
  });

  let nextUrl = `${BASE_URL}/list?${params.toString()}`;
  let pages = 0;
  let rawRows = 0;
  let skippedNoShiki = 0;
  const byTranslation = new Map();
  const canonicalByShiki = new Map();

  console.log('[sync] start full import (unique anime only)');
  while (nextUrl) {
    const data = await fetchJsonWithRetry(nextUrl);
    pages += 1;
    const items = Array.isArray(data.results) ? data.results : [];
    if (!items.length) break;

    rawRows += items.length;
    for (const item of items) {
      const tid = Number(item?.translation?.id ?? 0);
      if (tid) byTranslation.set(tid, (byTranslation.get(tid) ?? 0) + 1);

      if (!item.shikimori_id) {
        skippedNoShiki += 1;
        continue;
      }

      const sid = Number(item.shikimori_id);
      const prev = canonicalByShiki.get(sid);
      canonicalByShiki.set(sid, pickCanonical(prev, item));
    }

    if (pages % 20 === 0) {
      console.log(`[sync] pages=${pages} raw_rows=${rawRows} unique=${canonicalByShiki.size}`);
    }

    nextUrl = data.next_page || data.next || null;
    if (nextUrl) await sleep(120);
  }

  const rows = [...canonicalByShiki.values()].map(buildAnimeRow);
  console.log(`[sync] fetched done: pages=${pages}, raw_rows=${rawRows}, unique_titles=${rows.length}, skipped_no_shiki=${skippedNoShiki}`);

  let upserted = 0;
  let upsertErrors = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const chunk = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await supabase
      .from('anime')
      .upsert(chunk, { onConflict: 'shikimori_id' });

    if (error) {
      upsertErrors += 1;
      console.error(`[upsert] failed batch ${i / UPSERT_BATCH + 1}: ${error.message}`);
      continue;
    }

    upserted += chunk.length;
    if (upserted % 1000 === 0 || upserted === rows.length) {
      console.log(`[upsert] progress ${upserted}/${rows.length}`);
    }
    await sleep(50);
  }

  const byTranslationSorted = [...byTranslation.entries()].sort((a, b) => b[1] - a[1]);
  console.log('[sync] done');
  console.log(`  pages=${pages}`);
  console.log(`  raw_rows=${rawRows}`);
  console.log(`  unique_titles=${rows.length}`);
  console.log(`  upserted=${upserted}`);
  console.log(`  upsert_errors=${upsertErrors}`);
  console.log(`  skipped_no_shiki=${skippedNoShiki}`);
  console.log(`  by_translation=${byTranslationSorted.map(([id, c]) => `${id}:${c}`).join(', ')}`);
}

main().catch((error) => {
  console.error('[sync] fatal', error);
  process.exit(1);
});
