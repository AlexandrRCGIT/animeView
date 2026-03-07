import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHIKI_BASE = process.env.SHIKIMORI_API_BASE || 'https://shikimori.one/api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

function getArgNumber(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  const value = Number(args[idx + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const limitArg = getArgNumber('--limit', 0);
const offsetArg = getArgNumber('--offset', 0);
const delayMs = getArgNumber('--delay-ms', 350);
const maxRetries = getArgNumber('--retries', 5);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickAnimeNode(row) {
  if (row?.anime && typeof row.anime.id === 'number') return row.anime;
  return null;
}

function normalizeRelations(rawRows, existingIds, sourceId) {
  const map = new Map();

  for (const row of rawRows) {
    const anime = pickAnimeNode(row);
    if (!anime) continue;
    const id = Number(anime.id);
    if (!Number.isFinite(id) || id <= 0 || id === sourceId) continue;
    if (!existingIds.has(id)) continue;
    if (map.has(id)) continue;

    map.set(id, {
      id,
      relation: row?.relation ?? null,
      relation_russian: row?.relation_russian ?? null,
      title: anime.russian ?? anime.name ?? null,
      kind: anime.kind ?? null,
      aired_on: anime.aired_on ?? null,
    });
  }

  const relatedData = [...map.values()];
  const relatedIds = relatedData.map((x) => x.id);
  return { relatedIds, relatedData };
}

function sameIds(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Number(a[i]) !== Number(b[i])) return false;
  }
  return true;
}

async function fetchRelatedRows(shikimoriId) {
  const url = `${SHIKI_BASE}/animes/${shikimoriId}/related`;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AnimeViewBot/1.0',
      },
    });

    if (response.ok) {
      const json = await response.json();
      return Array.isArray(json) ? json : [];
    }

    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get('retry-after') ?? 0);
      const backoff = retryAfter > 0 ? retryAfter * 1000 : attempt * 1200;
      await sleep(backoff);
      continue;
    }

    const text = await response.text().catch(() => '');
    throw new Error(`Shikimori ${response.status}: ${text.slice(0, 200)}`);
  }

  return [];
}

async function loadAnimeRows() {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('anime')
      .select('shikimori_id, related_ids')
      .order('shikimori_id', { ascending: true })
      .range(from, to);

    if (error) {
      if (String(error.message).includes('related_ids')) {
        throw new Error(
          'В таблице anime нет related_ids/related_data.'
        );
      }
      throw new Error(`Supabase read error: ${error.message}`);
    }

    const chunk = data ?? [];
    if (!chunk.length) break;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }

  return rows;
}

async function main() {
  const allRows = await loadAnimeRows();
  const existingIds = new Set(allRows.map((row) => Number(row.shikimori_id)));

  let rows = allRows;
  if (!force) {
    rows = rows.filter((row) => !Array.isArray(row.related_ids) || row.related_ids.length === 0);
  }

  if (offsetArg > 0) rows = rows.slice(offsetArg);
  if (limitArg > 0) rows = rows.slice(0, limitArg);

  console.log(`[related] total_in_db=${allRows.length}`);
  console.log(`[related] to_process=${rows.length} dry_run=${dryRun} force=${force}`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const sid = Number(row.shikimori_id);
    if (!Number.isFinite(sid) || sid <= 0) {
      skipped += 1;
      continue;
    }

    try {
      const relatedRows = await fetchRelatedRows(sid);
      const { relatedIds, relatedData } = normalizeRelations(relatedRows, existingIds, sid);
      const prevIds = Array.isArray(row.related_ids) ? row.related_ids.map(Number) : [];

      if (sameIds(prevIds, relatedIds)) {
        skipped += 1;
      } else if (!dryRun) {
        const { error } = await supabase
          .from('anime')
          .update({
            related_ids: relatedIds,
            related_data: relatedData,
          })
          .eq('shikimori_id', sid);

        if (error) {
          throw new Error(`Supabase update error: ${error.message}`);
        }
        updated += 1;
      } else {
        updated += 1;
      }
    } catch (error) {
      errors += 1;
      console.error(`[related] sid=${sid} error=${error instanceof Error ? error.message : String(error)}`);
    }

    processed += 1;
    if (processed % 100 === 0) {
      console.log(`[related] processed=${processed}/${rows.length} updated=${updated} skipped=${skipped} errors=${errors}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  console.log('[related] done');
  console.log(`[related] processed=${processed}`);
  console.log(`[related] updated=${updated}`);
  console.log(`[related] skipped=${skipped}`);
  console.log(`[related] errors=${errors}`);
}

main().catch((error) => {
  console.error('[related] fatal', error);
  process.exit(1);
});
