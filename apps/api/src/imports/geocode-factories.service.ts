import { Inject, Injectable, Logger } from "@nestjs/common";
import { gcj02ToWgs84 } from "@chinasupply/geo";
import {
  IMPORT_CONTRACT_VERSION,
  factoryGeocodeRowSchema,
  factoryImportRowSchema,
  geocodeFactoriesJobDataSchema,
  geocodeFactoriesReportSchema,
  type GeocodeFactoriesJobData,
  type GeocodeFactoriesJobResult,
  type GeocodeFactoriesReport,
  type ImportReportFailure,
  type ImportReportIssue,
} from "@chinasupply/schemas";

import {
  AmapGeocodingClient,
  AmapGeocodingFatalError,
  AmapGeocodingRowError,
} from "./amap-geocoding.client.js";
import {
  parseFactoryGeocodeFile,
  type ParsedImportCandidate,
} from "./import-file-parser.js";
import {
  ImportPersistenceService,
  ImportRowError,
} from "./import-persistence.service.js";
import { PrivateObjectStorageService } from "./private-object-storage.service.js";

interface ValidatedCandidate {
  row: number;
  slug?: string;
  value?: unknown;
  issues: ImportReportIssue[];
}

function toReportIssue(issue: {
  path: readonly PropertyKey[];
  code: string;
  message: string;
}): ImportReportIssue {
  return {
    path: issue.path.map((part) =>
      typeof part === "symbol" ? (part.description ?? "symbol") : part,
    ),
    code: issue.code,
    message: issue.message,
  };
}

function possibleSlug(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "slug" in value &&
    typeof value.slug === "string"
  ) {
    return value.slug.trim();
  }
  return undefined;
}

function validateCandidate(
  candidate: ParsedImportCandidate,
): ValidatedCandidate {
  const result = factoryGeocodeRowSchema.safeParse(candidate.value);
  if (!result.success) {
    return {
      row: candidate.row,
      slug: possibleSlug(candidate.value),
      issues: [...candidate.issues, ...result.error.issues.map(toReportIssue)],
    };
  }
  return {
    row: candidate.row,
    slug: result.data.slug,
    value: result.data,
    issues: candidate.issues,
  };
}

function isPostgresRowDataError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = error.code;
  return (
    typeof code === "string" && (code.startsWith("22") || code.startsWith("23"))
  );
}

function safeFatalMessage(error: unknown): string {
  return error instanceof AmapGeocodingFatalError
    ? error.message
    : "Factory geocoding job failed";
}

@Injectable()
export class GeocodeFactoriesService {
  private readonly logger = new Logger(GeocodeFactoriesService.name);

  constructor(
    @Inject(PrivateObjectStorageService)
    private readonly storage: PrivateObjectStorageService,
    @Inject(ImportPersistenceService)
    private readonly persistence: ImportPersistenceService,
    @Inject(AmapGeocodingClient)
    private readonly geocoding: AmapGeocodingClient,
  ) {}

  async process(
    input: GeocodeFactoriesJobData,
  ): Promise<GeocodeFactoriesJobResult> {
    const job = geocodeFactoriesJobDataSchema.parse(input);
    const startedAt = new Date().toISOString();
    const successes: GeocodeFactoriesReport["successes"] = [];
    const failures: ImportReportFailure[] = [];
    let received = 0;

    try {
      const source = await this.storage.getText(job.sourceObjectKey);
      const candidates = parseFactoryGeocodeFile(job.sourceFormat, source);
      received = candidates.length;
      const validated = candidates.map(validateCandidate);
      const slugCounts = new Map<string, number>();
      for (const candidate of validated) {
        if (candidate.slug !== undefined && candidate.issues.length === 0) {
          slugCounts.set(
            candidate.slug,
            (slugCounts.get(candidate.slug) ?? 0) + 1,
          );
        }
      }

      for (const candidate of validated) {
        if (
          candidate.slug !== undefined &&
          (slugCounts.get(candidate.slug) ?? 0) > 1
        ) {
          candidate.issues.push({
            path: ["slug"],
            code: "duplicate_slug",
            message: "Duplicate slug in the same geocoding file",
          });
        }

        if (
          candidate.issues.length > 0 ||
          candidate.value === undefined ||
          candidate.slug === undefined
        ) {
          failures.push({
            row: candidate.row,
            ...(candidate.slug === undefined ? {} : { slug: candidate.slug }),
            issues:
              candidate.issues.length === 0
                ? [
                    {
                      path: [],
                      code: "invalid_row",
                      message: "Geocoding row is invalid",
                    },
                  ]
                : candidate.issues,
          });
          continue;
        }

        const row = factoryGeocodeRowSchema.parse(candidate.value);
        try {
          const geocoded = await this.geocoding.geocode(row.address.zh);
          const locationWgs84 = gcj02ToWgs84([
            geocoded.locationGcj02.lng,
            geocoded.locationGcj02.lat,
          ]);
          const completeRow = factoryImportRowSchema.parse({
            ...row,
            location: locationWgs84,
          });
          const action = await this.persistence.saveFactory(
            completeRow,
            geocoded.locationGcj02,
            { resetVerification: true },
          );
          successes.push({
            row: candidate.row,
            slug: candidate.slug,
            action,
            candidateCount: geocoded.candidateCount,
            formattedAddress: geocoded.formattedAddress,
            matchLevel: geocoded.matchLevel,
            locationGcj02: geocoded.locationGcj02,
            locationWgs84,
          });
        } catch (error) {
          if (error instanceof AmapGeocodingRowError) {
            failures.push({
              row: candidate.row,
              slug: candidate.slug,
              issues: [
                {
                  path: ["address", "zh"],
                  code: "geocoding_failed",
                  message: error.message,
                },
              ],
            });
            continue;
          }
          if (
            error instanceof ImportRowError ||
            isPostgresRowDataError(error)
          ) {
            failures.push({
              row: candidate.row,
              slug: candidate.slug,
              issues: [
                {
                  path: error instanceof ImportRowError ? [error.path] : [],
                  code:
                    error instanceof ImportRowError
                      ? "invalid_reference"
                      : "database_constraint",
                  message:
                    error instanceof ImportRowError
                      ? error.message
                      : "Row violates a database constraint",
                },
              ],
            });
            continue;
          }
          throw error;
        }
      }

      const report = this.createReport({
        job,
        startedAt,
        received,
        successes,
        failures,
        fatal: null,
      });
      await this.writeReport(report);
      this.logger.log(
        `Completed factory geocoding ${job.geocodeId}: ${successes.length} succeeded, ${failures.length} failed`,
      );
      return {
        reportObjectKey: report.reportObjectKey,
        totals: report.totals,
      };
    } catch (error) {
      const fatalReport = this.createReport({
        job,
        startedAt,
        received,
        successes,
        failures,
        fatal: safeFatalMessage(error),
      });
      try {
        await this.writeReport(fatalReport);
      } catch {
        this.logger.error(
          `Could not write fatal report for factory geocoding ${job.geocodeId}`,
        );
      }
      throw error;
    }
  }

  private createReport(input: {
    job: GeocodeFactoriesJobData;
    startedAt: string;
    received: number;
    successes: GeocodeFactoriesReport["successes"];
    failures: ImportReportFailure[];
    fatal: string | null;
  }): GeocodeFactoriesReport {
    return geocodeFactoriesReportSchema.parse({
      version: IMPORT_CONTRACT_VERSION,
      geocodeId: input.job.geocodeId,
      provider: "amap",
      sourceFormat: input.job.sourceFormat,
      sourceObjectKey: input.job.sourceObjectKey,
      reportObjectKey: input.job.reportObjectKey,
      startedAt: input.startedAt,
      finishedAt: new Date().toISOString(),
      totals: {
        received: input.received,
        inserted: input.successes.filter(
          (success) => success.action === "inserted",
        ).length,
        updated: input.successes.filter(
          (success) => success.action === "updated",
        ).length,
        failed: input.failures.length,
      },
      successes: input.successes,
      failures: input.failures,
      fatal: input.fatal,
    });
  }

  private async writeReport(report: GeocodeFactoriesReport): Promise<void> {
    await this.storage.put(
      report.reportObjectKey,
      `${JSON.stringify(report, null, 2)}\n`,
      "application/json",
    );
  }
}
