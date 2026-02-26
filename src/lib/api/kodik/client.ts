// ─── Kodik API Client (заготовка для Этапа 2) ────────────────────────────────
// Требует KODIK_TOKEN в переменных окружения

import type { KodikSearchResponse } from './types';

const BASE_URL = 'https://kodikapi.com';

function getToken(): string {
  const token = process.env.KODIK_TOKEN;
  if (!token) {
    throw new Error('KODIK_TOKEN is not set in environment variables');
  }
  return token;
}

/**
 * Найти контент в Kodik по ID Shikimori.
 * Возвращает список доступных озвучек/переводов с ссылками на плеер.
 */
export async function getKodikByShikimoriId(
  shikimoriId: number
): Promise<KodikSearchResponse> {
  const token = getToken();

  const params = new URLSearchParams({
    token,
    shikimori_id: String(shikimoriId),
    with_episodes: 'true',
    with_material_data: 'false',
    limit: '100',
  });

  const response = await fetch(`${BASE_URL}/search?${params}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Kodik API error: ${response.status}`);
  }

  return response.json() as Promise<KodikSearchResponse>;
}
