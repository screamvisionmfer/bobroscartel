import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

export function hasRedisConfig() {
  return Boolean(redisUrl && redisToken);
}

export function canUseMemoryFallback() {
  return !hasRedisConfig() && process.env.NODE_ENV !== "production";
}

export function getRedis() {
  if (!hasRedisConfig()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Redis is not configured");
    }

    return null;
  }

  redis ??= new Redis({
    url: redisUrl as string,
    token: redisToken as string,
  });

  return redis;
}
