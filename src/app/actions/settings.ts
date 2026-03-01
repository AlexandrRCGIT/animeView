'use server';

import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export type FavStyle = 'icon' | 'button';

/** Извлекает чистый UUID для credentials-пользователей.
 *  session.user.id = "credentials:UUID", в таблице users хранится UUID. */
function getDbId(userId: string): string {
  if (userId.startsWith('credentials:')) return userId.slice('credentials:'.length);
  return userId;
}

export async function setFavStyle(style: FavStyle) {
  const session = await auth();
  if (!session) return;
  (await cookies()).set('fav_style', style, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: false,
  });
}

export async function setThemeAccent(color: string) {
  const ALLOWED = ['#6C3CE1', '#3C7EE1', '#3CE1A8', '#E13C6E', '#E1913C'];
  if (!ALLOWED.includes(color)) return;
  (await cookies()).set('theme_accent', color, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: false,
  });
}

export async function updateUserName(name: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: 'Не авторизован' };

  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) return { ok: false, error: 'Имя слишком короткое' };
  if (trimmed.length > 50) return { ok: false, error: 'Имя слишком длинное' };

  const userId = session.user.id;

  // Upsert в user_profiles — хранит полный userId как ключ
  const { error: upsertError } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, display_name: trimmed }, { onConflict: 'user_id' });

  if (upsertError) return { ok: false, error: 'Ошибка сохранения' };

  // Для credentials-пользователей обновляем и таблицу users (чистый UUID)
  if (!userId.startsWith('discord:')) {
    await supabase.from('users').update({ name: trimmed }).eq('id', getDbId(userId));
  }

  return { ok: true };
}

export async function updateUserEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: 'Не авторизован' };

  const userId = session.user.id;
  if (userId.startsWith('discord:')) return { ok: false, error: 'Недоступно для OAuth-аккаунтов' };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return { ok: false, error: 'Некорректный email' };

  const { error } = await supabase
    .from('users')
    .update({ email: trimmed })
    .eq('id', getDbId(userId));

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Email уже занят' };
    return { ok: false, error: 'Ошибка сохранения' };
  }

  return { ok: true };
}

export async function updateUserPassword(
  current: string,
  newPwd: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: 'Не авторизован' };

  const userId = session.user.id;
  if (userId.startsWith('discord:')) return { ok: false, error: 'Недоступно для OAuth-аккаунтов' };

  if (newPwd.length < 8) return { ok: false, error: 'Новый пароль должен быть не менее 8 символов' };

  const dbId = getDbId(userId);

  const { data: user } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', dbId)
    .maybeSingle();

  if (!user) return { ok: false, error: 'Пользователь не найден' };

  const valid = await bcrypt.compare(current, user.password_hash as string);
  if (!valid) return { ok: false, error: 'Неверный текущий пароль' };

  const hash = await bcrypt.hash(newPwd, 12);
  const { error } = await supabase.from('users').update({ password_hash: hash }).eq('id', dbId);

  if (error) return { ok: false, error: 'Ошибка сохранения' };

  return { ok: true };
}
