import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(testDirectory, "../../..");

const expectedDirectories = [
  "apps/api",
  "apps/mobile",
  "apps/web",
  "packages/analytics",
  "packages/api-client",
  "packages/config",
  "packages/geo",
  "packages/i18n",
  "packages/schemas",
];

test("workspace contains the frozen M0-T1 directory structure", async () => {
  await Promise.all(
    expectedDirectories.map((directory) =>
      access(resolve(workspaceRoot, directory)),
    ),
  );
});

test("pnpm discovers application and shared-package workspaces", async () => {
  const workspace = await readFile(
    resolve(workspaceRoot, "pnpm-workspace.yaml"),
    "utf8",
  );

  assert.match(workspace, /apps\/\*/);
  assert.match(workspace, /packages\/\*/);
});

test("root exposes every required quality command", async () => {
  const rootPackage = JSON.parse(
    await readFile(resolve(workspaceRoot, "package.json"), "utf8"),
  );

  assert.equal(rootPackage.private, true);
  assert.match(rootPackage.packageManager, /^pnpm@/);

  for (const script of ["build", "lint", "test:unit", "typecheck"]) {
    assert.equal(typeof rootPackage.scripts[script], "string");
  }
});

test("mobile pins the Sentry CLI required by the Gradle upload task", async () => {
  const mobilePackage = JSON.parse(
    await readFile(resolve(workspaceRoot, "apps/mobile/package.json"), "utf8"),
  );

  assert.equal(mobilePackage.devDependencies["@sentry/cli"], "2.58.0");
});

test("shared configuration exports loadable presets", async () => {
  const configPackage = JSON.parse(
    await readFile(resolve(testDirectory, "../package.json"), "utf8"),
  );

  assert.deepEqual(Object.keys(configPackage.exports).sort(), [
    "./env/api",
    "./env/common",
    "./env/mobile",
    "./env/sentry",
    "./env/web",
    "./eslint/base",
    "./tailwind/preset",
    "./typescript/base",
  ]);

  const [{ baseConfig, workspaceConfig }, { default: tailwindPreset }] =
    await Promise.all([
      import("../eslint/base.js"),
      import("../tailwind/preset.js"),
    ]);

  assert.ok(Array.isArray(baseConfig));
  assert.ok(Array.isArray(workspaceConfig));
  assert.deepEqual(tailwindPreset.plugins, []);
});
