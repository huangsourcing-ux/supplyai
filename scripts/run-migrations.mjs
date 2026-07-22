import { spawnSync } from "node:child_process";

import { deploymentEnvironmentSchema } from "@chinasupply/config/env/common";

import { getMigrationCommand } from "./migration-contract.mjs";

const argumentsList = process.argv.slice(2);
const target = argumentsList.find((argument) => !argument.startsWith("--"));
const dryRun = argumentsList.includes("--dry-run");
const migration = getMigrationCommand(target);

if (dryRun) {
  console.log(`${migration.command} ${migration.args.join(" ")}`);
  process.exit(0);
}

const environmentResult = deploymentEnvironmentSchema.safeParse(
  process.env.APP_ENV,
);
if (!environmentResult.success) {
  throw new Error("APP_ENV must be one of: local, staging, production");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for migration release commands");
}

const executable =
  process.platform === "win32" ? "pnpm.cmd" : migration.command;
const result = spawnSync(executable, [...migration.args], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
