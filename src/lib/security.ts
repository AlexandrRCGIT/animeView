const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  allowed.add(new URL(request.url).origin.toLowerCase());

  const appUrlOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (appUrlOrigin) allowed.add(appUrlOrigin);

  const extras = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
  for (const origin of extras) allowed.add(origin);

  return allowed;
}

/**
 * Защита от CSRF для JSON/API write-роутов.
 * - Блокируем явный cross-site по Sec-Fetch-Site.
 * - Если есть Origin, он должен совпадать с origin приложения.
 * - Если Origin отсутствует (curl/внутренние вызовы), не блокируем.
 */
export function isTrustedWriteRequest(request: Request): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') return false;

  const originHeader = request.headers.get('origin');
  if (!originHeader) return true;

  const normalizedOrigin = normalizeOrigin(originHeader);
  if (!normalizedOrigin) return false;

  return getAllowedOrigins(request).has(normalizedOrigin);
}

export function hasUnsafeControlChars(value: string): boolean {
  return CONTROL_CHARS_RE.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}
