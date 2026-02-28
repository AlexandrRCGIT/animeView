import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getAllFavoriteEntries, type WatchStatus } from '@/app/actions/favorites';
import { getAnimeByIds, dbToAnimeShort } from '@/lib/db/anime';
import { NavBar } from '@/components/home/NavBar';
import { AnimeGrid } from '@/components/anime/AnimeGrid';

export const metadata = { title: 'Мои аниме — AnimeView' };
export const dynamic = 'force-dynamic';

// ─── Конфигурация групп ────────────────────────────────────────────────────────

type TabKey = WatchStatus | 'favorited';

const TABS: { key: TabKey; label: string; color: string; icon: string }[] = [
  { key: 'watching',  label: 'Смотрю',        color: '#3CE1A8', icon: '▶' },
  { key: 'completed', label: 'Просмотрено',    color: '#6C3CE1', icon: '✓' },
  { key: 'planned',   label: 'Буду смотреть',  color: '#3C7EE1', icon: '◷' },
  { key: 'on_hold',   label: 'Отложено',       color: '#E1A83C', icon: '⏸' },
  { key: 'favorited', label: 'Избранное',      color: '#E13C6E', icon: '♥' },
  { key: 'dropped',   label: 'Брошено',        color: '#666',    icon: '✕' },
];

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function FavoritesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/favorites');

  const params = await searchParams;

  // 1. Все записи пользователя из favorites
  const entries = await getAllFavoriteEntries().catch(() => []);
  if (entries.length === 0) return <EmptyPage />;

  // 2. Аниме из нашей БД
  const ids = entries.map(e => e.shikimori_id);
  const animes = await getAnimeByIds(ids).catch(() => []);
  const animeMap = new Map(animes.map(a => [a.id, dbToAnimeShort(a)]));

  // 3. Группировка
  const groups: Record<TabKey, number[]> = {
    watching:  [],
    completed: [],
    planned:   [],
    on_hold:   [],
    dropped:   [],
    favorited: [],
  };

  for (const entry of entries) {
    const key = (entry.watch_status ?? 'favorited') as TabKey;
    groups[key].push(entry.shikimori_id);
  }

  // 4. Активная вкладка — первая непустая или из URL
  const firstNonEmpty = TABS.find(t => groups[t.key].length > 0)?.key ?? 'favorited';
  const rawTab = params.tab as TabKey | undefined;
  const activeTab: TabKey =
    rawTab && TABS.some(t => t.key === rawTab) ? rawTab : firstNonEmpty;

  // 5. Список аниме для текущей вкладки
  const activeIds = groups[activeTab];
  const activeAnimes = activeIds
    .map(id => animeMap.get(id))
    .filter(Boolean) as ReturnType<typeof dbToAnimeShort>[];

  const totalAll = entries.length - groups.dropped.length; // не считаем брошенные

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '100px 40px 80px' }}>

        {/* ── Заголовок ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 34, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', margin: 0,
          }}>Мои аниме</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 }}>
            {totalAll} {plural(totalAll, 'тайтл', 'тайтла', 'тайтлов')} в списке
          </p>
        </div>

        {/* ── Вкладки ────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 36,
          borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0,
        }}>
          {TABS.map(tab => {
            const count = groups[tab.key].length;
            if (count === 0) return null;
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/favorites?tab=${tab.key}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: '10px 10px 0 0',
                  textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s',
                  background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: active ? tab.color : 'rgba(255,255,255,0.4)',
                  borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <span style={{ fontSize: 11 }}>{tab.icon}</span>
                {tab.label}
                <span style={{
                  padding: '1px 7px', borderRadius: 6, fontSize: 11,
                  background: active ? `${tab.color}22` : 'rgba(255,255,255,0.06)',
                  color: active ? tab.color : 'rgba(255,255,255,0.3)',
                }}>{count}</span>
              </Link>
            );
          })}
        </div>

        {/* ── Сетка аниме ────────────────────────────────────────────────────── */}
        {activeAnimes.length > 0 ? (
          <AnimeGrid
            animes={activeAnimes}
            favoritedIds={new Set(ids)}
            isLoggedIn={true}
          />
        ) : (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'rgba(255,255,255,0.25)', fontSize: 16,
          }}>
            Здесь пока пусто
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Страница без аниме ────────────────────────────────────────────────────────

function EmptyPage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', gap: 16, textAlign: 'center',
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Список пуст
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)', margin: 0 }}>
          Открывай тайтлы и добавляй их в свой список
        </p>
        <Link
          href="/search"
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 12,
            background: '#6C3CE1', color: '#fff', textDecoration: 'none',
            fontSize: 14, fontWeight: 600,
          }}
        >
          Перейти в каталог
        </Link>
      </div>
    </div>
  );
}

// ─── Утилита склонения ────────────────────────────────────────────────────────

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
