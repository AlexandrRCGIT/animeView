import { supabase } from '@/lib/supabase';

const SHIKI_BASE = 'https://shikimori.one/api';
const MAX_RETRIES = 3;
const DELAY_MS = 350;

interface RawRelatedRow {
  anime?: {
    id: number;
    russian?: string;
    name?: string;
    kind?: string;
    aired_on?: string;
  } | null;
  relation?: string | null;
  relation_russian?: string | null;
}

interface RelatedEntry {
  id: number;
  relation: string | null;
  relation_russian: string | null;
  title: string | null;
  kind: string | null;
  aired_on: string | null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchShikimoriRelated(shikimoriId: number): Promise<RawRelatedRow[]> {
  const url = `${SHIKI_BASE}/animes/${shikimoriId}/related`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AnimeView/1.0',
        },
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < MAX_RETRIES) {
        await sleep(attempt * 1200);
        continue;
      }
      console.warn(`[enrichRelated] fetch failed for id=${shikimoriId}:`, err);
      return [];
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      const json = await response.json();
      return Array.isArray(json) ? json : [];
    }

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get('retry-after') ?? 0);
      const backoff = retryAfter > 0 ? retryAfter * 1000 : attempt * 1200;
      await sleep(backoff);
      continue;
    }

    console.warn(`[enrichRelated] Shikimori ${response.status} for id=${shikimoriId}`);
    return [];
  }

  return [];
}

function normalizeRelations(
  raw: RawRelatedRow[],
  existingIds: Set<number>,
  sourceId: number,
): { relatedIds: number[]; relatedData: RelatedEntry[] } {
  const map = new Map<number, RelatedEntry>();

  for (const row of raw) {
    const anime = row?.anime;
    if (!anime || typeof anime.id !== 'number') continue;
    const id = Number(anime.id);
    if (!Number.isFinite(id) || id <= 0 || id === sourceId) continue;
    if (!existingIds.has(id)) continue;
    if (map.has(id)) continue;

    map.set(id, {
      id,
      relation: row.relation ?? null,
      relation_russian: row.relation_russian ?? null,
      title: anime.russian ?? anime.name ?? null,
      kind: anime.kind ?? null,
      aired_on: anime.aired_on ?? null,
    });
  }

  const relatedData = [...map.values()];
  const relatedIds = relatedData.map(x => x.id);
  return { relatedIds, relatedData };
}

/**
 * Для каждого ID из ids:
 * - Пропускает те, у кого related_ids уже не пустой
 * - Запрашивает Shikimori /related
 * - Пишет related_ids + related_data в Supabase
 * - Добавляет двусторонние связи (без доп. API-вызовов)
 */
export async function enrichRelatedBatch(
  ids: number[],
  existingIds: Set<number>,
): Promise<{ updated: number; skipped: number; errors: number }> {
  const result = { updated: 0, skipped: 0, errors: 0 };

  if (ids.length === 0) return result;

  // Загрузить текущие related_ids для всех запрашиваемых ID
  const { data: currentRows, error: fetchErr } = await supabase
    .from('anime')
    .select('shikimori_id, related_ids')
    .in('shikimori_id', ids);

  if (fetchErr) {
    console.error('[enrichRelated] Failed to fetch current rows:', fetchErr.message);
    result.errors += ids.length;
    return result;
  }

  const currentMap = new Map<number, number[]>();
  for (const row of currentRows ?? []) {
    currentMap.set(Number(row.shikimori_id), row.related_ids ?? []);
  }

  for (const sourceId of ids) {
    const existingRelated = currentMap.get(sourceId) ?? [];

    // Пропускаем если related_ids уже заполнен
    if (existingRelated.length > 0) {
      result.skipped++;
      continue;
    }

    try {
      const raw = await fetchShikimoriRelated(sourceId);
      const { relatedIds, relatedData } = normalizeRelations(raw, existingIds, sourceId);

      // Обновляем запись источника
      const { error: updateErr } = await supabase
        .from('anime')
        .update({ related_ids: relatedIds, related_data: relatedData })
        .eq('shikimori_id', sourceId);

      if (updateErr) {
        console.error(`[enrichRelated] Update error for ${sourceId}:`, updateErr.message);
        result.errors++;
        await sleep(DELAY_MS);
        continue;
      }

      result.updated++;

      // Двусторонние связи: добавляем sourceId в related_ids каждого из relatedIds
      // Используем параллельные запросы вместо последовательных N+1
      if (relatedIds.length > 0) {
        const { data: targetRows } = await supabase
          .from('anime')
          .select('shikimori_id, related_ids')
          .in('shikimori_id', relatedIds);

        const updatePromises = (targetRows ?? [])
          .filter(target => {
            const tids: number[] = target.related_ids ?? [];
            return !tids.includes(sourceId);
          })
          .map(target => {
            const tid = Number(target.shikimori_id);
            const tids: number[] = target.related_ids ?? [];
            return supabase
              .from('anime')
              .update({ related_ids: [...tids, sourceId] })
              .eq('shikimori_id', tid);
          });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
        }
      }
    } catch (err) {
      console.error(`[enrichRelated] Error for ${sourceId}:`, err);
      result.errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`[enrichRelated] updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`);
  return result;
}
