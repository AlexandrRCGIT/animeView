'use server';

import { supabase } from '@/lib/supabase';
import { auth } from '@/auth';

export async function submitFeedback(data: {
  text: string;
  email?: string;
  telegram?: string;
  page_url?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const text = data.text?.trim();
  if (!text || text.length < 2) return { ok: false, error: 'Напиши хотя бы пару слов' };
  if (text.length > 2000) return { ok: false, error: 'Слишком длинное сообщение' };

  const session = await auth().catch(() => null);

  const { error } = await supabase.from('feedback').insert({
    user_id: session?.user?.id ?? null,
    text,
    email: data.email?.trim() || null,
    telegram: data.telegram?.trim().replace(/^@/, '') || null,
    page_url: data.page_url ?? null,
  });

  if (error) return { ok: false, error: 'Ошибка сохранения, попробуй позже' };
  return { ok: true };
}
