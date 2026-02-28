import { getJikanTrending, getJikanCurrentSeason } from '@/lib/api/jikan';
import {
  getAnimeById,
  getAnimeByShikimoriIds,
  getBestTitle,
  getShikimoriImageUrl,
} from '@/lib/api/shikimori';
import type { HeroAnime } from '@/components/home/Hero';
import type { EpisodeItem } from '@/components/home/NewEpisodes';

export interface HomeData {
  heroAnimes: HeroAnime[];
  episodes: EpisodeItem[];
}

const HERO_COLORS = ['#6C3CE1', '#E13C3C', '#3CE1A8', '#E1793C', '#3C7EE1'];

/**
 * Получает все данные для главной страницы:
 * – Jikan для трендовых MAL ID и постеров
 * – Shikimori для русских текстов (название, жанры, студия)
 */
export async function fetchHomeData(): Promise<HomeData> {
  // Шаг 1: получаем MAL ID из Jikan
  const [jikanTrending, jikanSeason] = await Promise.all([
    getJikanTrending(5).catch(() => []),
    getJikanCurrentSeason(6).catch(() => []),
  ]);

  const trendingIds = jikanTrending.map(a => a.mal_id);
  const seasonIds   = jikanSeason.map(a => a.mal_id);

  // Шаг 2: получаем русские данные из Shikimori по этим ID
  const [trendingDetails, seasonAnimes] = await Promise.all([
    Promise.allSettled(trendingIds.map(id => getAnimeById(id))),
    seasonIds.length > 0
      ? getAnimeByShikimoriIds(seasonIds).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Шаг 3: маппинг — текст из Shikimori, постеры из Jikan (MAL CDN)
  const heroAnimes: HeroAnime[] = trendingDetails
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getAnimeById>>> =>
        r.status === 'fulfilled',
    )
    .map((r, i) => {
      const a = r.value;
      const jikan = jikanTrending.find(j => j.mal_id === a.id);
      const year = a.aired_on ? Number(a.aired_on.split('-')[0]) : 0;
      return {
        id: a.id,
        title: getBestTitle(a),
        titleJp: a.japanese?.[0] ?? a.name,
        episodes: a.episodes,
        rating: parseFloat(a.score) || 0,
        genres: a.genres.map(g => g.russian).slice(0, 4),
        year,
        studio: a.studios[0]?.name ?? '',
        image:
          jikan?.images.jpg.large_image_url ??
          jikan?.images.jpg.image_url ??
          getShikimoriImageUrl(a.image.original),
        color: HERO_COLORS[i % HERO_COLORS.length],
      };
    });

  const episodes: EpisodeItem[] = seasonAnimes.map(a => {
    const jikan = jikanSeason.find(j => j.mal_id === a.id);
    return {
      id: a.id,
      title: getBestTitle(a),
      image:
        jikan?.images.jpg.large_image_url ??
        jikan?.images.jpg.image_url ??
        getShikimoriImageUrl(a.image.original),
    };
  });

  return { heroAnimes, episodes };
}
