import { randomUUID } from "node:crypto";

import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import { Redis } from "ioredis";

import { createRedisOptions } from "../common/redis/redis-options.js";
import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage["increment"]>
>;

const incrementScript = `
local time = redis.call("TIME")
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])
local member = ARGV[4]
local cutoff = now - ttl

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", cutoff)

local blockTtl = redis.call("PTTL", KEYS[2])
local totalHits = redis.call("ZCARD", KEYS[1])

if blockTtl > 0 then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local timeToExpire = 0
  if #oldest == 2 then
    timeToExpire = math.max(0, math.ceil((tonumber(oldest[2]) + ttl - now) / 1000))
  end
  return {totalHits, timeToExpire, 1, math.ceil(blockTtl / 1000)}
end

redis.call("ZADD", KEYS[1], now, member)
redis.call("PEXPIRE", KEYS[1], ttl)
totalHits = redis.call("ZCARD", KEYS[1])

local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
local timeToExpire = math.ceil((tonumber(oldest[2]) + ttl - now) / 1000)
local isBlocked = 0
local timeToBlockExpire = 0

if totalHits > limit then
  redis.call("SET", KEYS[2], "1", "PX", blockDuration)
  isBlocked = 1
  timeToBlockExpire = math.ceil(blockDuration / 1000)
end

return {totalHits, timeToExpire, isBlocked, timeToBlockExpire}
`;

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly client: Redis;

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.client = new Redis({
      ...createRedisOptions(config.REDIS_URL, 1),
      commandTimeout: 3_000,
      connectTimeout: 3_000,
      lazyConnect: true,
    });
    this.client.on("error", () => {
      // Requests fail closed and readiness reports connectivity separately.
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hashTag = `{${throttlerName}:${key}}`;
    const result = await this.client.eval(
      incrementScript,
      2,
      `chinasupply:throttle:${hashTag}:hits`,
      `chinasupply:throttle:${hashTag}:blocked`,
      ttl,
      limit,
      blockDuration,
      randomUUID(),
    );

    if (
      !Array.isArray(result) ||
      result.length !== 4 ||
      result.some((value) => typeof value !== "number")
    ) {
      throw new Error("Redis returned an invalid throttler record");
    }

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = result;
    return {
      isBlocked: isBlocked === 1,
      timeToBlockExpire,
      timeToExpire,
      totalHits,
    };
  }

  onModuleDestroy(): void {
    this.client.disconnect(false);
  }
}
