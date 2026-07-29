import { spawnSync } from "node:child_process";

const forwardedArgs = process.argv
  .slice(2)
  .filter((argument) => argument !== "--");
const result = spawnSync(
  "maestro",
  [
    "test",
    "--test-output-dir=.maestro-artifacts",
    ...forwardedArgs,
    "apps/mobile/.maestro/m4-t6.yaml",
  ],
  {
    cwd: new URL("..", import.meta.url),
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Unable to start Maestro: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
