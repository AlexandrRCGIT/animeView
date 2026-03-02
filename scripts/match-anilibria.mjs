/**
 * Скрипт для сопоставления аниме из Supabase с релизами Anilibria.
 * Результат → scripts/anilibria-mapping.json
 *
 * Запуск: node scripts/match-anilibria.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Читаем .env.local ─────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dir, '../.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Не найдены NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env.local');
  process.exit(1);
}

// ── Supabase fetch ────────────────────────────────────────────────────────────

async function supabaseFetch(path, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Получаем 1000 аниме из БД (по members — самые популярные) ────────────────

async function fetchDBAnime() {
  console.log('[DB] Загружаем топ-1000 из Supabase…');
  const rows = await supabaseFetch(
    'anime',
    '?select=id,name,russian,status&order=members.desc.nullslast&limit=1000',
  );
  console.log(`[DB] Получено: ${rows.length} аниме`);
  return rows;
}

// ── Получаем все релизы Anilibria (1812 штук) ─────────────────────────────────

async function fetchAnilibriaAll() {
  console.log('[Anilibria] Загружаем все релизы…');
  const PER_PAGE = 50;
  const results = [];
  let page = 1;
  let totalPages = null;

  while (true) {
    const url = `https://anilibria.top/api/v1/anime/catalog/releases?page=${page}&limit=${PER_PAGE}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Anilibria error ${res.status}`);
    const json = await res.json();

    results.push(...json.data);

    if (totalPages === null) {
      totalPages = json.meta.pagination.total_pages;
      console.log(`[Anilibria] Всего страниц: ${totalPages}, релизов: ${json.meta.pagination.total}`);
    }

    process.stdout.write(`\r[Anilibria] Страница ${page}/${totalPages}`);

    if (page >= totalPages) break;
    page++;
    // небольшая пауза чтобы не перегружать API
    await new Promise(r => setTimeout(r, 120));
  }

  console.log(`\n[Anilibria] Получено: ${results.length} релизов`);
  return results;
}

// ── Нормализация заголовка ────────────────────────────────────────────────────

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Слова из строки (фильтруем стоп-слова и числа-порядки)
function words(str) {
  const STOP = new Set(['the', 'a', 'an', 'no', 'wa', 'to', 'ga', 'ni', 'de', 'wo', 'и', 'в', 'на', 'за', 'из', 'по']);
  return normalize(str).split(' ').filter(w => w.length > 1 && !STOP.has(w));
}

// Jaccard similarity по словам
function wordSimilarity(a, b) {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (!wa.size || !wb.size) return 0;
  let intersection = 0;
  for (const w of wa) if (wb.has(w)) intersection++;
  return intersection / (wa.size + wb.size - intersection);
}

// Удалить сезонный суффикс/префикс для базового имени
// "Магическая битва: Смертельная миграция" → "Магическая битва"
// "Jujutsu Kaisen Season 2" → "Jujutsu Kaisen"
function baseName(str) {
  if (!str) return '';
  return str
    .replace(/:\s*.+$/, '')                        // всё после ":"
    .replace(/\s+(season|сезон|part|часть)\s*\d+.*/i, '') // season N, часть N
    .replace(/\s+\d+(st|nd|rd|th)\s+(season|cour).*/i, '')
    .replace(/\s+\(.*\)\s*$/i, '')                 // (2024), (2025)
    .replace(/\s+\d{4}\s*$/, '')                   // trailing year
    .trim();
}

// Одно название является точным базовым именем другого?
function isBaseNameConflict(a, b) {
  const ba = normalize(baseName(a));
  const bb = normalize(baseName(b));
  return ba === bb && normalize(a) !== normalize(b);
}

// ── Сопоставление ─────────────────────────────────────────────────────────────

function matchAnime(dbAnime, anilibriaReleases) {
  // Строим индексы по нормализованным ключам
  const byRu = new Map();
  const byEn = new Map();

  for (const r of anilibriaReleases) {
    const nRu = normalize(r.name.main);
    const nEn = normalize(r.name.english);
    if (nRu) {
      if (!byRu.has(nRu)) byRu.set(nRu, []);
      byRu.get(nRu).push(r);
    }
    if (nEn) {
      if (!byEn.has(nEn)) byEn.set(nEn, []);
      byEn.get(nEn).push(r);
    }
  }

  const results = [];

  for (const anime of dbAnime) {
    const nRu = normalize(anime.russian);
    const nEn = normalize(anime.name);

    // 1) Точное совпадение русского
    let candidates = byRu.get(nRu) || [];
    let matchType = 'exact_russian';

    // 2) Точное совпадение английского
    if (!candidates.length) {
      candidates = byEn.get(nEn) || [];
      matchType = 'exact_english';
    }

    // 3) Fuzzy: Jaccard ≥ 0.7 по русскому ИЛИ английскому
    if (!candidates.length) {
      const fuzzy = [];
      for (const r of anilibriaReleases) {
        const simRu = wordSimilarity(anime.russian, r.name.main);
        const simEn = wordSimilarity(anime.name, r.name.english || '');
        const sim = Math.max(simRu, simEn);
        if (sim >= 0.7) fuzzy.push({ r, sim });
      }
      fuzzy.sort((a, b) => b.sim - a.sim);
      candidates = fuzzy.map(f => f.r);
      matchType = 'fuzzy';
    }

    if (!candidates.length) {
      results.push({
        shikimori_id: anime.id,
        db_russian: anime.russian || null,
        db_english: anime.name || null,
        status: anime.status,
        anilibria_id: null,
        anilibria_russian: null,
        anilibria_english: null,
        match_type: 'no_match',
        warning: null,
      });
      continue;
    }

    // Берём первого кандидата
    const best = candidates[0];

    // Детектируем конфликт базового имени (сезон/арк мисматч)
    let warning = null;
    const ruConflict = isBaseNameConflict(anime.russian || '', best.name.main || '');
    const enConflict = isBaseNameConflict(anime.name || '', best.name.english || '');

    if (ruConflict || enConflict) {
      // Ищем точный матч среди кандидатов на одно базовое имя
      const exactFit = candidates.find(r =>
        normalize(r.name.main) === nRu || normalize(r.name.english) === nEn
      );
      if (!exactFit) {
        warning = `SEASON_MISMATCH: DB="${anime.russian || anime.name}" → Anilibria="${best.name.main}"`;
      }
    }

    // Если несколько кандидатов — отмечаем
    if (candidates.length > 1 && !warning) {
      warning = `MULTIPLE_CANDIDATES (${candidates.length}): ${candidates.slice(0,3).map(r => `"${r.name.main}"[${r.id}]`).join(', ')}`;
    }

    results.push({
      shikimori_id: anime.id,
      db_russian: anime.russian || null,
      db_english: anime.name || null,
      status: anime.status,
      anilibria_id: best.id,
      anilibria_russian: best.name.main || null,
      anilibria_english: best.name.english || null,
      match_type: matchType,
      warning,
    });
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [dbAnime, anilibriaReleases] = await Promise.all([
    fetchDBAnime(),
    fetchAnilibriaAll(),
  ]);

  console.log('\n[Match] Сопоставляем…');
  const results = matchAnime(dbAnime, anilibriaReleases);

  const matched  = results.filter(r => r.anilibria_id !== null);
  const noMatch  = results.filter(r => r.anilibria_id === null);
  const warnings = results.filter(r => r.warning);

  console.log(`\n=== Результат ===`);
  console.log(`Всего DB:         ${results.length}`);
  console.log(`Найдено в Anilibria: ${matched.length}`);
  console.log(`Не найдено:       ${noMatch.length}`);
  console.log(`С предупреждениями: ${warnings.length}`);

  if (warnings.length) {
    console.log('\n--- Предупреждения ---');
    for (const w of warnings) {
      console.log(`  [${w.shikimori_id}] ${w.warning}`);
    }
  }

  const outPath = resolve(__dir, 'anilibria-mapping.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nJSON сохранён: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
