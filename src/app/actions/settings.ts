'use server';

import { cookies } from 'next/headers';
import { auth } from '@/auth';

export type FavStyle = 'icon' | 'button';

export async function setFavStyle(style: FavStyle) {
  const session = await auth();
  if (!session) return;
  (await cookies()).set('fav_style', style, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: false,
  });
}
