/**
 * Tiny in-memory fixed-window limiter. Fine for the single-process deployment
 * this app targets; it resets on restart and is not shared across instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, max = 5, windowMs = 15 * 60 * 1000, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > max;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
