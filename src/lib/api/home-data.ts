import { getTrendingFromDB, getOngoingsFromDB, getPreferredAnimeTitle } from '@/lib/db/anime';
import type { HeroAnime } from '@/components/home/Hero';
import type { EpisodeItem } from '@/components/home/NewEpisodes';

export interface HomeData {
  heroAnimes: HeroAnime[];
  episodes: EpisodeItem[];
}

const HERO_COLORS = ['#6C3CE1', '#E13C3C', '#3CE1A8', '#E1793C', '#3C7EE1'];

/**
 * Данные для главной страницы из локальной БД (Kodik-based).
 * Всё обслуживается из Supabase — нет внешних API-запросов.
 */
export async function fetchHomeData(): Promise<HomeData> {
  const [trending, ongoings] = await Promise.all([
    getTrendingFromDB(5).catch(() => []),
    getOngoingsFromDB(8).catch(() => []),
  ]);

  const heroAnimes: HeroAnime[] = trending.map((a, i) => ({
    id:       a.shikimori_id,
    title:    getPreferredAnimeTitle(a),
    titleJp:  a.title_jp ?? a.title_orig ?? a.title,
    episodes: a.episodes_count ?? 0,
    rating:   a.shikimori_rating ?? 0,
    genres:   (a.genres ?? []).slice(0, 4),
    year:     a.year ?? 0,
    studio:   a.studios?.[0] ?? a.material_data?.anime_studios?.[0] ?? '',
    image:    a.poster_url ?? a.screenshots?.[0] ?? '',
    banner:   a.screenshots?.[0] ?? null,
    color:    HERO_COLORS[i % HERO_COLORS.length],
  }));

  const episodes: EpisodeItem[] = ongoings.map(a => ({
    id:    a.shikimori_id,
    title: getPreferredAnimeTitle(a),
    image: a.poster_url ?? a.screenshots?.[0] ?? '',
  }));

  return { heroAnimes, episodes };
}
