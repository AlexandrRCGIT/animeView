import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { NavBar } from '@/components/home/NavBar';
import { supabase } from '@/lib/supabase';
import { getAnimeByIds, getPreferredAnimeTitle } from '@/lib/db/anime';
import { HistoryCard } from '@/components/ui/HistoryCard';

export const metadata = { title: 'История просмотра — AnimeView' };
export const dynamic = 'force-dynamic';

interface WatchProgressRow {
  shikimori_id: number;
  season: number;
  episode: number;
  translation_title: string | null;
  progress_seconds: number | null;
  duration_seconds: number | null;
  is_completed: boolean;
  updated_at: string;
}

interface HistoryItem extends WatchProgressRow {
  title: string;
  poster_url: string | null;
}

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/history');
  }

  const { data, error } = await supabase
    .from('watch_progress')
    .select(
      'shikimori_id, season, episode, translation_title, progress_seconds, duration_seconds, is_completed, updated_at',
    )
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })
    .limit(300);

  const rawRows = ((data ?? []) as WatchProgressRow[]);
  if (error || !rawRows.length) {
    return <EmptyHistory schemaMissing={Boolean(error)} />;
  }

  const animeIds = rawRows.map((row) => row.shikimori_id);
  const animeList = await getAnimeByIds(animeIds).catch(() => []);
  const animeMap = new Map(
    animeList.map((anime) => [
      anime.shikimori_id,
      { title: getPreferredAnimeTitle(anime), poster_url: anime.poster_url },
    ]),
  );

  const items: HistoryItem[] = rawRows
    .map((row) => {
      const anime = animeMap.get(row.shikimori_id);
      if (!anime) return null;
      return { ...row, ...anime };
    })
    .filter((row): row is HistoryItem => row !== null);

  const inProgress = items.filter((row) => !row.is_completed);
  const completed = items.filter((row) => row.is_completed);

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 40px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: 30,
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            История просмотра
          </h1>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Недосмотренные и досмотренные тайтлы, к которым можно быстро вернуться.
          </p>
        </div>

        <HistorySection title="Продолжить просмотр" rows={inProgress} emptyText="Нет недосмотренных тайтлов" />
        <HistorySection title="Досмотренные" rows={completed} emptyText="Пока нет досмотренных тайтлов" />
      </main>
    </div>
  );
}

function HistorySection({ title, rows, emptyText }: { title: string; rows: HistoryItem[]; emptyText: string }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.35)',
          marginBottom: 12,
        }}
      >
        {title}
      </h2>

      {rows.length === 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px dashed rgba(255,255,255,0.12)',
            padding: '22px 18px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 14,
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {rows.map((row) => (
            <HistoryCard
              key={row.shikimori_id}
              shikimoriId={row.shikimori_id}
              title={row.title}
              poster_url={row.poster_url}
              season={row.season}
              episode={row.episode}
              translation_title={row.translation_title}
              progress_seconds={row.progress_seconds}
              duration_seconds={row.duration_seconds}
              is_completed={row.is_completed}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyHistory({ schemaMissing }: { schemaMissing: boolean }) {
  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '120px 40px 80px' }}>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            padding: '22px 20px',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>История пока пуста</h1>
          <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Открой любой тайтл и начни просмотр, чтобы он появился в истории.
          </p>
          {schemaMissing && (
            <p style={{ marginTop: 8, color: '#fca5a5', fontSize: 13 }}>
              Таблица истории не найдена. Примените SQL миграцию `supabase/migration_watch_progress.sql`.
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <Link
              href="/search"
              style={{
                display: 'inline-block',
                padding: '9px 16px',
                borderRadius: 10,
                background: '#6C3CE1',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Перейти в каталог
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
