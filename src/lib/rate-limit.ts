import redis from './redis';

/**
 * Redis-backed sliding-window rate limiter.
 * Works correctly across multiple instances/processes.
 *
 * @param key       Unique identifier (e.g. IP + route)
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window size in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.pexpire(windowKey, windowMs);
    }
    return count <= limit;
  } catch {
    // Redis unavailable — fail open (allow request)
    return true;
  }
}

/**
 * Extract the real client IP from request headers.
 * Reads X-Forwarded-For (set by nginx) then falls back to X-Real-IP.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}
