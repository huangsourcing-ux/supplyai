import type { RedisOptions } from "ioredis";

export function createRedisOptions(
  redisUrl: string,
  maxRetriesPerRequest: number | null,
): RedisOptions {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use the redis or rediss protocol");
  }

  const database =
    url.pathname === "" || url.pathname === "/"
      ? 0
      : Number.parseInt(url.pathname.slice(1), 10);

  if (!Number.isInteger(database) || database < 0) {
    throw new Error("REDIS_URL must contain a valid database number");
  }

  return {
    db: database,
    host: url.hostname,
    maxRetriesPerRequest,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    tls: url.protocol === "rediss:" ? {} : undefined,
    username: url.username ? decodeURIComponent(url.username) : undefined,
  };
}
