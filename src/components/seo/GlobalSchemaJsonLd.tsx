const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://anime-view.org').replace(/\/+$/, '');

export function GlobalSchemaJsonLd() {
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AnimeView',
    alternateName: ['Anime View', 'Аниме Вью', 'АнимеВью', 'anime view', 'аниме вью'],
    url: APP_BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${APP_BASE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AnimeView',
    alternateName: ['Anime View', 'Аниме Вью', 'АнимеВью'],
    url: APP_BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${APP_BASE_URL}/icons/pwa-512.png`,
      width: 512,
      height: 512,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'viewanime@yandex.ru',
    },
    // sameAs: добавить ссылки после создания профилей: ВКонтакте, Telegram, YouTube
    // sameAs: ['https://vk.com/...', 'https://t.me/...'],
  };

  const siteNavigationLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      { '@type': 'SiteNavigationElement', name: 'Каталог', url: `${APP_BASE_URL}/search` },
      { '@type': 'SiteNavigationElement', name: 'Новости', url: `${APP_BASE_URL}/news` },
      { '@type': 'SiteNavigationElement', name: 'Избранное', url: `${APP_BASE_URL}/favorites` },
      { '@type': 'SiteNavigationElement', name: 'Информация по продукту', url: `${APP_BASE_URL}/info` },
      { '@type': 'SiteNavigationElement', name: 'Контакты', url: `${APP_BASE_URL}/contacts` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationLd) }}
      />
    </>
  );
}
