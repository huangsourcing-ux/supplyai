import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(currentDirectory, "src"),
      "@payload-config": path.resolve(
        currentDirectory,
        "src/payload.config.ts",
      ),
    },
  },
  test: {
    env: {
      APP_ENV: "local",
      DATABASE_URL:
        "postgresql://chinasupply:chinasupply_local_only@127.0.0.1:5432/chinasupply",
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3001/api/v1",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      PAYLOAD_SECRET: "unit_test_payload_secret_at_least_32_chars",
    },
    environment: "node",
    include: ["src/test/**/*.test.{ts,tsx}"],
  },
});
