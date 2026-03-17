interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://anime-view.org').replace(/\/+$/, '');

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return `${APP_BASE_URL}${normalized}`;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  if (!items || items.length < 2) return null;

  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: toAbsoluteUrl(item.url),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
