import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const applicationDirectory = path.resolve(currentDirectory, "..");
const workspaceDirectory = path.resolve(applicationDirectory, "../..");
const localEnvironmentFile = path.join(applicationDirectory, ".env.local");

if (existsSync(localEnvironmentFile)) {
  loadEnvFile(localEnvironmentFile);
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const schemasBuild = spawnSync(
  executable,
  ["--filter", "@chinasupply/schemas", "build"],
  {
    cwd: workspaceDirectory,
    env: process.env,
    stdio: "inherit",
  },
);

if (schemasBuild.error) {
  throw schemasBuild.error;
}

if (schemasBuild.status !== 0) {
  process.exitCode = schemasBuild.status ?? 1;
} else {
  const result = spawnSync(
    executable,
    ["exec", "payload", ...process.argv.slice(2)],
    {
      cwd: applicationDirectory,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
