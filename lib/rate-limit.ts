import 'server-only';
import { prisma } from '@/lib/prisma';
import { getServerEnv } from '@/lib/env';

/**
 * In-process sliding-window rate limiter.
 *
 * Sufficient for a single-VPS deployment (one Node process behind Nginx).
 * For multi-instance deployments, swap `MemoryStore` for a Redis store — the
 * `RateLimiter` interface below is intentionally small for that reason.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

class MemoryStore implements RateLimiter {
  private buckets = new Map<string, number[]>();
  private lastSweep = 0;

  private sweep(windowMs: number) {
    const now = Date.now();
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, hits] of this.buckets) {
      const cutoff = now - windowMs;
      const fresh = hits.filter((t) => t > cutoff);
      if (fresh.length === 0) this.buckets.delete(key);
      else this.buckets.set(key, fresh);
    }
  }

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    this.sweep(windowMs);
    const now = Date.now();
    const hits = (this.buckets.get(key) ?? []).filter((t) => t > now - windowMs);

    if (hits.length >= limit) {
      const oldest = hits[0] ?? now;
      const resetAt = oldest + windowMs;
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    hits.push(now);
    this.buckets.set(key, hits);

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - hits.length),
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

const globalForLimiters = globalThis as unknown as { __rateLimiters?: Map<string, RateLimiter> };
const store: Map<string, RateLimiter> = (globalForLimiters.__rateLimiters ??= new Map());

export function getRateLimiter(namespace: string): RateLimiter {
  const existing = store.get(namespace);
  if (existing) return existing;
  const created = new MemoryStore();
  store.set(namespace, created);
  return created;
}

/* -------------------------------------------------------------------------- */
/*  Convenience presets                                                       */
/* -------------------------------------------------------------------------- */

export async function limitLogin(identifier: string, ip: string): Promise<RateLimitResult> {
  const env = getServerEnv();
  if (!env.RATE_LIMIT_ENABLED) {
    return { success: true, limit: env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, remaining: 99, resetAt: Date.now(), retryAfterSeconds: 0 };
  }
  const limiter = getRateLimiter('login');
  const windowMs = env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60_000;
  const perIp = await limiter.consume(`ip:${ip}`, env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS * 4, windowMs);
  if (!perIp.success) return perIp;
  return limiter.consume(`id:${identifier.toLowerCase()}`, env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS, windowMs);
}

export async function limitEnquiry(kind: string, ip: string): Promise<RateLimitResult> {
  const env = getServerEnv();
  if (!env.RATE_LIMIT_ENABLED) {
    return { success: true, limit: env.ENQUIRY_RATE_LIMIT_MAX_ATTEMPTS, remaining: 99, resetAt: Date.now(), retryAfterSeconds: 0 };
  }
  const limiter = getRateLimiter('enquiry');
  return limiter.consume(
    `${kind}:${ip}`,
    env.ENQUIRY_RATE_LIMIT_MAX_ATTEMPTS,
    env.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES * 60_000,
  );
}

export async function limitMutation(key: string, limit = 30, windowMs = 60_000): Promise<RateLimitResult> {
  return getRateLimiter('mutation').consume(key, limit, windowMs);
}

/* -------------------------------------------------------------------------- */
/*  Durable account lockout (survives restarts)                               */
/* -------------------------------------------------------------------------- */

export async function recordLoginAttempt(
  identifier: string,
  ip: string,
  success: boolean,
  userAgent?: string,
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: { identifier: identifier.toLowerCase().slice(0, 190), ipAddress: ip, success, userAgent: userAgent?.slice(0, 255) },
    });
  } catch {
    // Never let audit logging break authentication.
  }
}

export async function countRecentFailures(identifier: string, sinceMinutes = 15): Promise<number> {
  const since = new Date(Date.now() - sinceMinutes * 60_000);
  return prisma.loginAttempt.count({
    where: { identifier: identifier.toLowerCase().slice(0, 190), success: false, createdAt: { gte: since } },
  });
}
