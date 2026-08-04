import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Lazy Upstash Redis client (HTTP-based — safe for Vercel serverless, no
 * persistent TCP connection). Returns null when unconfigured so every caller
 * degrades gracefully to the database. Supabase Postgres remains the source
 * of truth; Redis is a pure performance cache layer on top of it.
 */
let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
