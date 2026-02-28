import { supabase } from '@/lib/supabase';

/**
 * Читает значение из таблицы api_cache.
 * Если записи нет или она устарела — вызывает fetcher, сохраняет в кэш и возвращает.
 *
 * @param key        Уникальный ключ (например 'home:hero:v1')
 * @param ttlSeconds Время жизни кэша в секундах
 * @param fetcher    Функция для получения свежих данных
 */
export async function getOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Попытка прочитать из кэша
  try {
    const { data: row, error } = await supabase
      .from('api_cache')
      .select('data, cached_at')
      .eq('key', key)
      .single();

    if (!error && row) {
      const ageSeconds = (Date.now() - new Date(row.cached_at).getTime()) / 1000;
      if (ageSeconds < ttlSeconds) {
        return row.data as T;
      }
    }
  } catch {
    // Ошибка чтения кэша — продолжаем без него
  }

  // Запрашиваем свежие данные
  const fresh = await fetcher();

  // Сохраняем в кэш (ошибка записи не прерывает работу)
  try {
    await supabase
      .from('api_cache')
      .upsert(
        { key, data: fresh as object, cached_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
  } catch {
    // Игнорируем ошибку записи
  }

  return fresh;
}

/**
 * Принудительно обновляет запись в кэше.
 * Используется cron-эндпоинтом /api/refresh-cache.
 */
export async function forceRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const fresh = await fetcher();

  await supabase
    .from('api_cache')
    .upsert(
      { key, data: fresh as object, cached_at: new Date().toISOString() },
      { onConflict: 'key' },
    );

  return fresh;
}
