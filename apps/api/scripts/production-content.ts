import { resolve } from "node:path";

import {
  exportProductionContent,
  importProductionContent,
  validateProductionContentSource,
} from "../src/production-content/production-content.js";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function assertArguments(
  command: string | undefined,
  argumentsList: string[],
): asserts command is "export" | "import" | "validate" {
  if (command === "export" || command === "validate") {
    if (
      process.env.APP_ENV !== "staging" ||
      argumentsList.length !== 2 ||
      argumentsList[1] !== "--confirm-curated-staging"
    ) {
      throw new Error(
        "Export requires APP_ENV=staging and the exact --confirm-curated-staging argument",
      );
    }
    return;
  }
  if (command === "import") {
    if (
      process.env.APP_ENV !== "production" ||
      argumentsList.length !== 3 ||
      argumentsList[2] !== "--confirm-production-draft"
    ) {
      throw new Error(
        "Import requires APP_ENV=production, a manifest key, and the exact --confirm-production-draft argument",
      );
    }
    return;
  }
  throw new Error(
    "Usage: production-content validate|export --confirm-curated-staging | import <manifest-key> --confirm-production-draft",
  );
}

const argumentsList = process.argv.slice(2);
const command = argumentsList[0];
assertArguments(command, argumentsList);
const curationPath = resolve(
  import.meta.dirname,
  "../../../data/production/curation.json",
);

if (command === "validate") {
  const dataset = await validateProductionContentSource({
    curationPath,
    databaseUrl: required("DATABASE_URL"),
  });
  console.log(
    JSON.stringify({
      counts: {
        regions: dataset.regions.length,
        categories: dataset.categories.length,
        clusters: dataset.clusters.length,
        factories: dataset.factories.length,
        articles: dataset.articles.length,
        media: dataset.media.length,
      },
      slugs: {
        clusters: dataset.clusters.map(({ slug }) => slug),
        factories: dataset.factories.map(({ slug }) => slug),
        articles: dataset.articles.map(({ slug }) => slug),
      },
      sourceState: "published-verified-curated",
    }),
  );
} else if (command === "export") {
  const result = await exportProductionContent({
    curationPath,
    databaseUrl: required("DATABASE_URL"),
    sourceStorage: {
      accountId: required("R2_ACCOUNT_ID"),
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      mediaBucket: required("R2_MEDIA_BUCKET"),
    },
    destinationStorage: {
      accountId: required("PRODUCTION_R2_ACCOUNT_ID"),
      accessKeyId: required("PRODUCTION_R2_ACCESS_KEY_ID"),
      secretAccessKey: required("PRODUCTION_R2_SECRET_ACCESS_KEY"),
      mediaBucket: required("PRODUCTION_R2_MEDIA_BUCKET"),
      privateBucket: required("PRODUCTION_R2_PRIVATE_BUCKET"),
    },
  });
  console.log(
    JSON.stringify({
      manifestObjectKey: result.manifestObjectKey,
      datasetSha256: result.manifest.dataset.sha256,
      counts: result.manifest.counts,
      slugs: result.manifest.slugs,
      media: result.manifest.media.map(
        ({ destinationObjectKey, bytes, sha256 }) => ({
          destinationObjectKey,
          bytes,
          sha256,
        }),
      ),
    }),
  );
} else {
  const manifest = await importProductionContent({
    databaseUrl: required("DATABASE_URL"),
    manifestObjectKey: argumentsList[1]!,
    storage: {
      accountId: required("R2_ACCOUNT_ID"),
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      mediaBucket: required("R2_MEDIA_BUCKET"),
      privateBucket: required("R2_PRIVATE_BUCKET"),
    },
  });
  console.log(
    JSON.stringify({
      manifestObjectKey: argumentsList[1],
      datasetSha256: manifest.dataset.sha256,
      counts: manifest.counts,
      state: "draft-unverified",
    }),
  );
}
