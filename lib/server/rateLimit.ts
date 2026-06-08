import { getRedis, withRedisTimeout } from "./redis";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

const globalWithRateLimits = globalThis as typeof globalThis & {
  bobrosRateLimits?: Map<string, RateLimitRecord>;
};

if (!globalWithRateLimits.bobrosRateLimits) {
  globalWithRateLimits.bobrosRateLimits = new Map();
}

const rateLimitStore = globalWithRateLimits.bobrosRateLimits;

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfIp || "unknown";
}

export async function checkRateLimit({
  namespace,
  key,
  limit,
  windowMs,
}: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const redis = getRedis();

  if (!redis) {
    return checkMemoryRateLimit({ namespace, key, limit, windowMs });
  }

  const rateLimitKey = `bobros:rate:${namespace}:${key}`;
  const count = await withRedisTimeout(redis.incr(rateLimitKey));

  if (count === 1) {
    await withRedisTimeout(redis.pexpire(rateLimitKey, windowMs));
  }

  if (count <= limit) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  const ttl = await withRedisTimeout(redis.pttl(rateLimitKey));

  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttl, 1000) / 1000)),
  };
}

function checkMemoryRateLimit({
  namespace,
  key,
  limit,
  windowMs,
}: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const rateLimitKey = `${namespace}:${key}`;
  const current = rateLimitStore.get(rateLimitKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + windowMs });
    cleanupExpired(now);
    return { limited: false, retryAfterSeconds: 0 };
  }

  current.count += 1;

  if (current.count <= limit) {
    return { limited: false, retryAfterSeconds: 0 };
  }

  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

function cleanupExpired(now: number) {
  if (rateLimitStore.size < 500) return;

  rateLimitStore.forEach((record, key) => {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
}
