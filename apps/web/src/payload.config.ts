import { postgresAdapter } from "@payloadcms/db-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";

import { CmsUsers } from "./collections/CmsUsers";
import { cmsCollections } from "./collections/index";
import { disabledEmailAdapter } from "./email/disabled-email-adapter";
import { payloadEnvironment } from "./env/payload";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    importMap: {
      baseDir: currentDirectory,
    },
    user: CmsUsers.slug,
  },
  collections: cmsCollections,
  cors: [payloadEnvironment.siteUrl],
  csrf: [payloadEnvironment.siteUrl],
  db: postgresAdapter({
    migrationDir: path.resolve(currentDirectory, "migrations"),
    pool: {
      connectionString: payloadEnvironment.databaseUrl,
    },
    push: false,
  }),
  email: disabledEmailAdapter,
  graphQL: {
    disable: true,
  },
  secret: payloadEnvironment.payloadSecret,
  serverURL: payloadEnvironment.siteUrl,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(currentDirectory, "payload-types.ts"),
  },
});
