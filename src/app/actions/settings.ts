'use server';

import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { hasUnsafeControlChars, isValidEmail } from '@/lib/security';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_NAME_MIN_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '@/lib/input-limits';

export type FavStyle = 'icon' | 'button';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface UserDevice {
  id: string;
  device_name: string | null;
  created_via: string | null;
  first_connected_at: string;
  last_seen_at: string;
}

/** Извлекает чистый UUID для credentials-пользователей.
 *  session.user.id = "credentials:UUID", в таблице users хранится UUID. */
function getDbId(userId: string): string {
  if (userId.startsWith('credentials:')) return userId.slice('credentials:'.length);
  return userId;
}

function isOAuthUser(userId: string): boolean {
  return userId.startsWith('discord:') || userId.startsWith('telegram:');
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
  if (!trimmed || trimmed.length < USER_NAME_MIN_LENGTH) return { ok: false, error: 'Имя слишком короткое' };
  if (trimmed.length > USER_NAME_MAX_LENGTH) return { ok: false, error: 'Имя слишком длинное' };
  if (hasUnsafeControlChars(trimmed)) return { ok: false, error: 'Имя содержит недопустимые символы' };

  const userId = session.user.id;

  // Upsert в user_profiles — хранит полный userId как ключ
  const { error: upsertError } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, display_name: trimmed }, { onConflict: 'user_id' });

  if (upsertError) return { ok: false, error: 'Ошибка сохранения' };

  // Для credentials-пользователей обновляем и таблицу users (чистый UUID)
  if (!isOAuthUser(userId)) {
    await supabase.from('users').update({ name: trimmed }).eq('id', getDbId(userId));
  }

  return { ok: true };
}

export async function updateUserEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session) return { ok: false, error: 'Не авторизован' };

  const userId = session.user.id;
  if (isOAuthUser(userId)) return { ok: false, error: 'Недоступно для OAuth-аккаунтов' };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > USER_EMAIL_MAX_LENGTH || !isValidEmail(trimmed)) {
    return { ok: false, error: 'Некорректный email' };
  }

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
  if (isOAuthUser(userId)) return { ok: false, error: 'Недоступно для OAuth-аккаунтов' };

  if (newPwd.length < USER_PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Новый пароль должен быть не менее ${USER_PASSWORD_MIN_LENGTH} символов` };
  }
  if (current.length > USER_PASSWORD_MAX_LENGTH || newPwd.length > USER_PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `Пароль слишком длинный (максимум ${USER_PASSWORD_MAX_LENGTH} символов)` };
  }

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

export async function forgetUserDevice(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Не авторизован' };

  const id = deviceId.trim();
  if (!UUID_RE.test(id)) return { ok: false, error: 'Некорректный идентификатор устройства' };

  const { data, error } = await supabase
    .from('user_devices')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: 'Ошибка удаления устройства' };
  if (!data) return { ok: false, error: 'Устройство не найдено' };

  return { ok: true };
}
