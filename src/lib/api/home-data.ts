import { getJikanTrending, getJikanCurrentSeason } from '@/lib/api/jikan';
import {
  getAnimeById,
  getAnimeByShikimoriIds,
  getBestTitle,
  getShikimoriImageUrl,
} from '@/lib/api/shikimori';
import { getTrendingFromDB, getOngoingsFromDB } from '@/lib/db/anime';
import type { HeroAnime } from '@/components/home/Hero';
import type { EpisodeItem } from '@/components/home/NewEpisodes';

export interface HomeData {
  heroAnimes: HeroAnime[];
  episodes: EpisodeItem[];
}

const HERO_COLORS = ['#6C3CE1', '#E13C3C', '#3CE1A8', '#E1793C', '#3C7EE1'];

/**
 * Данные для главной страницы.
 *
 * Стратегия:
 *  1. Пробуем взять из локальной БД (0 внешних запросов)
 *  2. Если БД пуста (ещё не синхронизирована) — падаем обратно
 *     на Jikan + Shikimori API
 */
export async function fetchHomeData(): Promise<HomeData> {
  // ── Попытка 1: локальная БД ────────────────────────────────────────────────
  try {
    const [dbTrending, dbOngoings] = await Promise.all([
      getTrendingFromDB(5),
      getOngoingsFromDB(6),
    ]);

    if (dbTrending.length >= 3) {
      const heroAnimes: HeroAnime[] = dbTrending.map((a, i) => ({
        id:       a.id,
        title:    a.russian || a.name,
        titleJp:  a.name,
        episodes: a.episodes ?? 0,
        rating:   a.score ?? 0,
        genres:   (a.genres ?? []).slice(0, 4),
        year:     a.year ?? 0,
        studio:   a.studios?.[0] ?? '',
        image:    a.image_url || a.detail_data?.image?.original
          ? (a.image_url || `https://shikimori.one${a.detail_data!.image.original}`)
          : '',
        banner:   a.banner_url ?? null,
        color:    HERO_COLORS[i % HERO_COLORS.length],
      }));

      const episodes: EpisodeItem[] = dbOngoings.map(a => ({
        id:    a.id,
        title: a.russian || a.name,
        image: a.image_url || (a.detail_data?.image?.original
          ? `https://shikimori.one${a.detail_data.image.original}`
          : ''),
      }));

      return { heroAnimes, episodes };
    }
  } catch {
    // БД недоступна или пуста — продолжаем с API
  }

  // ── Fallback: Jikan + Shikimori API ───────────────────────────────────────
  const [jikanTrending, jikanSeason] = await Promise.all([
    getJikanTrending(5).catch(() => []),
    getJikanCurrentSeason(6).catch(() => []),
  ]);

  const trendingIds = jikanTrending.map(a => a.mal_id);
  const seasonIds   = jikanSeason.map(a => a.mal_id);

  const [trendingDetails, seasonAnimes] = await Promise.all([
    Promise.allSettled(trendingIds.map(id => getAnimeById(id))),
    seasonIds.length > 0
      ? getAnimeByShikimoriIds(seasonIds).catch(() => [])
      : Promise.resolve([]),
  ]);

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
        id:       a.id,
        title:    getBestTitle(a),
        titleJp:  a.japanese?.[0] ?? a.name,
        episodes: a.episodes,
        rating:   parseFloat(a.score) || 0,
        genres:   a.genres.map(g => g.russian).slice(0, 4),
        year,
        studio:   a.studios[0]?.name ?? '',
        image:
          jikan?.images.jpg.large_image_url ??
          jikan?.images.jpg.image_url ??
          getShikimoriImageUrl(a.image.original),
        banner:
          jikan?.trailer?.images?.maximum_image_url ??
          jikan?.trailer?.images?.large_image_url ??
          jikan?.trailer?.images?.medium_image_url ??
          jikan?.trailer?.images?.image_url ??
          null,
        color: HERO_COLORS[i % HERO_COLORS.length],
      };
    });

  const episodes: EpisodeItem[] = seasonAnimes.map(a => {
    const jikan = jikanSeason.find(j => j.mal_id === a.id);
    return {
      id:    a.id,
      title: getBestTitle(a),
      image:
        jikan?.images.jpg.large_image_url ??
        jikan?.images.jpg.image_url ??
        getShikimoriImageUrl(a.image.original),
    };
  });

  return { heroAnimes, episodes };
}
