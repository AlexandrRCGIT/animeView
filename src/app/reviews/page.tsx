import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { getMyReviews } from '@/app/actions/reviews';
import { getAnimeByIds, getPreferredAnimeTitle } from '@/lib/db/anime';
import { proxifyImageUrl } from '@/lib/image-proxy';
import { NavBar } from '@/components/home/NavBar';
import { BackButton } from '@/components/ui/BackButton';

export const metadata = { title: 'Мои рецензии — AnimeView' };
export const dynamic = 'force-dynamic';

const CRITERIA = [
  { key: 'score_plot',       label: 'Сюжет' },
  { key: 'score_art',        label: 'Рисовка' },
  { key: 'score_engagement', label: 'Вовлечённость' },
  { key: 'score_characters', label: 'Персонажи' },
  { key: 'score_music',      label: 'Музыка' },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/reviews');

  const reviews = await getMyReviews();

  if (!reviews.length) {
    return (
      <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
        <NavBar />
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
          <div style={{ marginBottom: 20 }}><BackButton /></div>
          <h1 style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 32px',
          }}>Мои рецензии</h1>
          <div style={{
            borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)',
            padding: '32px 24px', textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, margin: '0 0 16px' }}>
              Вы ещё не написали ни одной рецензии
            </p>
            <Link href="/search" style={{
              display: 'inline-block', padding: '9px 20px', borderRadius: 10,
              background: '#6C3CE1', color: '#fff', textDecoration: 'none',
              fontSize: 14, fontWeight: 600,
            }}>
              Перейти в каталог
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const animeIds = [...new Set(reviews.map((r) => r.shikimori_id))];
  const animeList = await getAnimeByIds(animeIds);
  const animeMap = new Map(animeList.map((a) => [a.shikimori_id, a]));

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
        <div style={{ marginBottom: 20 }}><BackButton /></div>
        <h1 style={{
          fontFamily: 'var(--font-unbounded), sans-serif',
          fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 6px',
        }}>Мои рецензии</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '0 0 28px' }}>
          {reviews.length} {reviews.length === 1 ? 'рецензия' : reviews.length < 5 ? 'рецензии' : 'рецензий'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((review) => {
            const anime = animeMap.get(review.shikimori_id);
            const title = anime ? getPreferredAnimeTitle(anime) : `Аниме #${review.shikimori_id}`;
            const poster = anime?.poster_url ? proxifyImageUrl(anime.poster_url) : null;
            const overall = Number(review.score_overall);

            return (
              <Link
                key={review.id}
                href={`/anime/${review.shikimori_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '16px',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(140,82,255,0.35)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                >
                  {/* Постер */}
                  <div style={{
                    flexShrink: 0, width: 60, aspectRatio: '2/3',
                    borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)', position: 'relative',
                  }}>
                    {poster && (
                      <Image
                        src={poster} alt={title} fill
                        sizes="60px" style={{ objectFit: 'cover' }}
                        unoptimized={poster.startsWith('/api/image?')}
                      />
                    )}
                  </div>

                  {/* Контент */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: '#fff',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          background: 'rgba(245,200,66,0.15)', color: '#F5C842',
                          padding: '3px 10px', borderRadius: 7, fontSize: 14, fontWeight: 700,
                        }}>★ {overall.toFixed(1)}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Оценки */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: review.text ? 10 : 0 }}>
                      {CRITERIA.map(({ key, label }) => (
                        <span key={key} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                          {label}: <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{review[key]}</strong>
                        </span>
                      ))}
                    </div>

                    {/* Текст */}
                    {review.text && (
                      <p style={{
                        fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)',
                        margin: 0, display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {review.text}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
