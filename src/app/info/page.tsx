import { auth } from '@/auth';
import { NavBar } from '@/components/home/NavBar';
import { ContentAdminEditor } from '@/components/content/ContentAdminEditor';
import { isAdminUserId } from '@/lib/admin';
import { getPublishedPosts, markContentRead } from '@/lib/content';

export const metadata = { title: 'Информация по продукту — AnimeView' };
export const dynamic = 'force-dynamic';

export default async function InfoPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAdmin = isAdminUserId(userId);

  if (userId) {
    await markContentRead(userId, 'info').catch(() => {});
  }

  const posts = await getPublishedPosts('info', 200).catch(() => []);

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-unbounded), sans-serif',
            }}
          >
            Информация по продукту
          </h1>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Важная информация о работе сайта и функциях.
          </p>
        </div>

        {isAdmin && <ContentAdminEditor contentType="info" initialPosts={posts} />}

        {posts.length === 0 ? (
          <div
            style={{
              borderRadius: 14,
              border: '1px dashed rgba(255,255,255,0.14)',
              padding: '22px 18px',
              color: 'rgba(255,255,255,0.35)',
              fontSize: 14,
            }}
          >
            Пусто
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {posts.map((post) => (
              <article
                key={post.id}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '16px 16px 14px',
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>{post.title}</h2>
                <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
                  {post.published_at
                    ? new Date(post.published_at).toLocaleString('ru-RU')
                    : new Date(post.updated_at).toLocaleString('ru-RU')}
                </div>
                <p style={{ margin: '12px 0 0', lineHeight: 1.75, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap' }}>
                  {post.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
