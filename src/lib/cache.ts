import redis from './redis';

/**
 * Читает значение из Redis-кеша.
 * При cache miss — вызывает fetcher, сохраняет результат и возвращает.
 * Distributed lock предотвращает stampede при одновременных запросах.
 */
export async function getOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Попытка прочитать из кеша
  try {
    const cached = await redis.get(`cache:${key}`);
    if (cached) return JSON.parse(cached) as T;
  } catch {
    // Redis недоступен — продолжаем без кеша
  }

  // Distributed lock: только один fetcher на все инстансы
  const lockKey = `lock:${key}`;
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 10).catch(() => null);

  if (!locked) {
    // Другой инстанс уже делает fetch — ждём и читаем его результат
    await new Promise(r => setTimeout(r, 200));
    try {
      const retried = await redis.get(`cache:${key}`);
      if (retried) return JSON.parse(retried) as T;
    } catch {}
    // Всё ещё нет — выполняем свой fetch (нет lock-конкуренции на этом инстансе)
  }

  try {
    const fresh = await fetcher();
    await redis.set(`cache:${key}`, JSON.stringify(fresh), 'EX', ttlSeconds).catch(() => {});
    return fresh;
  } finally {
    if (locked) await redis.del(lockKey).catch(() => {});
  }
}

/**
 * Принудительно обновляет запись в кеше.
 * Используется cron-эндпоинтом /api/refresh-cache.
 */
export async function forceRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 86400,
): Promise<T> {
  const fresh = await fetcher();
  await redis.set(`cache:${key}`, JSON.stringify(fresh), 'EX', ttlSeconds).catch(() => {});
  return fresh;
}
