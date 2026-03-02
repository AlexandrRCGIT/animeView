/**
 * Записывает anilibria_id в Supabase по shikimori_id на основе mapping-файла.
 * Пропускает SEASON_MISMATCH записи.
 *
 * Запуск: node scripts/push-anilibria-ids.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Читаем .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  const lines = readFileSync(resolve(__dir, '../.env.local'), 'utf8').split('\n');
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

// ── Загружаем маппинг ─────────────────────────────────────────────────────────
const mapping = JSON.parse(
  readFileSync(resolve(__dir, 'anilibria-mapping.json'), 'utf8')
);

// Только записи с найденным ID и без SEASON_MISMATCH
const toUpdate = mapping.filter(r =>
  r.anilibria_id !== null && !r.warning?.includes('SEASON_MISMATCH')
);

console.log(`Всего в маппинге:    ${mapping.length}`);
console.log(`С anilibria_id:      ${mapping.filter(r => r.anilibria_id !== null).length}`);
console.log(`Пропущено (мисматч): ${mapping.filter(r => r.warning?.includes('SEASON_MISMATCH')).length}`);
console.log(`Будет обновлено:     ${toUpdate.length}`);
console.log();

// ── Одиночный PATCH для одной строки ─────────────────────────────────────────
async function patchOne(shikimoriId, anilibriaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/anime?id=eq.${shikimoriId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ anilibria_id: anilibriaId }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
}

// ── Главная функция ───────────────────────────────────────────────────────────
async function main() {
  const CONCURRENCY = 10; // параллельных запросов
  let done = 0;
  let errors = 0;

  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const batch = toUpdate.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(r => patchOne(r.shikimori_id, r.anilibria_id))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') done++;
      else { errors++; console.error('\nОшибка:', r.reason?.message); }
    }
    process.stdout.write(`\rОбновлено: ${done}/${toUpdate.length}`);
  }

  console.log(`\n\nГотово. Успешно: ${done}, ошибок: ${errors}`);

  // Показываем пропущенные SEASON_MISMATCH для ручной проверки
  const skipped = mapping.filter(r => r.warning?.includes('SEASON_MISMATCH'));
  if (skipped.length) {
    console.log('\n⚠️  Пропущено (SEASON_MISMATCH) — нужна ручная проверка:');
    console.log('shikimori_id | DB title → Anilibria title [anilibria_id]');
    for (const r of skipped) {
      console.log(`  ${r.shikimori_id} | "${r.db_russian}" → "${r.anilibria_russian}" [${r.anilibria_id}]`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
