import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!url || !token) {
    throw new Error(
      'redis_not_configured: set KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)'
    );
  }
  if (!redis) {
    redis = new Redis({ url, token });
  }
  return redis;
}

export function hasRedis(): boolean {
  return Boolean(url && token);
}
