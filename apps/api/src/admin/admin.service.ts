import {
  buildSearchText,
  createAdminClusterBodySchema,
  createAdminFactoryBodySchema,
  createUploadPresignBodySchema,
  decodeCursor,
  encodeCursor,
  type GeoJsonMultiPolygon,
  getAdminClustersQuerySchema,
  getAdminFactoriesQuerySchema,
  updateAdminClusterBodySchema,
  updateAdminFactoryBodySchema,
} from "@chinasupply/schemas";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";

import { MapCacheInvalidationService } from "../cache/map-cache-invalidation.service.js";
import { responseWithMeta } from "../common/http/api-envelope.js";
import { DatabaseService } from "../database/database.service.js";
import {
  categories,
  clusterCategories,
  clusters,
  factories,
  factoryCategories,
  regions,
} from "../database/schema.js";
import { MediaObjectStorageService } from "../media/media-object-storage.service.js";
import { PublicMediaUrlService } from "../media/public-media-url.service.js";
import {
  type AdminClusterListRow,
  type AdminClusterRow,
  type AdminFactoryListRow,
  type AdminFactoryRow,
  toAdminCluster,
  toAdminClusterListItem,
  toAdminFactory,
  toAdminFactoryListItem,
} from "./admin.mapper.js";

type GetAdminClustersQuery = z.output<typeof getAdminClustersQuerySchema>;
type GetAdminFactoriesQuery = z.output<typeof getAdminFactoriesQuerySchema>;
type CreateAdminClusterBody = z.output<typeof createAdminClusterBodySchema>;
type CreateAdminFactoryBody = z.output<typeof createAdminFactoryBodySchema>;
type CreateUploadPresignBody = z.output<typeof createUploadPresignBodySchema>;
type UpdateAdminClusterBody = z.output<typeof updateAdminClusterBodySchema>;
type UpdateAdminFactoryBody = z.output<typeof updateAdminFactoryBodySchema>;

type AdminCursorRow = {
  id: string;
  updatedAt: Date;
};

function paginateAdminRows<Row extends AdminCursorRow>(
  rows: readonly Row[],
  limit: number,
): { nextCursor: string | null; pageRows: Row[] } {
  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : [...rows];
  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasNextPage && lastRow !== undefined
      ? encodeCursor({
          sort: [lastRow.updatedAt.toISOString(), lastRow.id],
          v: 1,
        })
      : null;

  return { nextCursor, pageRows };
}

function adminCursorCondition(
  cursor: string | undefined,
  updatedAt: typeof clusters.updatedAt | typeof factories.updatedAt,
  id: typeof clusters.id | typeof factories.id,
): SQL | undefined {
  if (cursor === undefined) {
    return undefined;
  }

  const decoded = decodeCursor(cursor);
  const cursorUpdatedAt = new Date(decoded.sort[0]);
  return or(
    lt(updatedAt, cursorUpdatedAt),
    and(eq(updatedAt, cursorUpdatedAt), lt(id, decoded.sort[1])),
  );
}

function boundarySql(boundary: GeoJsonMultiPolygon | null) {
  return boundary === null
    ? null
    : sql`ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326))`;
}

function assertAllReferencesExist(
  expectedIds: readonly string[],
  actualIds: readonly string[],
  field: string,
): void {
  if (
    expectedIds.length !== actualIds.length ||
    expectedIds.some((id) => !actualIds.includes(id))
  ) {
    throw new BadRequestException(`${field} contains an unknown reference`);
  }
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return false;
    }

    if ("code" in current && current.code === expectedCode) {
      return true;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return false;
}

async function mapSlugConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (hasErrorCode(error, "23505")) {
      throw new BadRequestException("slug is already in use");
    }
    throw error;
  }
}

const adminClusterSelection = {
  boundary: sql<GeoJsonMultiPolygon | null>`
    case
      when ${clusters.boundary} is null then null
      else ST_AsGeoJSON(${clusters.boundary})::jsonb
    end
  `,
  centroid: clusters.centroid,
  coverImage: clusters.coverImage,
  createdAt: clusters.createdAt,
  description: clusters.description,
  id: clusters.id,
  mainProducts: clusters.mainProducts,
  name: clusters.name,
  primaryCategoryId: clusters.primaryCategoryId,
  publishedAt: clusters.publishedAt,
  regionId: clusters.regionId,
  slug: clusters.slug,
  stats: clusters.stats,
  status: clusters.status,
  summary: clusters.summary,
  updatedAt: clusters.updatedAt,
};

const adminFactorySelection = {
  address: factories.address,
  certifications: factories.certifications,
  clusterId: factories.clusterId,
  contact: factories.contact,
  createdAt: factories.createdAt,
  employeeRange: factories.employeeRange,
  establishedYear: factories.establishedYear,
  id: factories.id,
  images: factories.images,
  lastVerifiedAt: factories.lastVerifiedAt,
  location: factories.location,
  mainProducts: factories.mainProducts,
  moq: factories.moq,
  name: factories.name,
  publishedAt: factories.publishedAt,
  regionId: factories.regionId,
  slug: factories.slug,
  sourceName: factories.sourceName,
  sourceUrl: factories.sourceUrl,
  status: factories.status,
  updatedAt: factories.updatedAt,
  verified: factories.verified,
  verifiedAt: factories.verifiedAt,
  verifiedBy: factories.verifiedBy,
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublicMediaUrlService)
    private readonly mediaUrls: PublicMediaUrlService,
    @Inject(MediaObjectStorageService)
    private readonly mediaObjects: MediaObjectStorageService,
    @Inject(MapCacheInvalidationService)
    private readonly mapCache: MapCacheInvalidationService,
  ) {}

  async createCluster(input: CreateAdminClusterBody) {
    if (input.coverImageObjectKey != null) {
      throw new BadRequestException(
        "Create the cluster before uploading its cover image",
      );
    }

    const id = await mapSlugConflict(() =>
      this.database.db.transaction(async (transaction) => {
        const categoryRows = await transaction
          .select({
            aliases: categories.aliases,
            id: categories.id,
            name: categories.name,
            parentId: categories.parentId,
          })
          .from(categories)
          .where(inArray(categories.id, input.categoryIds));
        assertAllReferencesExist(
          input.categoryIds,
          categoryRows.map((category) => category.id),
          "categoryIds",
        );

        const primaryCategory = categoryRows.find(
          (category) => category.id === input.primaryCategoryId,
        );
        if (primaryCategory === undefined) {
          throw new BadRequestException(
            "categoryIds must include primaryCategoryId",
          );
        }
        if (primaryCategory.parentId !== null) {
          throw new BadRequestException(
            "primaryCategoryId must reference a root category",
          );
        }

        const [region] = await transaction
          .select({ id: regions.id })
          .from(regions)
          .where(eq(regions.id, input.regionId))
          .limit(1);
        if (region === undefined) {
          throw new BadRequestException("regionId is unknown");
        }

        const orderedCategories = input.categoryIds.map((categoryId) => {
          const category = categoryRows.find((row) => row.id === categoryId);
          if (category === undefined) {
            throw new BadRequestException("categoryIds is invalid");
          }
          return category;
        });
        const searchText = buildSearchText({
          categories: orderedCategories,
          kind: "cluster",
          mainProducts: input.mainProducts,
          name: input.name,
          summary: input.summary,
        });
        const [created] = await transaction
          .insert(clusters)
          .values({
            boundary: boundarySql(input.boundary ?? null),
            centroid: input.centroid.coordinates,
            coverImage: null,
            description: input.description ?? null,
            mainProducts: input.mainProducts,
            name: input.name,
            primaryCategoryId: input.primaryCategoryId,
            regionId: input.regionId,
            slug: input.slug,
            stats: input.stats ?? null,
            summary: input.summary,
            ...searchText,
          })
          .returning({ id: clusters.id });
        if (created === undefined) {
          throw new Error("Cluster insert returned no row");
        }

        await transaction.insert(clusterCategories).values(
          input.categoryIds.map((categoryId) => ({
            categoryId,
            clusterId: created.id,
          })),
        );
        return created.id;
      }),
    );

    return this.getCluster(id);
  }

  async createFactory(input: CreateAdminFactoryBody) {
    if (input.images !== undefined && input.images.length > 0) {
      throw new BadRequestException(
        "Create the factory before uploading its images",
      );
    }

    const id = await mapSlugConflict(() =>
      this.database.db.transaction(async (transaction) => {
        const categoryRows = await transaction
          .select({
            aliases: categories.aliases,
            id: categories.id,
            name: categories.name,
          })
          .from(categories)
          .where(inArray(categories.id, input.categoryIds));
        assertAllReferencesExist(
          input.categoryIds,
          categoryRows.map((category) => category.id),
          "categoryIds",
        );

        const [region] = await transaction
          .select({ id: regions.id })
          .from(regions)
          .where(eq(regions.id, input.regionId))
          .limit(1);
        if (region === undefined) {
          throw new BadRequestException("regionId is unknown");
        }

        const clusterId = input.clusterId ?? null;
        if (clusterId !== null) {
          const [cluster] = await transaction
            .select({ id: clusters.id })
            .from(clusters)
            .where(eq(clusters.id, clusterId))
            .limit(1);
          if (cluster === undefined) {
            throw new BadRequestException("clusterId is unknown");
          }
        }

        const orderedCategories = input.categoryIds.map((categoryId) => {
          const category = categoryRows.find((row) => row.id === categoryId);
          if (category === undefined) {
            throw new BadRequestException("categoryIds is invalid");
          }
          return category;
        });
        const searchText = buildSearchText({
          categories: orderedCategories,
          kind: "factory",
          mainProducts: input.mainProducts,
          name: input.name,
        });
        const [created] = await transaction
          .insert(factories)
          .values({
            address: input.address,
            certifications: input.certifications ?? [],
            clusterId,
            contact: input.contact ?? null,
            employeeRange: input.employeeRange ?? null,
            establishedYear: input.establishedYear ?? null,
            images: [],
            location: input.location.coordinates,
            locationGcj02: null,
            mainProducts: input.mainProducts,
            moq: input.moq ?? null,
            name: input.name,
            regionId: input.regionId,
            slug: input.slug,
            sourceName: input.sourceName ?? null,
            sourceUrl: input.sourceUrl ?? null,
            ...searchText,
          })
          .returning({ id: factories.id });
        if (created === undefined) {
          throw new Error("Factory insert returned no row");
        }

        await transaction.insert(factoryCategories).values(
          input.categoryIds.map((categoryId) => ({
            categoryId,
            factoryId: created.id,
          })),
        );
        return created.id;
      }),
    );

    return this.getFactory(id);
  }

  async createUploadPresign(input: CreateUploadPresignBody) {
    const table = input.kind === "cluster-cover" ? clusters : factories;
    const [entity] = await this.database.db
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, input.entityId))
      .limit(1);
    if (entity === undefined) {
      throw new NotFoundException();
    }

    return this.mediaObjects.createPresignedUpload({
      contentType: input.contentType,
      entityId: input.entityId,
      kind: input.kind,
    });
  }

  async listClusters(query: GetAdminClustersQuery) {
    const cursorCondition = adminCursorCondition(
      query.cursor,
      clusters.updatedAt,
      clusters.id,
    );
    const rows = await this.database.db
      .select({
        factoryCount: sql<number>`(
          select count(*)::integer
          from ${factories}
          where ${factories.clusterId} = ${clusters.id}
        )`,
        id: clusters.id,
        name: clusters.name,
        publishedAt: clusters.publishedAt,
        slug: clusters.slug,
        status: clusters.status,
        updatedAt: clusters.updatedAt,
      })
      .from(clusters)
      .where(cursorCondition)
      .orderBy(desc(clusters.updatedAt), desc(clusters.id))
      .limit(query.limit + 1);
    const { nextCursor, pageRows } = paginateAdminRows(rows, query.limit);

    return responseWithMeta(
      pageRows.map((row) =>
        toAdminClusterListItem(row satisfies AdminClusterListRow),
      ),
      { nextCursor },
    );
  }

  async getCluster(id: string) {
    const [row] = await this.database.db
      .select(adminClusterSelection)
      .from(clusters)
      .where(eq(clusters.id, id))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException();
    }

    const categoryRows = await this.database.db
      .select({ id: clusterCategories.categoryId })
      .from(clusterCategories)
      .where(eq(clusterCategories.clusterId, id))
      .orderBy(asc(clusterCategories.categoryId));

    return toAdminCluster(
      row satisfies AdminClusterRow,
      categoryRows.map((category) => category.id),
      this.mediaUrls,
    );
  }

  async updateCluster(id: string, input: UpdateAdminClusterBody) {
    if (input.coverImageObjectKey != null) {
      const [cluster] = await this.database.db
        .select({ id: clusters.id })
        .from(clusters)
        .where(eq(clusters.id, id))
        .limit(1);
      if (cluster === undefined) {
        throw new NotFoundException();
      }
      await this.mediaObjects.assertValidReference({
        entityId: id,
        kind: "cluster-cover",
        objectKey: input.coverImageObjectKey,
      });
    }

    await mapSlugConflict(() =>
      this.database.db.transaction(async (transaction) => {
        const [current] = await transaction
          .select(adminClusterSelection)
          .from(clusters)
          .where(eq(clusters.id, id))
          .limit(1);
        if (current === undefined) {
          throw new NotFoundException();
        }

        const currentCategoryRows = await transaction
          .select({ id: clusterCategories.categoryId })
          .from(clusterCategories)
          .where(eq(clusterCategories.clusterId, id))
          .orderBy(asc(clusterCategories.categoryId));
        const categoryIds =
          input.categoryIds ?? currentCategoryRows.map((row) => row.id);
        const primaryCategoryId =
          input.primaryCategoryId ?? current.primaryCategoryId;
        if (!categoryIds.includes(primaryCategoryId)) {
          throw new BadRequestException(
            "categoryIds must include primaryCategoryId",
          );
        }

        const categoryRows = await transaction
          .select({
            aliases: categories.aliases,
            id: categories.id,
            name: categories.name,
            parentId: categories.parentId,
          })
          .from(categories)
          .where(inArray(categories.id, categoryIds));
        assertAllReferencesExist(
          categoryIds,
          categoryRows.map((category) => category.id),
          "categoryIds",
        );
        const primaryCategory = categoryRows.find(
          (category) => category.id === primaryCategoryId,
        );
        if (primaryCategory?.parentId !== null) {
          throw new BadRequestException(
            "primaryCategoryId must reference a root category",
          );
        }

        const regionId = input.regionId ?? current.regionId;
        const [region] = await transaction
          .select({ id: regions.id })
          .from(regions)
          .where(eq(regions.id, regionId))
          .limit(1);
        if (region === undefined) {
          throw new BadRequestException("regionId is unknown");
        }

        const name = input.name ?? current.name;
        const mainProducts = input.mainProducts ?? current.mainProducts;
        const summary = input.summary ?? current.summary;
        const orderedCategories = categoryIds.map((categoryId) => {
          const category = categoryRows.find((row) => row.id === categoryId);
          if (category === undefined) {
            throw new BadRequestException("categoryIds is invalid");
          }
          return category;
        });
        const searchText = buildSearchText({
          categories: orderedCategories,
          kind: "cluster",
          mainProducts,
          name,
          summary,
        });
        const boundary =
          input.boundary === undefined ? current.boundary : input.boundary;

        await transaction
          .update(clusters)
          .set({
            boundary: boundarySql(boundary),
            centroid: input.centroid?.coordinates ?? current.centroid,
            coverImage:
              input.coverImageObjectKey === undefined
                ? current.coverImage
                : input.coverImageObjectKey,
            description:
              input.description === undefined
                ? current.description
                : input.description,
            mainProducts,
            name,
            primaryCategoryId,
            regionId,
            slug: input.slug ?? current.slug,
            stats: input.stats === undefined ? current.stats : input.stats,
            summary,
            ...searchText,
            updatedAt: new Date(),
          })
          .where(eq(clusters.id, id));

        if (input.categoryIds !== undefined) {
          await transaction
            .delete(clusterCategories)
            .where(eq(clusterCategories.clusterId, id));
          await transaction
            .insert(clusterCategories)
            .values(
              categoryIds.map((categoryId) => ({ categoryId, clusterId: id })),
            );
        }
      }),
    );

    return this.getCluster(id);
  }

  async publishCluster(id: string, requestOrigin: string) {
    await this.setClusterStatus(id, "published");
    await this.mapCache.purge(requestOrigin);
    return this.getCluster(id);
  }

  async unpublishCluster(id: string, requestOrigin: string) {
    await this.setClusterStatus(id, "draft");
    await this.mapCache.purge(requestOrigin);
    return this.getCluster(id);
  }

  async listFactories(query: GetAdminFactoriesQuery) {
    const cursorCondition = adminCursorCondition(
      query.cursor,
      factories.updatedAt,
      factories.id,
    );
    const rows = await this.database.db
      .select({
        id: factories.id,
        name: factories.name,
        publishedAt: factories.publishedAt,
        slug: factories.slug,
        status: factories.status,
        updatedAt: factories.updatedAt,
        verified: factories.verified,
      })
      .from(factories)
      .where(cursorCondition)
      .orderBy(desc(factories.updatedAt), desc(factories.id))
      .limit(query.limit + 1);
    const { nextCursor, pageRows } = paginateAdminRows(rows, query.limit);

    return responseWithMeta(
      pageRows.map((row) =>
        toAdminFactoryListItem(row satisfies AdminFactoryListRow),
      ),
      { nextCursor },
    );
  }

  async getFactory(id: string) {
    const [row] = await this.database.db
      .select(adminFactorySelection)
      .from(factories)
      .where(eq(factories.id, id))
      .limit(1);
    if (row === undefined) {
      throw new NotFoundException();
    }

    const categoryRows = await this.database.db
      .select({ id: factoryCategories.categoryId })
      .from(factoryCategories)
      .where(eq(factoryCategories.factoryId, id))
      .orderBy(asc(factoryCategories.categoryId));

    return toAdminFactory(
      row satisfies AdminFactoryRow,
      categoryRows.map((category) => category.id),
      this.mediaUrls,
    );
  }

  async updateFactory(id: string, input: UpdateAdminFactoryBody) {
    if (input.images !== undefined && input.images.length > 0) {
      const [factory] = await this.database.db
        .select({ id: factories.id })
        .from(factories)
        .where(eq(factories.id, id))
        .limit(1);
      if (factory === undefined) {
        throw new NotFoundException();
      }

      const objectKeys = new Set(input.images.map((image) => image.objectKey));
      for (const objectKey of objectKeys) {
        await this.mediaObjects.assertValidReference({
          entityId: id,
          kind: "factory-image",
          objectKey,
        });
      }
    }

    await mapSlugConflict(() =>
      this.database.db.transaction(async (transaction) => {
        const [current] = await transaction
          .select(adminFactorySelection)
          .from(factories)
          .where(eq(factories.id, id))
          .limit(1);
        if (current === undefined) {
          throw new NotFoundException();
        }

        const currentCategoryRows = await transaction
          .select({ id: factoryCategories.categoryId })
          .from(factoryCategories)
          .where(eq(factoryCategories.factoryId, id))
          .orderBy(asc(factoryCategories.categoryId));
        const categoryIds =
          input.categoryIds ?? currentCategoryRows.map((row) => row.id);
        const categoryRows = await transaction
          .select({
            aliases: categories.aliases,
            id: categories.id,
            name: categories.name,
          })
          .from(categories)
          .where(inArray(categories.id, categoryIds));
        assertAllReferencesExist(
          categoryIds,
          categoryRows.map((category) => category.id),
          "categoryIds",
        );

        const regionId = input.regionId ?? current.regionId;
        const [region] = await transaction
          .select({ id: regions.id })
          .from(regions)
          .where(eq(regions.id, regionId))
          .limit(1);
        if (region === undefined) {
          throw new BadRequestException("regionId is unknown");
        }

        const clusterId =
          input.clusterId === undefined ? current.clusterId : input.clusterId;
        if (clusterId !== null) {
          const [cluster] = await transaction
            .select({ id: clusters.id })
            .from(clusters)
            .where(eq(clusters.id, clusterId))
            .limit(1);
          if (cluster === undefined) {
            throw new BadRequestException("clusterId is unknown");
          }
        }

        const name = input.name ?? current.name;
        const mainProducts = input.mainProducts ?? current.mainProducts;
        const orderedCategories = categoryIds.map((categoryId) => {
          const category = categoryRows.find((row) => row.id === categoryId);
          if (category === undefined) {
            throw new BadRequestException("categoryIds is invalid");
          }
          return category;
        });
        const searchText = buildSearchText({
          categories: orderedCategories,
          kind: "factory",
          mainProducts,
          name,
        });

        await transaction
          .update(factories)
          .set({
            address: input.address ?? current.address,
            certifications: input.certifications ?? current.certifications,
            clusterId,
            contact:
              input.contact === undefined ? current.contact : input.contact,
            employeeRange:
              input.employeeRange === undefined
                ? current.employeeRange
                : input.employeeRange,
            establishedYear:
              input.establishedYear === undefined
                ? current.establishedYear
                : input.establishedYear,
            images: input.images ?? current.images,
            location: input.location?.coordinates ?? current.location,
            locationGcj02: input.location === undefined ? undefined : null,
            mainProducts,
            moq: input.moq === undefined ? current.moq : input.moq,
            name,
            regionId,
            slug: input.slug ?? current.slug,
            sourceName:
              input.sourceName === undefined
                ? current.sourceName
                : input.sourceName,
            sourceUrl:
              input.sourceUrl === undefined
                ? current.sourceUrl
                : input.sourceUrl,
            lastVerifiedAt: null,
            verified: false,
            verifiedAt: null,
            verifiedBy: null,
            ...searchText,
            updatedAt: new Date(),
          })
          .where(eq(factories.id, id));

        if (input.categoryIds !== undefined) {
          await transaction
            .delete(factoryCategories)
            .where(eq(factoryCategories.factoryId, id));
          await transaction
            .insert(factoryCategories)
            .values(
              categoryIds.map((categoryId) => ({ categoryId, factoryId: id })),
            );
        }
      }),
    );

    return this.getFactory(id);
  }

  async verifyFactory(id: string, adminUserId: string) {
    const now = new Date();
    const [updated] = await this.database.db
      .update(factories)
      .set({
        lastVerifiedAt: now,
        verified: true,
        verifiedAt: sql`case
          when ${factories.verified} then coalesce(${factories.verifiedAt}, ${now})
          else ${now}
        end`,
        verifiedBy: adminUserId,
        updatedAt: now,
      })
      .where(eq(factories.id, id))
      .returning({ id: factories.id });
    if (updated === undefined) {
      throw new NotFoundException();
    }

    return this.getFactory(id);
  }

  async publishFactory(id: string, requestOrigin: string) {
    const [factory] = await this.database.db
      .select({ verified: factories.verified })
      .from(factories)
      .where(eq(factories.id, id))
      .limit(1);
    if (factory === undefined) {
      throw new NotFoundException();
    }
    if (!factory.verified) {
      throw new BadRequestException(
        "Factory must be verified before publication",
      );
    }

    await this.setFactoryStatus(id, "published");
    await this.mapCache.purge(requestOrigin);
    return this.getFactory(id);
  }

  async unpublishFactory(id: string, requestOrigin: string) {
    await this.setFactoryStatus(id, "draft");
    await this.mapCache.purge(requestOrigin);
    return this.getFactory(id);
  }

  private async setClusterStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<void> {
    const now = new Date();
    const [updated] = await this.database.db
      .update(clusters)
      .set({
        publishedAt:
          status === "published"
            ? sql`coalesce(${clusters.publishedAt}, ${now})`
            : undefined,
        status,
        updatedAt: now,
      })
      .where(eq(clusters.id, id))
      .returning({ id: clusters.id });
    if (updated === undefined) {
      throw new NotFoundException();
    }
  }

  private async setFactoryStatus(
    id: string,
    status: "draft" | "published",
  ): Promise<void> {
    const now = new Date();
    const [updated] = await this.database.db
      .update(factories)
      .set({
        publishedAt:
          status === "published"
            ? sql`coalesce(${factories.publishedAt}, ${now})`
            : undefined,
        status,
        updatedAt: now,
      })
      .where(eq(factories.id, id))
      .returning({ id: factories.id });
    if (updated === undefined) {
      throw new NotFoundException();
    }
  }
}
