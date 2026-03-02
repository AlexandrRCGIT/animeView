/**
 * Прогоняет ВСЕ аниме из Supabase через MALibria mapped.json
 * и записывает anilibria_id туда, где он ещё не проставлен.
 *
 * MALibria: https://github.com/qt-kaneko/MALibria
 * Маппинг: { anilibria_id, myanimelist_id, episodes }[]
 * MAL ID = Shikimori ID (совпадают)
 *
 * Запуск: node scripts/push-malibria.mjs
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

// ── Загружаем MALibria ────────────────────────────────────────────────────────
console.log('[MALibria] Загружаем mapped.json с GitHub…');
const malibriaRes = await fetch(
  'https://raw.githubusercontent.com/qt-kaneko/MALibria/db/mapped.json',
  { headers: { Accept: 'application/json' } }
);
if (!malibriaRes.ok) {
  console.error('Не удалось загрузить MALibria:', malibriaRes.status);
  process.exit(1);
}
const malibriaRaw = await malibriaRes.json();
// Строим Map: mal_id → anilibria_id
const malMap = new Map(malibriaRaw.map(e => [e.myanimelist_id, e.anilibria_id]));
console.log(`[MALibria] Загружено ${malMap.size} записей`);

// ── Получаем все аниме из БД (постранично) ────────────────────────────────────
console.log('[DB] Загружаем все аниме из Supabase…');

async function fetchPage(offset) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/anime?select=id,anilibria_id&order=id&limit=1000&offset=${offset}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
        'Accept-Profile': 'public',
      },
    }
  );
  if (!res.ok) throw new Error(`DB error ${res.status}: ${await res.text()}`);
  return res.json();
}

const allAnime = [];
let offset = 0;
while (true) {
  const page = await fetchPage(offset);
  allAnime.push(...page);
  if (page.length < 1000) break;
  offset += 1000;
}
console.log(`[DB] Всего в БД: ${allAnime.length} аниме`);

// ── Фильтруем: только те, у кого нет anilibria_id ─────────────────────────────
const withoutId = allAnime.filter(a => a.anilibria_id == null);
console.log(`[DB] Без anilibria_id: ${withoutId.length}`);

// ── Матчим через MALibria ─────────────────────────────────────────────────────
const toUpdate = [];
for (const anime of withoutId) {
  const anilibriaId = malMap.get(anime.id);
  if (anilibriaId != null) {
    toUpdate.push({ shikimori_id: anime.id, anilibria_id: anilibriaId });
  }
}
console.log(`[MALibria] Найдено совпадений: ${toUpdate.length}`);

if (!toUpdate.length) {
  console.log('Нечего обновлять.');
  process.exit(0);
}

// ── Обновляем в БД через PATCH ────────────────────────────────────────────────
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
  if (!res.ok) throw new Error(`PATCH error ${res.status}: ${await res.text()}`);
}

const CONCURRENCY = 15;
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
console.log(`Осталось без anilibria_id: ${withoutId.length - done}`);
