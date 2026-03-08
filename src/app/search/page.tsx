import type { Metadata } from 'next';
import { Suspense } from 'react';
import { queryAnimeFromDB, dbToAnimeShort } from '@/lib/db/anime';
import { AnimeGrid } from '@/components/anime/AnimeGrid';
import { Pagination } from '@/components/ui/Pagination';
import { FilterBar } from '@/components/ui/FilterBar';
import { NavBar } from '@/components/home/NavBar';
import type { ViewMode } from '@/components/ui/FilterBar';
import { auth } from '@/auth';
import { getFavorites } from '@/app/actions/favorites';

const LIMIT = 24;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  if (q) return { title: `«${q}» — поиск на AnimeView` };
  return { title: 'Каталог аниме — AnimeView' };
}

export const dynamic = 'force-dynamic';

function get(p: Record<string, string | string[] | undefined>, key: string): string {
  const v = p[key];
  return typeof v === 'string' ? v : '';
}

function getAll(p: Record<string, string | string[] | undefined>, key: string): string[] {
  const v = p[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;

  const q         = get(params, 'q').trim();
  const page      = Math.max(1, Number(get(params, 'page')) || 1);
  const sort      = get(params, 'sort') || 'popularity';
  const status    = get(params, 'status') as 'anons' | 'ongoing' | 'released' | '';
  const season    = get(params, 'season');
  const yearFromN = Number(get(params, 'yearFrom')) || null;
  const yearToN   = Number(get(params, 'yearTo'))   || null;
  const viewMode  = (get(params, 'view') === 'list' ? 'list' : 'grid') as ViewMode;
  const genres    = getAll(params, 'genre');
  const kinds     = getAll(params, 'kind');

  const session     = await auth();
  const favoriteIds = session ? await getFavorites().catch(() => []) : [];
  const favoritedIds = new Set(favoriteIds);
  const isLoggedIn  = !!session;

  let media: ReturnType<typeof dbToAnimeShort>[] = [];
  let totalCount = 0;

  const dbResult = await queryAnimeFromDB({
    q:        q        || null,
    genres:   genres.length ? genres : undefined,
    kind:     kinds.length  ? kinds  : undefined,
    status:   status   || null,
    season:   season   || null,
    yearFrom: yearFromN,
    yearTo:   yearToN,
    order:    sort,
    page,
    limit:    LIMIT,
  }).catch(() => null);

  if (dbResult) {
    media = dbResult.data.map(dbToAnimeShort);
    totalCount = dbResult.total;
  }

  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  // Строка параметров без page — для Pagination (сохраняет все фильтры)
  const currentQs = new URLSearchParams();
  if (q)      currentQs.set('q', q);
  if (sort)   currentQs.set('sort', sort);
  if (status) currentQs.set('status', status);
  if (season) currentQs.set('season', season);
  if (get(params, 'yearFrom')) currentQs.set('yearFrom', get(params, 'yearFrom'));
  if (get(params, 'yearTo'))   currentQs.set('yearTo',   get(params, 'yearTo'));
  if (viewMode !== 'grid')     currentQs.set('view', viewMode);
  genres.forEach(g => currentQs.append('genre', g));
  kinds.forEach(k  => currentQs.append('kind', k));

  const hasFilters = q || genres.length || kinds.length || status || season || yearFromN || yearToN;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>

        {/* ── Заголовок ────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            {q ? (
              <>Поиск: <span style={{ color: '#E13C6E' }}>«{q}»</span></>
            ) : (
              'Каталог аниме'
            )}
          </h1>
          {totalCount > 0 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 }}>
              {totalCount.toLocaleString('ru-RU')} аниме
              {totalPages > 1 ? ` · страница ${page} из ${totalPages}` : ''}
            </p>
          )}
        </div>

        {/* ── Фильтры ──────────────────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: 'clamp(14px, 3vw, 28px) clamp(12px, 3.5vw, 32px)', marginBottom: 36,
        }}>
          <Suspense>
            <FilterBar />
          </Suspense>
        </div>

        {/* ── Результаты ───────────────────────────────────────────────────────── */}
        {media.length > 0 ? (
          <>
            <AnimeGrid
              animes={media}
              view={viewMode}
              favoritedIds={favoritedIds}
              isLoggedIn={isLoggedIn}
            />
            <div style={{ marginTop: 48 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseUrl="/search"
                searchString={currentQs.toString()}
              />
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 64 }}>🔍</span>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {hasFilters ? 'По вашим фильтрам ничего не найдено' : 'Начните поиск или выберите фильтры'}
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              Попробуйте изменить жанр, тип или убрать некоторые фильтры
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
