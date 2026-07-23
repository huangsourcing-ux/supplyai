import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { isWgs84Position, wgs84ToBd09, wgs84ToGcj02 } from "../src/index.js";
import type {
  Bd09Position,
  Gcj02Position,
  Wgs84Position,
} from "../src/index.js";

type CoordinateMode = "bd09ll" | "gcj02" | "wgs84";
type Platform = "android" | "ios";

export interface ValidationPoint {
  id: string;
  city: string;
  cityZh: string;
  name: string;
  nameZh: string;
  wgs84: Wgs84Position;
  coordinateSource: string;
  entranceDescription: string | null;
  confirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

interface ValidationPointsFile {
  points: ValidationPoint[];
}

interface NavigationCandidate {
  coordinateMode: CoordinateMode;
  fallbackUrl: string;
  platform: Platform;
  primaryUrl: string;
  provider: "amap" | "apple" | "baidu" | "google";
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPointsPath = resolve(
  scriptDirectory,
  "../../../docs/operations/m0-t9-navigation-points.json",
);

const sourceApplication = "ChinaSupply.AI";
const genericDestinationName = "Destination";

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function coordinateValue(
  position: Wgs84Position | Gcj02Position | Bd09Position,
): string {
  const [longitude, latitude] = position;

  return `${formatCoordinate(latitude)},${formatCoordinate(longitude)}`;
}

function longitudeLatitudeValue(
  position: Wgs84Position | Gcj02Position | Bd09Position,
): string {
  const [longitude, latitude] = position;

  return `${formatCoordinate(longitude)},${formatCoordinate(latitude)}`;
}

function buildUrl(
  base: string,
  parameters: ReadonlyArray<readonly [string, string]>,
): string {
  const url = new URL(base);

  for (const [name, value] of parameters) {
    url.searchParams.set(name, value);
  }

  return url.toString();
}

function buildAppleCandidate(
  position: Wgs84Position | Gcj02Position,
  coordinateMode: "gcj02" | "wgs84",
): NavigationCandidate {
  const url = buildUrl("https://maps.apple.com/", [
    ["daddr", coordinateValue(position)],
    ["dirflg", "d"],
  ]);

  return {
    coordinateMode,
    fallbackUrl: url,
    platform: "ios",
    primaryUrl: url,
    provider: "apple",
  };
}

function buildGoogleCandidate(
  platform: Platform,
  position: Wgs84Position | Gcj02Position,
  coordinateMode: "gcj02" | "wgs84",
): NavigationCandidate {
  const url = buildUrl("https://www.google.com/maps/dir/", [
    ["api", "1"],
    ["destination", coordinateValue(position)],
    ["travelmode", "driving"],
    ["dir_action", "navigate"],
  ]);

  return {
    coordinateMode,
    fallbackUrl: url,
    platform,
    primaryUrl: url,
    provider: "google",
  };
}

function buildAmapCandidate(
  platform: Platform,
  position: Wgs84Position | Gcj02Position,
  coordinateMode: "gcj02" | "wgs84",
): NavigationCandidate {
  const [longitude, latitude] = position;
  const primaryUrl = buildUrl(
    platform === "ios" ? "iosamap://navi" : "androidamap://navi",
    [
      ["sourceApplication", sourceApplication],
      ["poiname", genericDestinationName],
      ["lat", formatCoordinate(latitude)],
      ["lon", formatCoordinate(longitude)],
      ["dev", coordinateMode === "wgs84" ? "1" : "0"],
      ["style", "0"],
    ],
  );
  const fallbackUrl = buildUrl("https://uri.amap.com/navigation", [
    ["from", ""],
    ["to", `${longitudeLatitudeValue(position)},${genericDestinationName}`],
    ["mode", "car"],
    ["policy", "0"],
    ["src", "chinasupply.ai"],
    ["callnative", "0"],
  ]);

  return {
    coordinateMode,
    fallbackUrl,
    platform,
    primaryUrl,
    provider: "amap",
  };
}

function buildBaiduCandidate(
  platform: Platform,
  position: Wgs84Position | Gcj02Position | Bd09Position,
  coordinateMode: CoordinateMode,
): NavigationCandidate {
  const source =
    platform === "ios" ? "ios.chinasupply.ai" : "andr.chinasupply.ai";
  const primaryUrl = buildUrl("baidumap://map/navi", [
    ["location", coordinateValue(position)],
    ["coord_type", coordinateMode],
    ["query", genericDestinationName],
    ["src", source],
  ]);
  const fallbackUrl = buildUrl("https://api.map.baidu.com/direction", [
    ["origin", "我的位置"],
    [
      "destination",
      `latlng:${coordinateValue(position)}|name:${genericDestinationName}`,
    ],
    ["mode", "driving"],
    ["coord_type", coordinateMode],
    ["output", "html"],
    ["src", "webapp.chinasupply.ai"],
  ]);

  return {
    coordinateMode,
    fallbackUrl,
    platform,
    primaryUrl,
    provider: "baidu",
  };
}

export function buildNavigationCandidates(
  wgs84: Wgs84Position,
): NavigationCandidate[] {
  const gcj02 = wgs84ToGcj02(wgs84);
  const bd09 = wgs84ToBd09(wgs84);
  const candidates: NavigationCandidate[] = [
    buildAppleCandidate(wgs84, "wgs84"),
    buildAppleCandidate(gcj02, "gcj02"),
  ];

  for (const platform of ["ios", "android"] as const) {
    candidates.push(
      buildGoogleCandidate(platform, wgs84, "wgs84"),
      buildGoogleCandidate(platform, gcj02, "gcj02"),
      buildAmapCandidate(platform, wgs84, "wgs84"),
      buildAmapCandidate(platform, gcj02, "gcj02"),
      buildBaiduCandidate(platform, wgs84, "wgs84"),
      buildBaiduCandidate(platform, gcj02, "gcj02"),
      buildBaiduCandidate(platform, bd09, "bd09ll"),
    );
  }

  return candidates;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function assertValidPointsFile(
  value: unknown,
): asserts value is ValidationPointsFile {
  if (
    typeof value !== "object" ||
    value === null ||
    !("points" in value) ||
    !Array.isArray(value.points) ||
    value.points.length !== 5
  ) {
    throw new Error("Navigation validation requires exactly five points.");
  }

  const ids = new Set<string>();

  for (const point of value.points) {
    if (
      typeof point !== "object" ||
      point === null ||
      typeof point.id !== "string" ||
      typeof point.city !== "string" ||
      typeof point.cityZh !== "string" ||
      typeof point.name !== "string" ||
      typeof point.nameZh !== "string" ||
      typeof point.coordinateSource !== "string" ||
      !(
        point.entranceDescription === null ||
        typeof point.entranceDescription === "string"
      ) ||
      typeof point.confirmed !== "boolean" ||
      !isWgs84Position(point.wgs84)
    ) {
      throw new Error("Navigation validation point data is invalid.");
    }

    if (ids.has(point.id)) {
      throw new Error(`Duplicate navigation validation point: ${point.id}`);
    }

    ids.add(point.id);
  }
}

export function buildNavigationValidationHtml(
  points: ValidationPoint[],
  allowUnconfirmed = false,
): string {
  const unconfirmed = points.filter(
    (point) =>
      !point.confirmed ||
      !point.confirmedBy ||
      !point.confirmedAt ||
      !point.entranceDescription,
  );

  if (!allowUnconfirmed && unconfirmed.length > 0) {
    throw new Error(
      `Refusing to generate a formal validation page: ${unconfirmed
        .map((point) => point.city)
        .join(
          ", ",
        )} still use unconfirmed coordinates. Confirm the main vehicle entrances or pass --allow-unconfirmed for preview only.`,
    );
  }

  const pointSections = points
    .map((point) => {
      const candidates = buildNavigationCandidates(point.wgs84);
      const rows = candidates
        .map(
          (candidate) => `
            <tr>
              <td>${escapeHtml(candidate.platform)}</td>
              <td>${escapeHtml(candidate.provider)}</td>
              <td>${escapeHtml(candidate.coordinateMode)}</td>
              <td><a href="${escapeHtml(candidate.primaryUrl)}">Open app candidate</a></td>
              <td><a href="${escapeHtml(candidate.fallbackUrl)}">Open web fallback</a></td>
              <td></td>
              <td></td>
            </tr>`,
        )
        .join("");

      return `
        <section>
          <h2>${escapeHtml(point.cityZh)} / ${escapeHtml(point.city)}</h2>
          <p><strong>${escapeHtml(point.nameZh)}</strong> — ${escapeHtml(point.name)}</p>
          <p>WGS-84 candidate: ${escapeHtml(
            longitudeLatitudeValue(point.wgs84),
          )}; confirmed: <strong>${point.confirmed ? "yes" : "NO — PREVIEW ONLY"}</strong></p>
          <table>
            <thead>
              <tr><th>Platform</th><th>Provider</th><th>Mode</th><th>Primary</th><th>Fallback</th><th>Error (m)</th><th>Result / evidence</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>M0-T9 Navigation Validation</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 24px; color: #172033; }
      .warning { padding: 12px; background: #fff3cd; border: 1px solid #d99b00; }
      section { margin-block: 32px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #c7ced9; padding: 8px; text-align: left; }
      th { background: #eef2f7; }
      a { color: #0759b7; }
    </style>
  </head>
  <body>
    <h1>M0-T9 Navigation Validation</h1>
    ${
      unconfirmed.length > 0
        ? '<p class="warning"><strong>Preview only:</strong> one or more landmark entrance coordinates are not human-confirmed. Results from this page cannot close M0-T9.</p>'
        : ""
    }
    <p>Record the physical device, OS, map app version, landing error, and evidence for every installed-app case. Test one fallback case per provider and platform after removing or disabling the app.</p>
    ${pointSections}
  </body>
</html>`;
}

interface CliOptions {
  allowUnconfirmed: boolean;
  outputPath?: string;
  pointsPath: string;
}

function parseCliOptions(arguments_: string[]): CliOptions {
  const options: CliOptions = {
    allowUnconfirmed: false,
    pointsPath: defaultPointsPath,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--") {
      continue;
    } else if (argument === "--allow-unconfirmed") {
      options.allowUnconfirmed = true;
    } else if (argument === "--output" || argument === "--points") {
      const value = arguments_[index + 1];

      if (!value) {
        throw new Error(`${argument} requires a path.`);
      }

      if (argument === "--output") {
        options.outputPath = resolve(value);
      } else {
        options.pointsPath = resolve(value);
      }

      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const contents = await readFile(options.pointsPath, "utf8");
  const parsed: unknown = JSON.parse(contents);

  assertValidPointsFile(parsed);

  const html = buildNavigationValidationHtml(
    parsed.points,
    options.allowUnconfirmed,
  );

  if (options.outputPath) {
    await writeFile(options.outputPath, html, "utf8");
    process.stdout.write(`${options.outputPath}\n`);
  } else {
    process.stdout.write(html);
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (invokedPath === import.meta.url) {
  await main();
}
