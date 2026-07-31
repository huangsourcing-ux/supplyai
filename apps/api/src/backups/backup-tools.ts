import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";

import { BACKUP_POSTGRES_MAJOR } from "./backup.constants.js";

const execFileAsync = promisify(execFile);
const MAX_DIAGNOSTIC_BYTES = 16 * 1_024;

export interface ToolVersions {
  ageVersion: string;
  pgDumpVersion: string;
  pgRestoreVersion: string;
}

const postgresUrlOptionEnvironment = new Map([
  ["application_name", "PGAPPNAME"],
  ["channel_binding", "PGCHANNELBINDING"],
  ["connect_timeout", "PGCONNECT_TIMEOUT"],
  ["gssencmode", "PGGSSENCMODE"],
  ["keepalives", "PGKEEPALIVES"],
  ["keepalives_count", "PGKEEPALIVESCOUNT"],
  ["keepalives_idle", "PGKEEPALIVESIDLE"],
  ["keepalives_interval", "PGKEEPALIVESINTERVAL"],
  ["options", "PGOPTIONS"],
  ["passfile", "PGPASSFILE"],
  ["sslcert", "PGSSLCERT"],
  ["sslcrl", "PGSSLCRL"],
  ["sslcrldir", "PGSSLCRLDIR"],
  ["sslkey", "PGSSLKEY"],
  ["sslmode", "PGSSLMODE"],
  ["sslrootcert", "PGSSLROOTCERT"],
  ["target_session_attrs", "PGTARGETSESSIONATTRS"],
  ["tcp_user_timeout", "PGTCPUSER_TIMEOUT"],
]);

export function buildPostgresProcessEnvironment(
  databaseUrl: string,
): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("PostgreSQL URL must use postgres or postgresql");
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.hostname.length === 0 || database.length === 0) {
    throw new Error("PostgreSQL URL must include a host and database");
  }

  const environment: NodeJS.ProcessEnv = {
    PGDATABASE: database,
    PGHOST: url.hostname,
    PGPORT: url.port.length > 0 ? url.port : "5432",
  };
  if (url.username.length > 0) {
    environment.PGUSER = decodeURIComponent(url.username);
  }
  if (url.password.length > 0) {
    environment.PGPASSWORD = decodeURIComponent(url.password);
  }
  for (const [parameter, variable] of postgresUrlOptionEnvironment) {
    const value = url.searchParams.get(parameter);
    if (value !== null) {
      environment[variable] = value;
    }
  }
  if (
    !url.searchParams.has("sslmode") &&
    url.searchParams.get("ssl") === "true"
  ) {
    environment.PGSSLMODE = "require";
  }
  return environment;
}

interface CommandSpec {
  executable: string;
  arguments: string[];
  environment?: NodeJS.ProcessEnv;
  label: string;
}

function captureStandardError(child: ChildProcess): () => string {
  let output = "";
  child.stderr?.on("data", (chunk: Buffer | string) => {
    if (Buffer.byteLength(output) >= MAX_DIAGNOSTIC_BYTES) {
      return;
    }
    output += chunk.toString().slice(0, MAX_DIAGNOSTIC_BYTES - output.length);
  });
  return () => output.trim();
}

function redact(value: string, secrets: readonly string[]): string {
  return secrets.reduce(
    (result, secret) =>
      secret.length === 0 ? result : result.replaceAll(secret, "[REDACTED]"),
    value,
  );
}

async function waitForExit(
  child: ChildProcess,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

function stop(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
}

export function parsePostgresToolMajor(version: string): number {
  const match = /PostgreSQL\)\s+(\d+)(?:\.|\s|[a-z]|$)/i.exec(version);
  if (match?.[1] === undefined) {
    throw new Error("Could not parse PostgreSQL tool version");
  }
  return Number.parseInt(match[1], 10);
}

export async function inspectBackupToolVersions(): Promise<ToolVersions> {
  const [pgDump, pgRestore] = await Promise.all([
    execFileAsync("pg_dump", ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    }),
    execFileAsync("pg_restore", ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    }),
  ]);
  const versions = {
    pgDumpVersion: pgDump.stdout.trim(),
    pgRestoreVersion: pgRestore.stdout.trim(),
  };
  for (const version of Object.values(versions)) {
    if (parsePostgresToolMajor(version) !== BACKUP_POSTGRES_MAJOR) {
      throw new Error(
        `Backup PostgreSQL tools must use major ${BACKUP_POSTGRES_MAJOR}`,
      );
    }
  }

  const age = await execFileAsync("age", ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  const ageVersion = age.stdout.trim();
  if (!/^v?1\.3(?:\.0)?(?:\s|$)/.test(ageVersion)) {
    throw new Error("Backup encryption requires age 1.3.0");
  }
  return { ...versions, ageVersion };
}

export async function runStreamingPipeline(input: {
  source: CommandSpec;
  destination: CommandSpec;
  timeoutMs: number;
  secrets?: readonly string[];
}): Promise<void> {
  const source = spawn(input.source.executable, input.source.arguments, {
    env: input.source.environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const destination = spawn(
    input.destination.executable,
    input.destination.arguments,
    {
      env: input.destination.environment,
      stdio: ["pipe", "ignore", "pipe"],
    },
  );
  const sourceError = captureStandardError(source);
  const destinationError = captureStandardError(destination);
  destination.stdin?.on("error", () => undefined);
  source.stdout?.pipe(destination.stdin!);

  let timedOut = false;
  let forceKillTimeout: NodeJS.Timeout | undefined;
  const timeout = setTimeout(() => {
    timedOut = true;
    stop(source);
    stop(destination);
    forceKillTimeout = setTimeout(() => {
      stop(source, "SIGKILL");
      stop(destination, "SIGKILL");
    }, 5_000);
  }, input.timeoutMs);

  try {
    const [sourceResult, destinationResult] = await Promise.all([
      waitForExit(source),
      waitForExit(destination),
    ]);
    if (timedOut) {
      throw new Error(
        `${input.source.label} → ${input.destination.label} timed out`,
      );
    }
    if (sourceResult.code !== 0 || destinationResult.code !== 0) {
      const diagnostic = [
        `${input.source.label} exited with ${sourceResult.code ?? sourceResult.signal ?? "unknown"}`,
        sourceError(),
        `${input.destination.label} exited with ${destinationResult.code ?? destinationResult.signal ?? "unknown"}`,
        destinationError(),
      ]
        .filter(Boolean)
        .join(": ");
      throw new Error(redact(diagnostic, input.secrets ?? []));
    }
  } finally {
    clearTimeout(timeout);
    if (forceKillTimeout !== undefined) {
      clearTimeout(forceKillTimeout);
    }
    stop(source);
    stop(destination);
  }
}
