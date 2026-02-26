'use client';

import Image from 'next/image';
import type { Session } from 'next-auth';
import { signIn, signOut } from 'next-auth/react';

interface Props {
  session: Session | null;
}

export function AuthButton({ session }: Props) {
  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="flex-none px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
      >
        Войти
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-none">
      {session.user?.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name ?? 'Аватар'}
          width={28}
          height={28}
          className="rounded-full"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs text-white font-semibold">
          {(session.user?.name ?? '?')[0].toUpperCase()}
        </div>
      )}
      <span className="hidden md:block text-sm text-zinc-300 max-w-[120px] truncate">
        {session.user?.name}
      </span>
      <button
        onClick={() => signOut()}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Выйти
      </button>
    </div>
  );
}
