'use client';

import { useTransition } from 'react';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';

interface Props {
  anilistId: number;
  isFavorited: boolean;
  isLoggedIn: boolean;
}

export function FavoriteButton({ anilistId, isFavorited, isLoggedIn }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <button
        disabled
        title="Войдите чтобы добавить в избранное"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 text-sm cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        В избранное
      </button>
    );
  }

  const handleClick = () => {
    startTransition(async () => {
      if (isFavorited) {
        await removeFavorite(anilistId);
      } else {
        await addFavorite(anilistId);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        isFavorited
          ? 'bg-violet-600/20 text-violet-400 border border-violet-600/40 hover:bg-violet-600/30'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
      } disabled:opacity-60`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      {isFavorited ? 'В избранном' : 'В избранное'}
    </button>
  );
}
