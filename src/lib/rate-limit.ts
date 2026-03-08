/**
 * Simple in-memory sliding window rate limiter.
 *
 * NOTE: On serverless platforms each lambda instance has its own memory,
 * so this protects against abuse within a single instance. For multi-instance
 * deployments upgrade to a Redis/Upstash-backed solution using the same API.
 */

const store = new Map<string, number[]>();

// Cleanup entries older than 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, timestamps] of store) {
    const fresh = timestamps.filter(t => t > cutoff);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      store.set(key, fresh);
    }
  }
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 *
 * @param key       Unique identifier (e.g. IP + route)
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (store.get(key) ?? []).filter(t => t > windowStart);

  if (timestamps.length >= limit) {
    store.set(key, timestamps);
    cleanup(windowMs);
    return false;
  }

  timestamps.push(now);
  store.set(key, timestamps);
  cleanup(windowMs);
  return true;
}

/**
 * Extract the real client IP from request headers.
 * Reads X-Forwarded-For (set by Vercel/Cloudflare) then falls back to X-Real-IP.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
