import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  getAnimeById,
  getBestTitle,
  formatStatus,
  formatKind,
  getShikimoriImageUrl,
  getRelatedByFranchise,
  getRelatedAnime,
  type AnimeDetail,
} from '@/lib/api/shikimori';
import {
  getKodikByMalId,
  getKodikByTitle,
  groupByTranslation,
  buildKodikIframeUrl,
} from '@/lib/api/kodik';
import { NavBar } from '@/components/home/NavBar';
import { PlayerTabs } from '@/components/anime/PlayerTabs';
import { WatchStatusButton } from '@/components/anime/WatchStatusButton';
import { FavoriteButton } from '@/components/anime/FavoriteButton';
import { WatchButton } from '@/components/anime/WatchButton';
import { auth } from '@/auth';
import { isFavorite, getWatchStatus } from '@/app/actions/favorites';
import { getAnimeDetailFromDB, saveAnimeDetailToDB, getRelatedFromDB, saveRelatedToDB, getAnilibriaIdFromDB, saveAnilibriaIdToDB } from '@/lib/db/anime';
import { getAnilibriaId } from '@/lib/api/malibria';
import { findAnilibriaRelease } from '@/lib/api/anilibria';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) return {};
  try {
    const anime = await getAnimeById(numId);
    const title = getBestTitle(anime);
    return {
      title: `${title} — AnimeView`,
      description:
        cleanDescription(anime.description ?? '').slice(0, 160) ||
        `Смотреть ${title} онлайн с русской озвучкой на AnimeView`,
      openGraph: {
        title,
        images: anime.image.original
          ? [{ url: getShikimoriImageUrl(anime.image.original) }]
          : [],
      },
    };
  } catch {
    return {};
  }
}

/** Убирает wiki-разметку Shikimori из описания */
function cleanDescription(text: string): string {
  return text
    .replace(/\[{2}[^\]|]*\|([^\]]+)\]{2}/g, '$1') // [[link|text]] → text
    .replace(/\[{2}([^\]]+)\]{2}/g, '$1')           // [[text]] → text
    .replace(/\[[^\]]*\]/g, '')                      // [attr] → убрать
    .replace(/  +/g, ' ')
    .trim();
}

/** Форматирует число с разделителями */
function fmt(n: number) {
  return n.toLocaleString('ru-RU');
}

const WATCH_STAT_MAP: Record<string, { label: string; color: string }> = {
  'Смотрю':       { label: 'Смотрят',     color: '#3CE1A8' },
  'Просмотрел':   { label: 'Просмотрено', color: '#6C3CE1' },
  'Запланировано':{ label: 'Запланировано',color: '#3C7EE1' },
  'Отложено':     { label: 'Отложено',    color: '#E1A83C' },
  'Брошено':      { label: 'Брошено',     color: '#E13C3C' },
};

export default async function AnimePage({ params }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (isNaN(numId)) notFound();

  const session = await auth();

  // 1. Данные аниме: БД → Shikimori
  let anime: AnimeDetail;
  try {
    const cached = await getAnimeDetailFromDB(numId).catch(() => null);
    if (cached) {
      anime = cached;
    } else {
      anime = await getAnimeById(numId);
      await saveAnimeDetailToDB(numId, anime).catch(() => null);
    }
  } catch {
    notFound();
  }

  // 2. Kodik плеер (сервер)
  const kodikResult = await Promise.allSettled([
    getKodikByMalId(numId).then(res =>
      !res.results?.length ? getKodikByTitle(anime.name) : res
    ),
  ]);

  const translations =
    kodikResult[0].status === 'fulfilled' ? groupByTranslation(kodikResult[0].value.results) : [];

  const defaultTranslation = translations[0] ?? null;
  const iframeUrl = defaultTranslation ? buildKodikIframeUrl(defaultTranslation.result.link) : null;

  // Aniboom URL ищем на клиенте (animego.me блокирует сервер-сайд запросы через DDoS-Guard)
  const aniboomTitles = [anime.name, ...(anime.english ?? [])].filter(Boolean) as string[];

  // Anilibria ID — трёхуровневый резолв с кешированием в БД:
  // 1. DB кеш → 2. MALibria маппинг → 3. Поиск по названию на Anilibria
  let anilibriaId: number | null = await getAnilibriaIdFromDB(numId).catch(() => null);
  if (anilibriaId === null) {
    // Пробуем MALibria (точный маппинг MAL ID → Anilibria ID)
    anilibriaId = await getAnilibriaId(numId).catch(() => null);
    if (anilibriaId === null) {
      // Fallback: поиск по названию на сервере — сохраняем найденный ID
      const titles = [anime.russian, anime.name].filter(Boolean) as string[];
      const found = await findAnilibriaRelease(titles).catch(() => null);
      if (found) anilibriaId = found.id;
    }
    if (anilibriaId !== null) {
      saveAnilibriaIdToDB(numId, anilibriaId).catch(() => null);
    }
  }
  const anilibriaTitles = [anime.russian, anime.name].filter(Boolean) as string[];

  // Следующий сезон — ищем только если текущее аниме есть в Anilibria
  let nextSeasonShikimoriId: number | null = null;
  if (anilibriaId !== null) {
    try {
      const relatedList = await getRelatedAnime(numId);
      const sequel = relatedList.find(r => r.relation === 'Sequel' && r.anime != null);
      if (sequel?.anime) nextSeasonShikimoriId = sequel.anime.id;
    } catch { /* не критично */ }
  }

  // 3. Данные пользователя + связанные аниме параллельно
  async function fetchRelated() {
    if (!anime.franchise) return [];
    try {
      const cached = await getRelatedFromDB(numId);
      if (cached && cached.length > 0) return cached;
    } catch { /* БД недоступна — продолжаем */ }
    try {
      const fresh = await getRelatedByFranchise(anime.franchise, numId);
      if (fresh.length > 0) saveRelatedToDB(numId, fresh).catch(() => null);
      return fresh;
    } catch {
      return [];
    }
  }

  const [favorited, watchStatus, related] = await Promise.all([
    session ? isFavorite(numId) : Promise.resolve(false),
    session ? getWatchStatus(numId) : Promise.resolve(null),
    fetchRelated(),
  ]);

  // 4. Данные для отображения
  const title       = getBestTitle(anime);
  const poster      = getShikimoriImageUrl(anime.image.original);
  const genres      = anime.genres.map(g => g.russian);
  const studios     = anime.studios.map(s => s.name);
  const score       = parseFloat(anime.score);
  const year        = anime.aired_on?.split('-')[0] ?? null;
  const description = cleanDescription(anime.description ?? '');
  const stats       = anime.rates_statuses_stats ?? [];
  const totalWatchers = stats.reduce((sum, s) => sum + Number(s.value), 0);

  return (
    <div style={{ background: '#08080E', minHeight: '100vh', color: '#fff' }}>
      <NavBar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 40px 80px' }}>

        {/* ── Верхний блок: постер + инфо ────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Постер */}
          <div style={{ flexShrink: 0, width: 220, position: 'relative' }}>
            <div style={{
              width: 220, aspectRatio: '2/3', borderRadius: 16, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              position: 'relative',
            }}>
              {poster && (
                <Image
                  src={poster}
                  alt={title}
                  fill
                  sizes="220px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              )}
            </div>

          </div>

          {/* Информация */}
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Заголовок */}
            <div>
              <h1 style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 28, fontWeight: 800, color: '#fff',
                lineHeight: 1.2, letterSpacing: '-0.02em', margin: 0,
              }}>{title}</h1>
              {anime.name !== title && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '6px 0 0' }}>
                  {anime.name}
                </p>
              )}
              {anime.japanese?.[0] && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', margin: '2px 0 0' }}>
                  {anime.japanese[0]}
                </p>
              )}
            </div>

            {/* Оценка + быстрые мета */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {score > 0 && (
                <span style={{
                  background: 'rgba(245,200,66,0.15)', color: '#F5C842',
                  padding: '4px 12px', borderRadius: 8, fontSize: 15, fontWeight: 700,
                }}>★ {score.toFixed(1)}</span>
              )}
              {anime.kind && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {formatKind(anime.kind)}
                </span>
              )}
              {anime.episodes > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {anime.episodes} эп.
                </span>
              )}
              {anime.duration > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  {anime.duration} мин.
                </span>
              )}
              {year && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{year}</span>
              )}
              {anime.status && (
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: anime.status === 'ongoing' ? 'rgba(60,225,168,0.12)' : 'rgba(255,255,255,0.06)',
                  color: anime.status === 'ongoing' ? '#3CE1A8' : 'rgba(255,255,255,0.4)',
                }}>{formatStatus(anime.status)}</span>
              )}
            </div>

            {/* Жанры */}
            {genres.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {genres.slice(0, 8).map(g => (
                  <span key={g} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }}>{g}</span>
                ))}
              </div>
            )}

            {/* Кнопки действий */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <WatchButton />
              <FavoriteButton
                shikimoriId={numId}
                isFavorited={favorited}
                isLoggedIn={!!session}
                variant="button"
              />
            </div>

            {/* Статус просмотра */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-unbounded), sans-serif',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              }}>Мой статус</span>
              <WatchStatusButton
                shikimoriId={numId}
                currentStatus={watchStatus}
                isLoggedIn={!!session}
              />
            </div>

            {/* Описание */}
            {description && (
              <div>
                <span style={{
                  fontFamily: 'var(--font-unbounded), sans-serif',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
                  display: 'block', marginBottom: 10,
                }}>Описание</span>
                <p style={{
                  fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.65)',
                  margin: 0, display: '-webkit-box',
                  WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {description}
                </p>
              </div>
            )}

            {/* Студия + следующий эпизод */}
            {(studios.length > 0 || anime.next_episode_at) && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {studios.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      Студия
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                      {studios.join(', ')}
                    </span>
                  </div>
                )}
                {anime.next_episode_at && (
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 2 }}>
                      Следующий эпизод
                    </span>
                    <span style={{ fontSize: 13, color: '#3CE1A8' }}>
                      {new Date(anime.next_episode_at).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Статистика зрителей (Shikimori) ───────────────────────────────── */}
        {stats.length > 0 && (
          <div style={{
            marginTop: 48,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20, padding: '24px 28px',
          }}>
            <span style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              display: 'block', marginBottom: 20,
            }}>Статистика зрителей</span>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {stats.map(s => {
                const meta = WATCH_STAT_MAP[s.name];
                const val = Number(s.value);
                const pct = totalWatchers > 0 ? val / totalWatchers : 0;
                return (
                  <div key={s.name} style={{ flex: '1 1 140px', minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                      {meta?.label ?? s.name}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: meta?.color ?? '#fff' }}>
                      {fmt(val)}
                    </div>
                    <div style={{
                      marginTop: 6, height: 3, borderRadius: 2,
                      background: 'rgba(255,255,255,0.07)',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${(pct * 100).toFixed(1)}%`,
                        background: meta?.color ?? '#6C3CE1',
                        borderRadius: 2,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {totalWatchers > 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                Всего в списках: {fmt(totalWatchers)} пользователей
              </p>
            )}
          </div>
        )}

        {/* ── Связанные аниме ────────────────────────────────────────────────── */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <span style={{
              fontFamily: 'var(--font-unbounded), sans-serif',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
              display: 'block', marginBottom: 16,
            }}>Связанные аниме</span>
            <div style={{
              display: 'flex', gap: 12, overflowX: 'auto',
              paddingBottom: 8,
            }}>
              {related.map(r => (
                <a href={`/anime/${r.id}`} key={r.id}
                  style={{ flexShrink: 0, width: 80, textDecoration: 'none' }}>
                  <div style={{
                    width: 80, aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)', position: 'relative',
                  }}>
                    {r.image.original && (
                      <Image
                        src={r.image.original.startsWith('http') ? r.image.original : getShikimoriImageUrl(r.image.original)}
                        alt={getBestTitle(r)}
                        fill sizes="80px" style={{ objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '6px 0 0',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {getBestTitle(r)}
                  </p>
                  {r.aired_on && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
                      {r.aired_on.split('-')[0]}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Плеер ─────────────────────────────────────────────────────────── */}
        <div id="player-section" style={{ marginTop: 48 }}>
          <PlayerTabs
            animeTitle={title}
            kodikUrl={iframeUrl}
            kodikTranslations={translations}
            aniboomTitles={aniboomTitles}
            anilibriaId={anilibriaId}
            anilibriaTitles={anilibriaTitles}
            nextSeasonShikimoriId={nextSeasonShikimoriId}
          />
        </div>

      </main>
    </div>
  );
}
