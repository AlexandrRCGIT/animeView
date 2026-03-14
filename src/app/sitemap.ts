import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const revalidate = 86400; // пересобирается раз в 24 часа

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://anime-view.org').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/info`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contacts`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const PAGE = 1000;
  const allAnime: Array<{ shikimori_id: number; anime_status: string; synced_at: string | null }> = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('anime')
      .select('shikimori_id, anime_status, synced_at')
      .order('shikimori_id')
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    allAnime.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const animePages: MetadataRoute.Sitemap = allAnime.map((a) => ({
    url: `${BASE_URL}/anime/${a.shikimori_id}`,
    lastModified: a.synced_at ? new Date(a.synced_at) : undefined,
    changeFrequency: (a.anime_status === 'ongoing' || a.anime_status === 'anons') ? 'weekly' : 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...animePages];
}
