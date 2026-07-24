import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  IMPORT_CONTRACT_VERSION,
  clusterImportRowSchema,
  factoryImportRowSchema,
  importJobDataSchema,
  importReportSchema,
  type ImportJobData,
  type ImportJobResult,
  type ImportReport,
  type ImportReportFailure,
  type ImportReportIssue,
} from "@chinasupply/schemas";

import {
  normalizeClusterCoordinates,
  normalizeFactoryCoordinates,
} from "./import-coordinates.js";
import {
  parseImportFile,
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
  entity: ImportJobData["entity"],
  candidate: ParsedImportCandidate,
): ValidatedCandidate {
  const result =
    entity === "clusters"
      ? clusterImportRowSchema.safeParse(candidate.value)
      : factoryImportRowSchema.safeParse(candidate.value);
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

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown import failure";
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @Inject(PrivateObjectStorageService)
    private readonly storage: PrivateObjectStorageService,
    @Inject(ImportPersistenceService)
    private readonly persistence: ImportPersistenceService,
  ) {}

  async process(input: ImportJobData): Promise<ImportJobResult> {
    const job = importJobDataSchema.parse(input);
    const startedAt = new Date().toISOString();
    const successes: ImportReport["successes"] = [];
    const failures: ImportReportFailure[] = [];
    let received = 0;

    try {
      const source = await this.storage.getText(job.sourceObjectKey);
      const candidates = parseImportFile(job.entity, job.sourceFormat, source);
      received = candidates.length;
      const validated = candidates.map((candidate) =>
        validateCandidate(job.entity, candidate),
      );
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
            message: "Duplicate slug in the same import file",
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
                      message: "Import row is invalid",
                    },
                  ]
                : candidate.issues,
          });
          continue;
        }

        try {
          const action =
            job.entity === "clusters"
              ? await this.persistence.saveCluster(
                  normalizeClusterCoordinates(
                    clusterImportRowSchema.parse(candidate.value),
                    job.sourceCoordinateSystem,
                  ),
                )
              : await (() => {
                  const normalized = normalizeFactoryCoordinates(
                    factoryImportRowSchema.parse(candidate.value),
                    job.sourceCoordinateSystem,
                  );
                  return this.persistence.saveFactory(
                    normalized.row,
                    normalized.locationGcj02,
                  );
                })();
          successes.push({
            row: candidate.row,
            slug: candidate.slug,
            action,
          });
        } catch (error) {
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
        `Completed ${job.entity} import ${job.importId}: ${successes.length} succeeded, ${failures.length} failed`,
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
        fatal: safeErrorMessage(error),
      });
      try {
        await this.writeReport(fatalReport);
      } catch (reportError) {
        this.logger.error(
          `Could not write fatal report for import ${job.importId}: ${safeErrorMessage(reportError)}`,
        );
      }
      throw error;
    }
  }

  private createReport(input: {
    job: ImportJobData;
    startedAt: string;
    received: number;
    successes: ImportReport["successes"];
    failures: ImportReportFailure[];
    fatal: string | null;
  }): ImportReport {
    return importReportSchema.parse({
      version: IMPORT_CONTRACT_VERSION,
      importId: input.job.importId,
      entity: input.job.entity,
      sourceFormat: input.job.sourceFormat,
      sourceCoordinateSystem: input.job.sourceCoordinateSystem,
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

  private async writeReport(report: ImportReport): Promise<void> {
    await this.storage.put(
      report.reportObjectKey,
      `${JSON.stringify(report, null, 2)}\n`,
      "application/json",
    );
  }
}
