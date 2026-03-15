'use server';

import { supabase } from '@/lib/supabase';
import { auth } from '@/auth';
import { hasUnsafeControlChars, isValidEmail } from '@/lib/security';
import {
  USER_CONTENT_TEXT_MAX_LENGTH,
  USER_CONTENT_TEXT_MIN_LENGTH,
  USER_EMAIL_MAX_LENGTH,
} from '@/lib/input-limits';

export async function submitFeedback(data: {
  text: string;
  email?: string;
  telegram?: string;
  page_url?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const text = data.text?.trim();
  if (!text || text.length < USER_CONTENT_TEXT_MIN_LENGTH) {
    return { ok: false, error: `Минимум ${USER_CONTENT_TEXT_MIN_LENGTH} символов` };
  }
  if (text.length > USER_CONTENT_TEXT_MAX_LENGTH) {
    return { ok: false, error: `Максимум ${USER_CONTENT_TEXT_MAX_LENGTH} символов` };
  }
  if (hasUnsafeControlChars(text)) return { ok: false, error: 'Текст содержит недопустимые символы' };

  const email = data.email?.trim().toLowerCase() || null;
  if (email) {
    if (email.length > USER_EMAIL_MAX_LENGTH || !isValidEmail(email)) {
      return { ok: false, error: 'Некорректный email' };
    }
  }

  const telegramRaw = data.telegram?.trim().replace(/^@/, '') || '';
  const telegram = telegramRaw || null;
  if (telegram && !/^[A-Za-z0-9_]{3,32}$/.test(telegram)) {
    return { ok: false, error: 'Некорректный Telegram username' };
  }

  let pageUrl: string | null = null;
  if (typeof data.page_url === 'string' && data.page_url.trim()) {
    try {
      const parsed = new URL(data.page_url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Некорректный URL страницы' };
      }
      pageUrl = parsed.toString().slice(0, 1024);
    } catch {
      return { ok: false, error: 'Некорректный URL страницы' };
    }
  }

  const session = await auth().catch(() => null);

  const { error } = await supabase.from('feedback').insert({
    user_id: session?.user?.id ?? null,
    text,
    email,
    telegram,
    page_url: pageUrl,
  });

  if (error) return { ok: false, error: 'Ошибка сохранения, попробуй позже' };
  return { ok: true };
}
