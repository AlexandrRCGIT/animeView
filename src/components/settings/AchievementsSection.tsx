'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { UserAchievementGroup } from '@/lib/achievements';

interface AchievementsSectionProps {
  groups: UserAchievementGroup[];
}

const ACHIEVEMENTS_SEEN_STORAGE_KEY = 'animeview:achievements:seen:v1';

export function AchievementsSection({ groups }: AchievementsSectionProps) {
  const flatAchievements = useMemo(
    () => groups.flatMap((group) => group.achievements),
    [groups],
  );
  const unlockedIds = useMemo(
    () => flatAchievements.filter((item) => item.unlocked).map((item) => item.id),
    [flatAchievements],
  );

  const [popupQueue, setPopupQueue] = useState<typeof flatAchievements>([]);
  const [activePopupIndex, setActivePopupIndex] = useState(0);

  useEffect(() => {
    const byId = new Map(flatAchievements.map((item) => [item.id, item]));
    const currentUnlocked = unlockedIds.filter((id) => byId.has(id));
    if (currentUnlocked.length === 0) return;

    let parsedSeen: string[] | null = null;
    try {
      const raw = window.localStorage.getItem(ACHIEVEMENTS_SEEN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          parsedSeen = parsed.filter((v): v is string => typeof v === 'string');
        }
      }
    } catch {}

    // Первая инициализация: фиксируем текущий прогресс без всплывающих окон.
    if (!parsedSeen) {
      window.localStorage.setItem(
        ACHIEVEMENTS_SEEN_STORAGE_KEY,
        JSON.stringify(currentUnlocked),
      );
      return;
    }

    const seenSet = new Set(parsedSeen);
    const newlyUnlocked = currentUnlocked
      .filter((id) => !seenSet.has(id))
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    let queueTimer: number | null = null;

    if (newlyUnlocked.length > 0) {
      const merged = Array.from(new Set([...parsedSeen, ...newlyUnlocked.map((item) => item.id)]));
      window.localStorage.setItem(ACHIEVEMENTS_SEEN_STORAGE_KEY, JSON.stringify(merged));

      // Обновляем состояние асинхронно, чтобы не вызывать setState синхронно внутри effect.
      queueTimer = window.setTimeout(() => {
        setPopupQueue(newlyUnlocked);
        setActivePopupIndex(0);
      }, 0);
    }

    if (queueTimer !== null) {
      return () => window.clearTimeout(queueTimer);
    }
  }, [flatAchievements, unlockedIds]);

  const activePopup = popupQueue[activePopupIndex];

  useEffect(() => {
    if (!activePopup) return;
    const timeout = window.setTimeout(() => {
      setActivePopupIndex((prev) => {
        const next = prev + 1;
        if (next >= popupQueue.length) {
          setPopupQueue([]);
          return 0;
        }
        return next;
      });
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [activePopup, popupQueue.length]);

  function closePopup() {
    setActivePopupIndex((prev) => {
      const next = prev + 1;
      if (next >= popupQueue.length) {
        setPopupQueue([]);
        return 0;
      }
      return next;
    });
  }

  return (
    <>
      {activePopup && (
        <div className="fixed inset-x-4 bottom-4 z-[120] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]">
          <div className="rounded-xl border border-violet-500/40 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                Достижение получено
              </p>
              <button
                type="button"
                onClick={closePopup}
                className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Закрыть
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative h-14 w-24 overflow-hidden rounded-md border border-zinc-700/70">
                <Image
                  src={activePopup.image}
                  alt={activePopup.title}
                  fill
                  sizes="96px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{activePopup.title}</p>
                <p className="text-xs text-zinc-400">{activePopup.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{group.title}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.achievements.map((achievement) => {
                const ratioPercent = Math.round(achievement.ratio * 100);
                return (
                  <article
                    key={achievement.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-3"
                  >
                    <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg border border-zinc-700/60">
                      <Image
                        src={achievement.image}
                        alt={achievement.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    </div>

                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white">{achievement.title}</h4>
                      {achievement.unlocked ? (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          Выполнено
                        </span>
                      ) : (
                        <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                          В процессе
                        </span>
                      )}
                    </div>

                    <p className="mb-3 text-xs text-zinc-400">{achievement.description}</p>

                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Прогресс</span>
                      <span className="font-semibold text-zinc-200">
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                        style={{ width: `${ratioPercent}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
