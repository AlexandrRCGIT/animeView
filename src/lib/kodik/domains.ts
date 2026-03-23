export const KODIK_API_BASE_URL = 'https://kodik-api.com';
export const KODIK_PLAYER_BASE_URL = 'https://kodikplayer.com';
export const KODIK_SOCIAL_PLAYER_BASE_URL = 'https://kodikonline.com';
export const KODIK_DATA_BASE_URL = 'https://bd.kodikres.com';

const LEGACY_PLAYER_HOSTS = new Set([
  'kodik.info',
  'www.kodik.info',
  'kodik.biz',
  'www.kodik.biz',
  'kodik.cc',
  'www.kodik.cc',
]);

const LEGACY_API_HOSTS = new Set([
  'kodikapi.com',
  'www.kodikapi.com',
]);

const CURRENT_PLAYER_HOSTS = new Set([
  'kodikplayer.com',
  'www.kodikplayer.com',
  'kodikonline.com',
  'www.kodikonline.com',
]);

const CURRENT_API_HOSTS = new Set([
  'kodik-api.com',
  'www.kodik-api.com',
]);

export function normalizeKodikUrl(
  rawUrl: string,
  options?: { preferSocialPlayer?: boolean }
): string {
  const absolute = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  let parsed: URL;
  try {
    parsed = new URL(absolute);
  } catch {
    return absolute;
  }

  const host = parsed.hostname.toLowerCase();
  const targetPlayerHost = options?.preferSocialPlayer ? 'kodikonline.com' : 'kodikplayer.com';

  if (LEGACY_PLAYER_HOSTS.has(host) || CURRENT_PLAYER_HOSTS.has(host)) {
    parsed.protocol = 'https:';
    parsed.hostname = targetPlayerHost;
    return parsed.toString();
  }

  if (LEGACY_API_HOSTS.has(host) || CURRENT_API_HOSTS.has(host)) {
    parsed.protocol = 'https:';
    parsed.hostname = 'kodik-api.com';
    return parsed.toString();
  }

  return parsed.toString();
}
