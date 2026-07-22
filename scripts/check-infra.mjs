import { spawnSync } from "node:child_process";

/**
 * @param {string[]} argumentsList
 * @param {string} label
 * @returns {string}
 */
function runDocker(argumentsList, label) {
  const result = spawnSync("docker", argumentsList, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    const detail =
      result.stderr.trim() || result.error?.message || "unknown error";
    throw new Error(`${label} failed: ${detail}`);
  }

  return result.stdout.trim();
}

const postgisVersion = runDocker(
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "sh",
    "-c",
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT PostGIS_Version();"',
  ],
  "PostGIS check",
);

const redisResponse = runDocker(
  ["compose", "exec", "-T", "redis", "redis-cli", "ping"],
  "Redis check",
);

if (!postgisVersion) {
  throw new Error("PostGIS check returned an empty version");
}

if (redisResponse !== "PONG") {
  throw new Error("Redis check returned an unexpected response");
}

console.log(`PostGIS: ${postgisVersion}`);
console.log(`Redis: ${redisResponse}`);
