import { describe, expect, it } from "vitest";

import {
  buildPostgresProcessEnvironment,
  parsePostgresToolMajor,
  runStreamingPipeline,
} from "../src/backups/backup-tools.js";

describe("backup process tools", () => {
  it("derives libpq variables without putting a database URL on argv", () => {
    expect(
      buildPostgresProcessEnvironment(
        "postgresql://user%40example:p%40ss@database.internal:6432/supply%20ai?sslmode=verify-full&connect_timeout=5",
      ),
    ).toEqual({
      PGCONNECT_TIMEOUT: "5",
      PGDATABASE: "supply ai",
      PGHOST: "database.internal",
      PGPASSWORD: "p@ss",
      PGPORT: "6432",
      PGSSLMODE: "verify-full",
      PGUSER: "user@example",
    });
    expect(() =>
      buildPostgresProcessEnvironment("https://database.invalid/supply"),
    ).toThrow(/PostgreSQL URL/);
  });

  it("parses PostgreSQL 17 tool output and rejects unknown formats", () => {
    expect(parsePostgresToolMajor("pg_dump (PostgreSQL) 17.5")).toBe(17);
    expect(parsePostgresToolMajor("pg_restore (PostgreSQL) 17beta1")).toBe(17);
    expect(() => parsePostgresToolMajor("pg_dump unknown")).toThrow(
      /Could not parse/,
    );
  });

  it("streams stdout between processes", async () => {
    await expect(
      runStreamingPipeline({
        source: {
          executable: process.execPath,
          arguments: ["-e", "process.stdout.write('archive')"],
          label: "source",
        },
        destination: {
          executable: process.execPath,
          arguments: [
            "-e",
            "let value='';process.stdin.on('data',c=>value+=c);process.stdin.on('end',()=>process.exit(value==='archive'?0:2))",
          ],
          label: "destination",
        },
        timeoutMs: 2_000,
      }),
    ).resolves.toBeUndefined();
  });

  it("redacts secrets from bounded process failures", async () => {
    const secret = "postgres://user:password@database.internal/app";
    let message = "";
    try {
      await runStreamingPipeline({
        source: {
          executable: process.execPath,
          arguments: ["-e", "process.stdout.write('archive')"],
          label: "source",
        },
        destination: {
          executable: process.execPath,
          arguments: [
            "-e",
            `process.stderr.write(${JSON.stringify(secret)});process.exit(7)`,
          ],
          label: "destination",
        },
        timeoutMs: 2_000,
        secrets: [secret],
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("[REDACTED]");
    expect(message).not.toContain(secret);
  });

  it("terminates a timed-out pipeline", async () => {
    await expect(
      runStreamingPipeline({
        source: {
          executable: process.execPath,
          arguments: ["-e", "setInterval(()=>{},1000)"],
          label: "source",
        },
        destination: {
          executable: process.execPath,
          arguments: ["-e", "process.stdin.resume();setInterval(()=>{},1000)"],
          label: "destination",
        },
        timeoutMs: 50,
      }),
    ).rejects.toThrow(/timed out/);
  });
});
