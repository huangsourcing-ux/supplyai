import {
  createFavoriteBodySchema,
  decodeCursor,
  encodeCursor,
  getFavoritesQuerySchema,
  type FavoriteItem,
} from "@chinasupply/schemas";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";

import { responseWithMeta } from "../common/http/api-envelope.js";
import { ClustersService } from "../clusters/clusters.service.js";
import { DatabaseService } from "../database/database.service.js";
import { clusters, factories, favorites, users } from "../database/schema.js";
import { FactoriesService } from "../factories/factories.service.js";
import { toFavoriteItem, type FavoriteRow } from "./favorite.mapper.js";

type CreateFavoriteBody = z.output<typeof createFavoriteBodySchema>;
type GetFavoritesQuery = z.output<typeof getFavoritesQuerySchema>;

export function paginateFavoriteRows<Row extends FavoriteRow>(
  rows: readonly Row[],
  limit: number,
): { nextCursor: string | null; pageRows: Row[] } {
  const hasNextPage = rows.length > limit;
  const pageRows = hasNextPage ? rows.slice(0, limit) : [...rows];
  const lastRow = pageRows.at(-1);
  const nextCursor =
    hasNextPage && lastRow !== undefined
      ? encodeCursor({
          sort: [lastRow.createdAt.toISOString(), lastRow.id],
          v: 1,
        })
      : null;

  return { nextCursor, pageRows };
}

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ClustersService) private readonly clustersService: ClustersService,
    @Inject(FactoriesService)
    private readonly factoriesService: FactoriesService,
  ) {}

  async list(userId: string, query: GetFavoritesQuery) {
    const conditions: SQL[] = [eq(favorites.userId, userId)];

    if (query.cursor !== undefined) {
      const cursor = decodeCursor(query.cursor);
      const cursorCreatedAt = new Date(cursor.sort[0]);
      const cursorCondition = or(
        lt(favorites.createdAt, cursorCreatedAt),
        and(
          eq(favorites.createdAt, cursorCreatedAt),
          lt(favorites.id, cursor.sort[1]),
        ),
      );
      if (cursorCondition !== undefined) {
        conditions.push(cursorCondition);
      }
    }

    const rows = await this.database.db
      .select({
        createdAt: favorites.createdAt,
        id: favorites.id,
        targetId: favorites.targetId,
        targetType: favorites.targetType,
      })
      .from(favorites)
      .where(and(...conditions))
      .orderBy(desc(favorites.createdAt), desc(favorites.id))
      .limit(query.limit + 1);
    const { nextCursor, pageRows } = paginateFavoriteRows(rows, query.limit);

    return responseWithMeta(await this.hydrate(pageRows), { nextCursor });
  }

  async create(userId: string, body: CreateFavoriteBody) {
    const row = await this.database.db.transaction(async (transaction) => {
      const [activeUser] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1)
        .for("update");
      if (activeUser === undefined) {
        throw new UnauthorizedException();
      }

      const [existing] = await transaction
        .select({
          createdAt: favorites.createdAt,
          id: favorites.id,
          targetId: favorites.targetId,
          targetType: favorites.targetType,
        })
        .from(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.targetType, body.targetType),
            eq(favorites.targetId, body.targetId),
          ),
        )
        .limit(1);
      if (existing !== undefined) {
        return existing;
      }

      const targetExists =
        body.targetType === "cluster"
          ? await transaction
              .select({ id: clusters.id })
              .from(clusters)
              .where(
                and(
                  eq(clusters.id, body.targetId),
                  eq(clusters.status, "published"),
                  isNotNull(clusters.publishedAt),
                ),
              )
              .limit(1)
          : await transaction
              .select({ id: factories.id })
              .from(factories)
              .where(
                and(
                  eq(factories.id, body.targetId),
                  eq(factories.status, "published"),
                  isNotNull(factories.publishedAt),
                ),
              )
              .limit(1);
      if (targetExists.length === 0) {
        throw new NotFoundException();
      }

      const [created] = await transaction
        .insert(favorites)
        .values({
          targetId: body.targetId,
          targetType: body.targetType,
          userId,
        })
        .returning({
          createdAt: favorites.createdAt,
          id: favorites.id,
          targetId: favorites.targetId,
          targetType: favorites.targetType,
        });
      if (created === undefined) {
        throw new InternalServerErrorException();
      }

      return created;
    });

    const [item] = await this.hydrate([row]);
    if (item === undefined) {
      throw new InternalServerErrorException();
    }
    return item;
  }

  async delete(
    userId: string,
    targetType: "cluster" | "factory",
    targetId: string,
  ) {
    await this.database.db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.targetType, targetType),
          eq(favorites.targetId, targetId),
        ),
      );

    return { absent: true as const, targetId, targetType };
  }

  private async hydrate(rows: readonly FavoriteRow[]): Promise<FavoriteItem[]> {
    const clusterIds = rows
      .filter((row) => row.targetType === "cluster")
      .map((row) => row.targetId);
    const factoryIds = rows
      .filter((row) => row.targetType === "factory")
      .map((row) => row.targetId);
    const [clusterTargets, factoryTargets] = await Promise.all([
      this.clustersService.getPublishedSummariesByIds(clusterIds),
      this.factoriesService.getPublishedSummariesByIds(factoryIds),
    ]);

    return rows.map((row) =>
      toFavoriteItem(row, {
        clusters: clusterTargets,
        factories: factoryTargets,
      }),
    );
  }
}
