import type { Metadata } from 'next';
import { auth } from '@/auth';
import { NavBar } from '@/components/home/NavBar';
import { ContentAdminEditor } from '@/components/content/ContentAdminEditor';
import { isAdminUserId } from '@/lib/admin';
import { getPublishedPosts, markContentRead } from '@/lib/content';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'О сервисе AnimeView — смотреть аниме онлайн бесплатно',
  description:
    'AnimeView — бесплатная платформа для просмотра аниме онлайн на русском языке. Более 1 000 тайтлов с русской озвучкой и субтитрами. Узнайте о возможностях сервиса.',
  alternates: { canonical: '/info' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'О сервисе AnimeView — смотреть аниме онлайн бесплатно',
    description:
      'AnimeView — бесплатная платформа для просмотра аниме онлайн. Более 1 000 тайтлов с русской озвучкой и субтитрами.',
    url: '/info',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'О сервисе AnimeView — смотреть аниме онлайн бесплатно',
    description:
      'AnimeView — бесплатная платформа для просмотра аниме онлайн. Более 1 000 тайтлов с русской озвучкой и субтитрами.',
  },
};
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
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Информация по продукту', url: '/info' },
        ]}
      />
      <NavBar />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '92px clamp(14px, 4vw, 40px) 72px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 5vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-unbounded), sans-serif',
            }}
          >
            О сервисе AnimeView
          </h1>
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Бесплатная платформа для просмотра аниме онлайн на русском языке.
          </p>
        </div>

        {/* Статичный About-блок для SEO и AI-цитируемости */}
        <article
          style={{
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.09)',
            background: 'rgba(255,255,255,0.03)',
            padding: '24px 20px',
            marginBottom: 24,
            lineHeight: 1.75,
            fontSize: 15,
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Что такое AnimeView
          </h2>
          <p style={{ margin: 0 }}>
            AnimeView — бесплатный русскоязычный онлайн-сервис для просмотра аниме. Платформа предоставляет
            доступ к каталогу из более чем 1 000 аниме-сериалов и фильмов с русской озвучкой и субтитрами.
            Весь контент доступен без регистрации и рекламы.
          </p>

          <h2 style={{ margin: '20px 0 12px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Возможности платформы
          </h2>
          <p style={{ margin: '0 0 8px' }}>AnimeView поддерживает:</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Просмотр аниме в HD-качестве без ограничений</li>
            <li>Русскую озвучку от ведущих студий — AniLibria, AniDUB, SHIZA Project, Persona99 и других</li>
            <li>Субтитры на русском языке</li>
            <li>Автоматическое обновление эпизодов онгоингов в режиме 24/7</li>
            <li>Историю просмотра и список избранного для зарегистрированных пользователей</li>
            <li>Отзывы, оценки и комментарии к каждому тайтлу</li>
          </ul>

          <h2 style={{ margin: '20px 0 12px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Каталог и жанры
          </h2>
          <p style={{ margin: 0 }}>
            В каталоге AnimeView представлены тайтлы всех популярных жанров: экшн, романтика, фэнтези,
            научная фантастика, мистика, спокон, сёнен, сёдзё, исекай, меха, комедия и многие другие.
            Доступны аниме-сериалы (TV), полнометражные фильмы, OVA и ONA — от культовой классики
            1990-х до актуальных новинок текущего сезона. Каждая страница тайтла содержит синопсис,
            рейтинги, список эпизодов со скриншотами и данные о студии-производителе.
          </p>

          <h2 style={{ margin: '20px 0 12px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Технические особенности
          </h2>
          <p style={{ margin: 0 }}>
            AnimeView работает на современном стеке технологий (Next.js, SSR), обеспечивая быструю
            загрузку страниц на любых устройствах — компьютере, смартфоне или планшете. Видеоплеер
            поддерживает HLS-стриминг и адаптирован для полноэкранного просмотра.
          </p>

          <h2 style={{ margin: '20px 0 12px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Правовая информация
          </h2>
          <p style={{ margin: 0 }}>
            AnimeView функционирует как агрегатор — все видеоматериалы предоставлены третьими сторонами.
            Контент размещён исключительно для домашнего ознакомительного просмотра. Претензии
            правообладателей принимаются по адресу:{' '}
            <a href="mailto:viewanime@yandex.ru" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>
              viewanime@yandex.ru
            </a>
            .
          </p>
        </article>

        {isAdmin && <ContentAdminEditor contentType="info" initialPosts={posts} />}

        {posts.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
              Обновления и новости
            </h2>
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
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{post.title}</h3>
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
          </div>
        )}
      </main>
    </div>
  );
}
