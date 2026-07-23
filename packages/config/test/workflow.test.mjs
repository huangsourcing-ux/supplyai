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
  assert.match(source, /release:migrate:core/);
  assert.match(source, /release:migrate:cms/);
  assert.match(source, /PAYLOAD_SECRET:.*secrets\.PAYLOAD_SECRET/);
  assert.match(source, /NEXT_PUBLIC_SITE_URL:.*vars\.NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(source, /\bdeploy\b/i);
  assert.doesNotMatch(source, /workflow_dispatch|\bpush:/);
});

test("CI runs the frozen PR checks and gates staging on the CMS migration", async () => {
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

  assert.match(workflow.jobs.quality.steps.at(-1).run, /test:unit/);
  assert.match(
    workflow.jobs.build.steps.map((step) => step.run ?? "").join("\n"),
    /@chinasupply\/web build[\s\S]*@chinasupply\/api build/,
  );
  assert.match(workflow.jobs.api_e2e.steps.at(-1).run, /pnpm test:e2e/);
  assert.match(
    workflow.jobs.mobile.steps.map((step) => step.run ?? "").join("\n"),
    /doctor[\s\S]*config:check[\s\S]*test:unit/,
  );
  assert.equal(workflow.jobs.ci_gate.name, "CI Gate");

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
  assert.deepEqual(workflow.jobs.staging_release_gate.needs, [
    "ci_gate",
    "migrate_cms",
  ]);
  assert.equal(workflow.jobs.staging_release_gate.name, "Staging Release Gate");
  assert.doesNotMatch(source, /\beas\s+build\b|\beas\s+submit\b/);
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
    node: "22.23.1",
  });
  assert.deepEqual(easConfig.submit.production, {});
  assert.equal(easConfig.build.preview.environment, "preview");
  assert.equal(easConfig.build.preview.android.buildType, "apk");
});
