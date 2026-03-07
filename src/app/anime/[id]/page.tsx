import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';
import { NavBar } from '@/components/home/NavBar';
import { PlayerTabs } from '@/components/anime/PlayerTabs';
import { WatchStatusButton } from '@/components/anime/WatchStatusButton';
import { FavoriteButton } from '@/components/anime/FavoriteButton';
import { WatchButton } from '@/components/anime/WatchButton';
import { auth } from '@/auth';
import { isFavorite, getWatchStatus } from '@/app/actions/favorites';
import { getAnimeWithTranslations, getRelatedAnimeById } from '@/lib/db/anime';
import { proxifyImageUrl } from '@/lib/image-proxy';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

// ─── Хелперы форматирования ───────────────────────────────────────────────────

function formatKind(kind: string | null): string {
  const map: Record<string, string> = {
    tv: 'TV Сериал', movie: 'Фильм', ova: 'OVA', ona: 'ONA',
    special: 'Спецвыпуск', music: 'Клип',
    tv_13: 'TV (13 эп.)', tv_24: 'TV (24 эп.)', tv_48: 'TV (48 эп.)',
  };
  return kind ? (map[kind] ?? kind.toUpperCase()) : '';
}

function formatStatus(status: string | null): string {
  const map: Record<string, string> = {
    ongoing: 'Онгоинг', released: 'Завершён', anons: 'Анонс',
  };
  return status ? (map[status] ?? status) : '';
}

function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return {};
  try {
    const result = await getAnimeWithTranslations(numId);
    if (!result) return {};
    const { anime } = result;
    const title = anime.title;
    const desc = (anime.description ?? '').slice(0, 160) ||
      `Смотреть ${title} онлайн с русской озвучкой на AnimeView`;
    return {
      title: `${title} — AnimeView`,
      description: desc,
      openGraph: {
        title,
        type: 'video.other',
        images: anime.poster_url
          ? [{ url: anime.poster_url, width: 225, height: 318, alt: title }]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        images: anime.poster_url ? [anime.poster_url] : [],
      },
    };
  } catch {
    return {};
  }
}

export default async function AnimePage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const [session, result, relatedAnimes] = await Promise.all([
    auth(),
    getAnimeWithTranslations(numId),
    getRelatedAnimeById(numId, 18),
  ]);

  if (!result) notFound();

  const { anime, translations } = result;

  // Данные пользователя
  const [favorited, watchStatus, watchProgressResult] = await Promise.all([
    session ? isFavorite(numId) : Promise.resolve(false),
    session ? getWatchStatus(numId) : Promise.resolve(null),
    session?.user?.id
      ? supabase
          .from('watch_progress')
          .select('season, episode, translation_id, translation_title, progress_seconds, duration_seconds, is_completed')
          .eq('user_id', session.user.id)
          .eq('shikimori_id', numId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const initialProgress = watchProgressResult?.data ?? null;

  // Медиа
  const poster = anime.poster_url ? proxifyImageUrl(anime.poster_url) : null;
  const posterUnoptimized = poster?.startsWith('/api/image?') ?? false;
  const bannerRaw = anime.screenshots?.[0] ?? anime.material_data?.screenshots?.[0] ?? null;
  const banner = bannerRaw ? proxifyImageUrl(bannerRaw) : null;

  // Метаданные
  const md = anime.material_data;
  const title = anime.title;
  const genres = anime.genres ?? [];
  const studios = anime.studios ?? md?.anime_studios ?? [];
  const score = anime.shikimori_rating;
  const year = anime.year;
  const description = anime.description ?? md?.anime_description ?? md?.description ?? '';
  const nextEpisodeAt = md?.next_episode_at ?? null;
  const episodesCount = anime.episodes_count ?? 0;
  const duration = anime.duration ?? md?.duration ?? null;

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      {banner && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            height: '52vh', minHeight: 360,
            backgroundImage: `linear-gradient(180deg, rgba(8,8,14,0.25) 0%, rgba(8,8,14,0.88) 75%, rgba(8,8,14,1) 100%), url('${banner}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 22%',
            opacity: 0.42,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <NavBar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 40px 80px', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: 28 }}>
          <BackButton />
        </div>

        {/* ── Верхний блок: постер + инфо ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Постер */}
          <div style={{ flexShrink: 0, width: 220 }}>
            <div style={{
              width: 220, aspectRatio: '2/3', borderRadius: 16, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              position: 'relative',
            }}>
              {poster && (
                <Image
                  src={poster}
                  alt={title}
                  fill sizes="220px"
                  style={{ objectFit: 'cover' }}
                  priority
                  unoptimized={posterUnoptimized}
                />
              )}
            </div>
          </div>

          {/* Информация */}
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Заголовок */}
            <div>
              <h1 style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 28, fontWeight: 800, color: '#fff',
                lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0,
              }}>{title}</h1>
              {anime.title_orig && anime.title_orig !== title && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0' }}>
                  {anime.title_orig}
                </p>
              )}
              {anime.title_jp && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: '2px 0 0' }}>
                  {anime.title_jp}
                </p>
              )}
            </div>

            {/* Оценка + быстрые мета */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {score && score > 0 && (
                <span style={{
                  background: 'rgba(245,200,66,0.15)', color: '#F5C842',
                  padding: '4px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700,
                }}>★ {score.toFixed(1)}</span>
              )}
              {anime.kinopoisk_rating && (
                <span style={{
                  background: 'rgba(255,102,0,0.12)', color: '#FF6600',
                  padding: '4px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                }}>КП {anime.kinopoisk_rating.toFixed(1)}</span>
              )}
              {anime.anime_kind && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {formatKind(anime.anime_kind)}
                </span>
              )}
              {episodesCount > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {episodesCount} эп.
                </span>
              )}
              {duration && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {duration} мин.
                </span>
              )}
              {year && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{year}</span>
              )}
              {anime.anime_status && (
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: anime.anime_status === 'ongoing' ? 'rgba(60,225,168,0.12)' : 'rgba(255,255,255,0.06)',
                  color: anime.anime_status === 'ongoing' ? '#3CE1A8' : 'rgba(255,255,255,0.4)',
                }}>{formatStatus(anime.anime_status)}</span>
              )}
            </div>

            {/* Жанры */}
            {genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {genres.slice(0, 8).map(g => (
                  <span key={g} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }}>{g}</span>
                ))}
              </div>
            )}

            {/* Кнопки действий */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <WatchButton />
              <FavoriteButton
                shikimoriId={numId}
                isFavorited={favorited}
                isLoggedIn={!!session}
                variant="button"
              />
            </div>

            {/* Статус просмотра */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              }}>Мой статус</span>
              <WatchStatusButton
                shikimoriId={numId}
                currentStatus={watchStatus}
                isLoggedIn={!!session}
              />
            </div>

            {/* Описание */}
            {description && (
              <div>
                <span style={{
                  fontFamily: 'var(--font-unbounded), sans-serif',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  display: 'block', marginBottom: 10,
                }}>Описание</span>
                <p style={{
                  fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.65)',
                  margin: 0, display: '-webkit-box',
                  WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {description}
                </p>
              </div>
            )}

            {/* Студия + следующий эпизод */}
            {(studios.length > 0 || nextEpisodeAt) && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {studios.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      Студия
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                      {studios.join(', ')}
                    </span>
                  </div>
                )}
                {nextEpisodeAt && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      Следующий эпизод
                    </span>
                    <span style={{ fontSize: 13, color: '#3CE1A8' }}>
                      {new Date(nextEpisodeAt).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Рейтинги */}
            {(anime.shikimori_votes || anime.kinopoisk_votes || anime.imdb_votes) && (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {anime.shikimori_votes && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      Shikimori
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {fmt(anime.shikimori_votes)} голосов
                    </span>
                  </div>
                )}
                {anime.kinopoisk_votes && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      КиноПоиск
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {fmt(anime.kinopoisk_votes)} голосов
                    </span>
                  </div>
                )}
                {anime.imdb_votes && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      IMDb
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {fmt(anime.imdb_votes)} голосов
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Плеер ─────────────────────────────────────────────────────────── */}
        <div id="player-section" style={{ marginTop: 48 }}>
          <PlayerTabs
            shikimoriId={numId}
            userId={session?.user?.id ?? null}
            animeTitle={title}
            translations={translations}
            episodesInfo={anime.episodes_info}
            initialProgress={initialProgress}
          />
        </div>

        {relatedAnimes.length > 0 && (
          <section style={{ marginTop: 42 }}>
            <h2
              style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
                margin: '0 0 14px',
              }}
            >
              Связанные тайтлы
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {relatedAnimes.map((related) => {
                const relatedPoster = related.poster_url ? proxifyImageUrl(related.poster_url) : '';
                const relatedPosterUnoptimized = relatedPoster.startsWith('/api/image?');

                return (
                  <Link
                    key={related.shikimori_id}
                    href={`/anime/${related.shikimori_id}`}
                    style={{
                      display: 'block',
                      borderRadius: 12,
                      overflow: 'hidden',
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '2/3', background: 'rgba(255,255,255,0.08)' }}>
                      {relatedPoster && (
                        <Image
                          src={relatedPoster}
                          alt={related.title}
                          fill
                          sizes="(max-width: 768px) 40vw, 150px"
                          style={{ objectFit: 'cover' }}
                          unoptimized={relatedPosterUnoptimized}
                        />
                      )}
                    </div>
                    <div style={{ padding: '8px 10px 10px' }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#fff',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: 32,
                        }}
                      >
                        {related.title}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {related.year ?? '—'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
