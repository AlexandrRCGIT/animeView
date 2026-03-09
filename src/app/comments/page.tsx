import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { getMyComments } from '@/app/actions/comments';
import { getAnimeByIds, getPreferredAnimeTitle } from '@/lib/db/anime';
import { proxifyImageUrl } from '@/lib/image-proxy';
import { NavBar } from '@/components/home/NavBar';
import { BackButton } from '@/components/ui/BackButton';

export const metadata = { title: 'Мои комментарии — AnimeView' };
export const dynamic = 'force-dynamic';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default async function MyCommentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/comments');

  const comments = await getMyComments();

  if (!comments.length) {
    return (
      <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
        <NavBar />
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
          <div style={{ marginBottom: 20 }}><BackButton /></div>
          <h1 style={{
            fontFamily: 'var(--font-unbounded), sans-serif',
            fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 32px',
          }}>Мои комментарии</h1>
          <div style={{
            borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)',
            padding: '32px 24px', textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, margin: '0 0 16px' }}>
              Вы ещё не написали ни одного комментария
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

  const animeIds = [...new Set(comments.map((c) => c.shikimori_id))];
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
        }}>Мои комментарии</h1>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '0 0 28px' }}>
          {comments.length} {comments.length === 1 ? 'комментарий' : comments.length < 5 ? 'комментария' : 'комментариев'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map((comment) => {
            const anime = animeMap.get(comment.shikimori_id);
            const title = anime ? getPreferredAnimeTitle(anime) : `Аниме #${comment.shikimori_id}`;
            const poster = anime?.poster_url ? proxifyImageUrl(anime.poster_url) : null;

            return (
              <Link
                key={comment.id}
                href={`/anime/${comment.shikimori_id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '14px',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(140,82,255,0.35)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                >
                  {/* Постер */}
                  <div style={{
                    flexShrink: 0, width: 44, aspectRatio: '2/3',
                    borderRadius: 6, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)', position: 'relative',
                  }}>
                    {poster && (
                      <Image
                        src={poster} alt={title} fill
                        sizes="44px" style={{ objectFit: 'cover' }}
                        unoptimized={poster.startsWith('/api/image?')}
                      />
                    )}
                  </div>

                  {/* Контент */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {title}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                        {formatDate(comment.created_at)}
                      </span>
                    </div>

                    <p style={{
                      fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.65)',
                      margin: 0, display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {comment.parent_id && (
                        <span style={{ color: 'rgba(140,82,255,0.8)', marginRight: 6, fontSize: 12 }}>↩ ответ</span>
                      )}
                      {comment.text}
                    </p>
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
