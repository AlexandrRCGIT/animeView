export const TV_AUTH_CODE_LENGTH = 6;
export const TV_AUTH_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TV_AUTH_POLL_INTERVAL_MS = 2500;
export const TV_AUTH_TTL_MS = 10 * 60 * 1000;

const TV_AUTH_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeTvCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, TV_AUTH_CODE_LENGTH);
}

export function isValidTvCode(code: string): boolean {
  return TV_AUTH_CODE_RE.test(code);
}

export function isValidTvDeviceId(value: string): boolean {
  return UUID_RE.test(value);
}

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return headers.get('x-real-ip') ?? null;
}

export function getAppOrigin(requestUrl: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/+$/, '');
  }
  return new URL(requestUrl).origin;
}
