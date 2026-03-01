'use client';

import { useOptimistic, useTransition } from 'react';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';
import { useAuthModal } from '@/lib/context/AuthModalContext';

const HEART_PATH = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

interface Props {
  shikimoriId: number;
  isFavorited: boolean;
  isLoggedIn: boolean;
  variant?: 'button' | 'icon';
}

export function FavoriteButton({ shikimoriId, isFavorited, isLoggedIn, variant = 'button' }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isFavorited);
  const { openLoginModal } = useAuthModal();

  const handleClick = (e: React.MouseEvent) => {
    if (variant === 'icon') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    if (isPending) return;
    startTransition(async () => {
      setOptimistic(!optimistic);
      if (optimistic) await removeFavorite(shikimoriId);
      else await addFavorite(shikimoriId);
    });
  };

  const heart = (size: number, filled: boolean) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={HEART_PATH} />
    </svg>
  );

  // ── Иконка-оверлей на постер карточки ────────────────────────────────────
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        title={!isLoggedIn ? 'Войдите чтобы добавить' : optimistic ? 'Убрать из избранного' : 'В избранное'}
        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-100 ${
          optimistic
            ? 'bg-black/70 text-violet-400'
            : 'bg-black/60 text-zinc-300 hover:text-violet-400'
        } ${!isLoggedIn ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {heart(15, optimistic)}
      </button>
    );
  }

  // ── Полная кнопка (на странице тайтла) ───────────────────────────────────
  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
        optimistic
          ? 'bg-violet-600/20 text-violet-400 border border-violet-600/40 hover:bg-violet-600/30'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
      }`}
    >
      {heart(16, optimistic)}
      {optimistic ? 'В избранном' : 'В избранное'}
    </button>
  );
}
