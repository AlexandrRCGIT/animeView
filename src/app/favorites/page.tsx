import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getAllFavoriteEntries, type WatchStatus } from '@/app/actions/favorites';
import { getAnimeByIds, dbToAnimeShort } from '@/lib/db/anime';
import { NavBar } from '@/components/home/NavBar';
import { FavoritesTabs } from '@/components/anime/FavoritesTabs';
import type { AnimeShort } from '@/lib/api/shikimori';

export const metadata = { title: 'Мои аниме — AnimeView' };
export const dynamic = 'force-dynamic';

type TabKey = WatchStatus | 'favorited';

export default async function FavoritesPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin?callbackUrl=/favorites');

  // 1. Все записи пользователя
  const entries = await getAllFavoriteEntries().catch(() => []);
  if (entries.length === 0) return <EmptyPage />;

  // 2. Загружаем аниме из локальной БД
  const ids = entries.map(e => e.shikimori_id);
  const animes = await getAnimeByIds(ids).catch(() => []);
  const animeMap = new Map(animes.map(a => [a.id, dbToAnimeShort(a)]));

  // 3. Группируем по статусу
  const groups: Record<TabKey, AnimeShort[]> = {
    watching:  [],
    completed: [],
    planned:   [],
    on_hold:   [],
    dropped:   [],
    favorited: [],
  };

  for (const entry of entries) {
    const key = (entry.watch_status ?? 'favorited') as TabKey;
    const anime = animeMap.get(entry.shikimori_id);
    if (anime) groups[key].push(anime);
  }

  const allIds = new Set(ids);
  const totalNonDropped = entries.filter(e => e.watch_status !== 'dropped').length;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '100px 40px 80px' }}>
        <FavoritesTabs
          groups={groups}
          allIds={allIds}
          totalNonDropped={totalNonDropped}
        />
      </main>
    </div>
  );
}

function EmptyPage() {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', gap: 16, textAlign: 'center',
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth="1.2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Список пуст
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.15)', margin: 0 }}>
          Открывай тайтлы и добавляй их в свой список
        </p>
        <Link href="/search" style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 12,
          background: '#6C3CE1', color: '#fff', textDecoration: 'none',
          fontSize: 14, fontWeight: 600,
        }}>
          Перейти в каталог
        </Link>
      </div>
    </div>
  );
}
