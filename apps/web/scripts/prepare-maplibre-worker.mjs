import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAPLIBRE_VERSION = "6.0.0";
const WORKER_ASSETS = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const applicationDirectory = path.resolve(currentDirectory, "..");
const mapLibreEntry = fileURLToPath(import.meta.resolve("maplibre-gl"));
const mapLibreDistributionDirectory = path.dirname(mapLibreEntry);
const mapLibrePackageFile = path.resolve(
  mapLibreDistributionDirectory,
  "..",
  "package.json",
);
const mapLibrePackage = JSON.parse(await readFile(mapLibrePackageFile, "utf8"));

if (mapLibrePackage.version !== MAPLIBRE_VERSION) {
  throw new Error(
    `Expected maplibre-gl@${MAPLIBRE_VERSION}, received ${String(mapLibrePackage.version)}.`,
  );
}

const outputDirectory = path.join(
  applicationDirectory,
  "public",
  "vendor",
  "maplibre-gl",
);

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  WORKER_ASSETS.map((asset) =>
    copyFile(
      path.join(mapLibreDistributionDirectory, asset),
      path.join(outputDirectory, asset),
    ),
  ),
);
