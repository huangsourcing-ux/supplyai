import { spawnSync } from "node:child_process";

const generatedPaths = [
  "apps/api/openapi.json",
  "packages/api-client/src/generated",
];

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ capture?: boolean }} [options]
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
}

function getGeneratedStatus() {
  return run(
    "git",
    [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      ...generatedPaths,
    ],
    { capture: true },
  ).trim();
}

const statusBeforeGeneration = getGeneratedStatus();
run("pnpm", ["api:generate"]);
const statusAfterGeneration = getGeneratedStatus();
const hasDrift =
  process.env.CI === "true"
    ? statusAfterGeneration !== ""
    : statusAfterGeneration !== statusBeforeGeneration;

if (hasDrift) {
  console.error(
    "Generated API artifacts drifted. Run `pnpm api:generate` and commit the results:",
  );
  console.error(statusAfterGeneration || "(tracked artifact was deleted)");
  process.exit(1);
}

console.log("Generated API artifacts are stable.");
