import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { MAX_UPLOAD_BYTES } from "@chinasupply/schemas";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";

import { CmsUsers } from "./collections/CmsUsers";
import { cmsCollections } from "./collections/index";
import { disabledEmailAdapter } from "./email/disabled-email-adapter";
import { payloadEnvironment } from "./env/payload";
import { buildCmsMediaCdnUrl } from "./cms/media-storage";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const mediaStorage = payloadEnvironment.mediaStorage;
const mediaCollectionPrefix = "articles";

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
  plugins: [
    s3Storage({
      alwaysInsertFields: true,
      bucket: mediaStorage?.bucket ?? "cms-migration-disabled",
      clientUploads: {
        access: ({ req }) => Boolean(req.user),
      },
      collections: {
        media: {
          generateFileURL: ({ filename, prefix }) =>
            buildCmsMediaCdnUrl(
              `${prefix || mediaCollectionPrefix}/${filename}`,
            ),
          prefix: mediaCollectionPrefix,
        },
      },
      config: {
        credentials: {
          accessKeyId: mediaStorage?.accessKeyId ?? "migration-disabled",
          secretAccessKey:
            mediaStorage?.secretAccessKey ?? "migration-disabled",
        },
        endpoint: mediaStorage?.endpoint ?? "http://127.0.0.1:1",
        forcePathStyle: true,
        region: "auto",
      },
      disableLocalStorage: true,
      enabled: mediaStorage !== null,
    }),
  ],
  secret: payloadEnvironment.payloadSecret,
  serverURL: payloadEnvironment.siteUrl,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(currentDirectory, "payload-types.ts"),
  },
  upload: {
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
    },
  },
});
