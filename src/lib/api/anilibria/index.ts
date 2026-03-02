/**
 * Anilibria v1 API client
 * Base: https://anilibria.top/api/v1
 * Auth: not required
 */

const BASE = 'https://anilibria.top/api/v1';

interface AnilibriaRelease {
  id: number;
  name: { main: string; english?: string | null };
  external_player: string | null;
}

function normalizeUrl(raw: string): string {
  return raw.startsWith('//') ? 'https:' + raw : raw;
}

// Стоп-слова, которые не несут смысловой нагрузки
const STOP = new Set(['no', 'wa', 'the', 'a', 'an', 'to', 'ga', 'ni', 'de', 'wo', 'и', 'в', 'с', 'на', 'из']);

/**
 * Разбивает строку на значимые токены, включая числа и короткие слова.
 * "Гинтама 7" → ['гинтама', '7']
 * "Sword Art Online II" → ['sword', 'art', 'online', 'ii']
 */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length >= 1 && !STOP.has(w));
}

/** Jaccard similarity по токенам */
function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  return intersection / (ta.size + tb.size - intersection);
}

/**
 * Базовое имя без подзаголовка и суффиксов сезонов.
 * "Магическая битва: Смертельная миграция" → "Магическая битва"
 * "Sword Art Online II" → "Sword Art Online"
 * "Гинтама 7" → "Гинтама"
 */
function baseName(s: string): string {
  return s
    .replace(/:\s*.+$/, '')
    .replace(/\s+(season|сезон|part|часть)\s*\d+.*/i, '')
    .replace(/\s+\(?(\d{4})\)?\s*$/, '')
    .replace(/\s+[IVXivx]{1,5}\s*$/, '')      // римские цифры в конце
    .replace(/\s+\d+\s*$/, '')                  // арабские в конце
    .trim();
}

/**
 * Проверяет, что тайтл является "сезонно-специфичным":
 * имеет подзаголовок или числовой суффикс, отличающий его от базы.
 */
function isSeasonSpecific(s: string): boolean {
  return s.includes(':') ||
    /\s+(season|сезон|part|часть)\s*\d+/i.test(s) ||
    /\s+[IVX]{1,5}\s*$/i.test(s) ||
    /\s+\d+\s*$/.test(s);
}

/**
 * Строгая проверка совпадения с защитой от сезонного мисматча.
 *
 * Проблема старой реализации: overlap(a, b) = common / min(|a|, |b|)
 * "Гинтама" (1 токен) vs "Гинтама 7" (2 токена) → 1/1 = 1.0 — ложное совпадение!
 *
 * Новая логика:
 * 1. Jaccard ≥ 0.85 (строгий порог по всем токенам)
 * 2. Если один из тайтлов сезонно-специфичен — Jaccard ≥ 0.8
 *    + базовые имена обоих должны совпадать (jaccard ≥ 0.8)
 * 3. Если базовые имена совпадают точно (jaccard = 1.0), но один специфичен,
 *    а другой — нет → REJECT (разные сезоны одной франшизы)
 */
function isMatch(query: string, release: AnilibriaRelease): boolean {
  const names = [release.name.main, release.name.english].filter(Boolean) as string[];

  for (const releaseName of names) {
    const sim = jaccard(query, releaseName);

    // Строгий порог для общего совпадения
    if (sim < 0.8) continue;

    // Если sim ≥ 0.8 — проверяем сезонный мисматч
    const qSpecific = isSeasonSpecific(query);
    const rSpecific = isSeasonSpecific(releaseName);

    // Оба без спецификатора или оба со спецификатором → OK
    if (qSpecific === rSpecific) return true;

    // Один специфичен, другой нет → должны совпадать базовые имена И
    // при этом специфичный тайтл должен быть «расширением» базового
    const qBase = baseName(query);
    const rBase = baseName(releaseName);
    const baseSim = jaccard(qBase, rBase);

    // Если базы идентичны → это значит один — общий тайтл, другой — конкретный сезон → REJECT
    if (baseSim >= 0.95) continue;

    // Иначе — если совпадение достаточно высокое → разрешаем
    if (sim >= 0.9) return true;
  }

  return false;
}

/**
 * Получает external_player URL напрямую по Anilibria ID.
 * Самый надёжный способ — ID берётся из MALibria маппинга.
 */
export async function getAnilibriaUrlById(anilibriaId: number): Promise<string | null> {
  const res = await fetch(`${BASE}/anime/releases/${anilibriaId}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as AnilibriaRelease;
  if (!data.external_player) return null;
  return normalizeUrl(data.external_player);
}

async function searchReleases(query: string): Promise<AnilibriaRelease[]> {
  const url = `${BASE}/app/search/releases?query=${encodeURIComponent(query)}&limit=8`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json() as AnilibriaRelease[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fallback: поиск по названию, возвращает id + url совпавшего релиза.
 * Используется если anilibria_id не известен через MALibria или БД.
 *
 * Стратегия:
 * 1. Поиск по полному названию (с подзаголовком)
 * 2. Если не нашли — поиск по базовому имени (до ":")
 * Строгая проверка совпадения защищает от сезонного мисматча.
 */
export async function findAnilibriaRelease(
  titles: string[],
): Promise<{ id: number; url: string } | null> {
  const queries: string[] = [];

  for (const title of titles) {
    if (!title?.trim()) continue;
    queries.push(title);
    // Дополнительно ищем по базовому имени если тайтл специфичен
    const base = baseName(title);
    if (base && base !== title && !queries.includes(base)) {
      queries.push(base);
    }
  }

  for (const query of queries) {
    try {
      const results = await searchReleases(query);
      for (const r of results) {
        if (!r.external_player) continue;
        if (!isMatch(query, r)) continue;
        return { id: r.id, url: normalizeUrl(r.external_player) };
      }
    } catch {
      // try next query
    }
  }

  return null;
}

/**
 * Fallback: поиск по названию — возвращает только URL (для обратной совместимости).
 */
export async function getAnilibriaUrl(titles: string[]): Promise<string | null> {
  const result = await findAnilibriaRelease(titles);
  return result?.url ?? null;
}
