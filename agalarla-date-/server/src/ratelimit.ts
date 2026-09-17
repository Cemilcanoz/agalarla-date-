/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Production would back this with Redis (see `REDIS_URL`) so limits are shared
 * across instances. For Sprint 1 and tests an in-memory limiter is sufficient
 * and keeps the unit suite free of external dependencies.
 */
export interface RateLimiter {
  /** Returns true when the action is allowed, false when the limit is hit. */
  hit(key: string): boolean;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = opts;
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, number[]>();

  return {
    hit(key: string): boolean {
      const t = now();
      const cutoff = t - windowMs;
      const hits = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);
      if (hits.length >= limit) {
        buckets.set(key, hits);
        return false;
      }
      hits.push(t);
      buckets.set(key, hits);
      return true;
    },
  };
}
