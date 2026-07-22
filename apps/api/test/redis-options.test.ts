import { describe, expect, it } from "vitest";

import { createRedisOptions } from "../src/common/redis/redis-options.js";

describe("createRedisOptions", () => {
  it("parses authenticated TLS URLs without adding a key prefix", () => {
    expect(
      createRedisOptions("rediss://user:p%40ss@redis.internal:6380/2", null),
    ).toEqual({
      db: 2,
      host: "redis.internal",
      maxRetriesPerRequest: null,
      password: "p@ss",
      port: 6380,
      tls: {},
      username: "user",
    });
  });

  it("rejects unsupported protocols and invalid database paths", () => {
    expect(() => createRedisOptions("http://localhost", 1)).toThrow(
      /redis or rediss/,
    );
    expect(() =>
      createRedisOptions("redis://localhost/not-a-number", 1),
    ).toThrow(/database number/);
  });
});
