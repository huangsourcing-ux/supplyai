import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(testDirectory, "../../..");

async function readYaml(relativePath) {
  const source = await readFile(resolve(workspaceRoot, relativePath), "utf8");
  return { source, workflow: parse(source) };
}

test("migration workflow is reusable only and never deploys applications", async () => {
  const { source, workflow } = await readYaml(
    ".github/workflows/release-migrations.yml",
  );

  assert.deepEqual(Object.keys(workflow.on), ["workflow_call"]);
  assert.ok(workflow.jobs.migrate.environment);
  assert.equal(workflow.jobs.migrate["timeout-minutes"], 15);
  assert.match(source, /release:migrate:core/);
  assert.match(source, /release:migrate:cms/);
  assert.match(source, /PAYLOAD_SECRET:.*secrets\.PAYLOAD_SECRET/);
  assert.match(source, /NEXT_PUBLIC_SITE_URL:.*vars\.NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(source, /\bdeploy\b/i);
  assert.doesNotMatch(source, /workflow_dispatch|\bpush:/);
});

test("CI runs the frozen PR checks and gates staging on serial CMS and core migrations", async () => {
  const { source, workflow } = await readYaml(".github/workflows/ci.yml");

  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(
    workflow.concurrency["cancel-in-progress"],
    "${{ github.event_name == 'pull_request' }}",
  );
  assert.doesNotMatch(source, /pull_request_target|workflow_dispatch/);

  const expectedJobTimeouts = {
    api_e2e: 20,
    build: 10,
    changes: 5,
    ci_gate: 5,
    mobile: 6,
    quality: 6,
    staging_release_gate: 5,
    web_e2e: 10,
  };
  for (const [jobName, timeoutMinutes] of Object.entries(expectedJobTimeouts)) {
    assert.equal(workflow.jobs[jobName]["timeout-minutes"], timeoutMinutes);
  }

  assert.match(
    workflow.jobs.quality.steps.map((step) => step.run ?? "").join("\n"),
    /api:generate:check[\s\S]*pnpm lint/,
  );
  assert.match(workflow.jobs.quality.steps.at(-1).run, /test:unit/);
  assert.match(
    workflow.jobs.build.steps.map((step) => step.run ?? "").join("\n"),
    /pnpm build[\s\S]*api:runtime:check/,
  );
  assert.match(workflow.jobs.api_e2e.steps.at(-1).run, /pnpm test:e2e/);
  assert.equal(workflow.jobs.web_e2e.name, "Web Playwright");
  const webE2eCommands = workflow.jobs.web_e2e.steps
    .map((step) => step.run ?? "")
    .join("\n");
  assert.match(
    webE2eCommands,
    /playwright install --with-deps chromium[\s\S]*pnpm test:web:e2e/,
  );
  assert.doesNotMatch(
    webE2eCommands,
    /test:web:e2e:staging|PLAYWRIGHT_STAGING_BASE_URL/,
  );
  const webE2eArtifact = workflow.jobs.web_e2e.steps.at(-1);
  assert.equal(webE2eArtifact.if, "failure()");
  assert.equal(webE2eArtifact.uses, "actions/upload-artifact@v4");
  assert.match(
    webE2eArtifact.with.path,
    /playwright-report[\s\S]*test-results/,
  );
  assert.match(
    workflow.jobs.mobile.steps.map((step) => step.run ?? "").join("\n"),
    /mobile:check[\s\S]*test:unit/,
  );
  assert.equal(workflow.jobs.ci_gate.name, "CI Gate");
  assert.ok(workflow.jobs.ci_gate.needs.includes("web_e2e"));
  assert.match(
    workflow.jobs.ci_gate.steps.at(-1).run,
    /WEB_E2E_RESULT.*success/,
  );

  assert.equal(
    workflow.jobs.migrate_cms.uses,
    "./.github/workflows/release-migrations.yml",
  );
  assert.deepEqual(workflow.jobs.migrate_cms.needs, ["ci_gate"]);
  assert.match(workflow.jobs.migrate_cms.if, /always\(\)/);
  assert.match(
    workflow.jobs.migrate_cms.if,
    /needs\.ci_gate\.result == 'success'/,
  );
  assert.equal(workflow.jobs.migrate_cms.with.target, "cms");
  assert.equal(
    workflow.jobs.migrate_cms.with.deployment_environment,
    "staging",
  );
  assert.equal(
    workflow.jobs.migrate_core.uses,
    "./.github/workflows/release-migrations.yml",
  );
  assert.deepEqual(workflow.jobs.migrate_core.needs, ["migrate_cms"]);
  assert.match(workflow.jobs.migrate_core.if, /always\(\)/);
  assert.match(
    workflow.jobs.migrate_core.if,
    /needs\.migrate_cms\.result == 'success'/,
  );
  assert.equal(workflow.jobs.migrate_core.with.target, "core");
  assert.equal(
    workflow.jobs.migrate_core.with.deployment_environment,
    "staging",
  );
  assert.deepEqual(workflow.jobs.staging_release_gate.needs, [
    "ci_gate",
    "migrate_cms",
    "migrate_core",
  ]);
  assert.equal(workflow.jobs.staging_release_gate.name, "Staging Release Gate");
  assert.match(
    workflow.jobs.staging_release_gate.steps.at(-1).run,
    /CMS_MIGRATION_RESULT[\s\S]*CORE_MIGRATION_RESULT/,
  );
  assert.doesNotMatch(source, /\beas\s+build\b|\beas\s+submit\b/);
});

test("API load baseline is manual, isolated, and preserves result artifacts", async () => {
  const { source, workflow } = await readYaml(".github/workflows/api-load.yml");

  assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.jobs.load["runs-on"], "ubuntu-latest");
  assert.match(
    workflow.jobs.load.steps.map((step) => step.run ?? "").join("\n"),
    /pnpm install --frozen-lockfile[\s\S]*pnpm test:load/,
  );
  const artifact = workflow.jobs.load.steps.at(-1);
  assert.equal(artifact.if, "always()");
  assert.equal(artifact.uses, "actions/upload-artifact@v4");
  assert.equal(artifact.with.path, ".generated/load-results");
  assert.doesNotMatch(source, /pull_request|\bpush:/);
});

test("EAS Preview is Android-only and can run only from rc tags or manual dispatch", async () => {
  const { workflow } = await readYaml(
    "apps/mobile/.eas/workflows/preview-build.yml",
  );

  assert.deepEqual(Object.keys(workflow.on).sort(), [
    "push",
    "workflow_dispatch",
  ]);
  assert.deepEqual(workflow.on.push.tags, ["rc-*"]);
  assert.equal(workflow.on.push.branches, undefined);
  assert.equal(workflow.on.pull_request, undefined);
  assert.equal(workflow.jobs.build_android.type, "build");
  assert.equal(workflow.jobs.build_android.environment, "preview");
  assert.deepEqual(workflow.jobs.build_android.params, {
    platform: "android",
    profile: "preview",
  });
});

test("EAS Production requires approval after a v tag and submits each successful platform build", async () => {
  const { workflow } = await readYaml(
    "apps/mobile/.eas/workflows/production-release.yml",
  );

  assert.deepEqual(Object.keys(workflow.on), ["push"]);
  assert.deepEqual(workflow.on.push.tags, ["v*"]);
  assert.equal(workflow.on.push.branches, undefined);
  assert.equal(workflow.on.pull_request, undefined);
  assert.equal(workflow.on.workflow_dispatch, undefined);

  assert.equal(workflow.jobs.approve_production.type, "require-approval");
  for (const platform of ["android", "ios"]) {
    const build = workflow.jobs[`build_${platform}`];
    const submit = workflow.jobs[`submit_${platform}`];

    assert.deepEqual(build.needs, ["approve_production"]);
    assert.equal(build.type, "build");
    assert.equal(build.environment, "production");
    assert.deepEqual(build.params, {
      platform,
      profile: "production",
    });
    assert.deepEqual(submit.needs, [`build_${platform}`]);
    assert.equal(submit.type, "submit");
    assert.equal(submit.params.profile, "production");
    assert.equal(
      submit.params.build_id,
      `\${{ needs.build_${platform}.outputs.build_id }}`,
    );
  }
});

test("EAS production build and submit profiles stay explicit", async () => {
  const easConfig = JSON.parse(
    await readFile(resolve(workspaceRoot, "apps/mobile/eas.json"), "utf8"),
  );

  assert.deepEqual(easConfig.build.production, {
    environment: "production",
    env: {
      EXPO_PUBLIC_APP_ENV: "production",
    },
    node: "22.23.1",
  });
  assert.deepEqual(easConfig.submit.production, {});
  assert.equal(easConfig.build.preview.environment, "preview");
  assert.equal(easConfig.build.preview.android.buildType, "apk");
});
