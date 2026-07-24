import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const apiRequire = createRequire(resolve("apps/api/package.json"));
const schemasEntry = apiRequire.resolve("@chinasupply/schemas");
assert.match(
  schemasEntry,
  /\/packages\/schemas\/dist\/index\.js$/,
  `@chinasupply/schemas resolved to an unexpected runtime entry: ${schemasEntry}`,
);
assert.doesNotMatch(
  schemasEntry,
  /\.ts$/,
  "@chinasupply/schemas must never resolve to TypeScript at runtime",
);

const schemas = await import(pathToFileURL(schemasEntry).href);
assert.equal(
  typeof schemas.getCategoriesResponseSchema?.parse,
  "function",
  "compiled schemas entry did not expose the frozen runtime contracts",
);

const port = await getAvailablePort();
const child = spawn(
  process.execPath,
  ["--enable-source-maps", "apps/api/dist/main.js"],
  {
    env: {
      ...process.env,
      APP_ENV: "local",
      DATABASE_URL:
        "postgresql://runtime_check:runtime_check@127.0.0.1:1/runtime_check",
      PORT: String(port),
      REDIS_URL: "redis://127.0.0.1:1",
      R2_CDN_BASE_URL: "http://127.0.0.1:9000",
      WEB_ORIGIN: "http://127.0.0.1:3000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  const response = await waitForLiveEndpoint(child, port);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: { status: "ok" },
    error: null,
    meta: {},
  });
  console.log(
    "Compiled API started under Node and loaded @chinasupply/schemas from dist.",
  );
} catch (error) {
  throw new Error(
    [
      error instanceof Error ? error.message : String(error),
      "API runtime output:",
      output.trim() || "(no output)",
    ].join("\n"),
  );
} finally {
  await stopChild(child);
}

async function getAvailablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not allocate an IPv4 port for the runtime check");
  }
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

/**
 * @param {import("node:child_process").ChildProcess} child
 * @param {number} port
 */
async function waitForLiveEndpoint(child, port) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Compiled API exited early with code ${child.exitCode}`);
    }

    try {
      return await fetch(`http://127.0.0.1:${port}/health/live`);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Compiled API did not expose /health/live within 5 seconds");
}

/** @param {import("node:child_process").ChildProcess} child */
async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const exited = once(child, "exit");
  const timeout = new Promise((resolve) =>
    setTimeout(resolve, 2_000, "timeout"),
  );
  if ((await Promise.race([exited, timeout])) === "timeout") {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}
