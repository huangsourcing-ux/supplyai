import type {
  ClusterStats,
  Coordinate,
  FactoryContact,
  FactoryImage,
  LocalizedAliases,
  LocalizedText,
} from "@chinasupply/schemas";
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { multiPolygon4326, point4326 } from "./postgis.js";

export const CORE_TABLE_NAMES = [
  "regions",
  "categories",
  "clusters",
  "cluster_categories",
  "factories",
  "factory_categories",
  "users",
  "favorites",
  "webhook_events",
] as const;

export const regionLevelEnum = pgEnum("region_level", [
  "province",
  "city",
  "county",
]);
export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "published",
]);
export const favoriteTargetTypeEnum = pgEnum("favorite_target_type", [
  "factory",
  "cluster",
]);

export function createCoreId(): string {
  return nanoid(21);
}

export const regions = pgTable(
  "regions",
  {
    id: text("id").primaryKey().$defaultFn(createCoreId),
    level: regionLevelEnum("level").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => regions.id, {
      onDelete: "restrict",
    }),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    centroid: point4326("centroid").notNull(),
    boundary: multiPolygon4326("boundary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("regions_id_nanoid_length", sql`length(${table.id}) = 21`),
    check(
      "regions_parent_not_self",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
    check(
      "regions_province_boundary_required",
      sql`${table.level} <> 'province' or ${table.boundary} is not null`,
    ),
    index("regions_boundary_gist").using("gist", table.boundary),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey().$defaultFn(createCoreId),
    parentId: text("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    slug: text("slug").notNull().unique(),
    icon: text("icon"),
    color: text("color"),
    aliases: jsonb("aliases").$type<LocalizedAliases>().default({}).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    searchTextEn: text("search_text_en").notNull(),
    searchTextZh: text("search_text_zh").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("categories_id_nanoid_length", sql`length(${table.id}) = 21`),
    check(
      "categories_parent_not_self",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
    check(
      "categories_color_by_level",
      sql`(
        ${table.parentId} is null
        and ${table.color} ~ '^#[0-9A-Fa-f]{6}$'
      ) or (
        ${table.parentId} is not null
        and ${table.color} is null
      )`,
    ),
    index("categories_search_text_en_fts_gin").using(
      "gin",
      sql`to_tsvector('english', ${table.searchTextEn})`,
    ),
    index("categories_search_text_en_trgm_gin").using(
      "gin",
      table.searchTextEn.op("gin_trgm_ops"),
    ),
    index("categories_search_text_zh_trgm_gin").using(
      "gin",
      table.searchTextZh.op("gin_trgm_ops"),
    ),
  ],
);

export const clusters = pgTable(
  "clusters",
  {
    id: text("id").primaryKey().$defaultFn(createCoreId),
    slug: text("slug").notNull().unique(),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    primaryCategoryId: text("primary_category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    centroid: point4326("centroid").notNull(),
    boundary: multiPolygon4326("boundary"),
    summary: jsonb("summary").$type<LocalizedText>().notNull(),
    description: jsonb("description").$type<LocalizedText>(),
    mainProducts: jsonb("main_products").$type<LocalizedText[]>().notNull(),
    coverImage: text("cover_image"),
    stats: jsonb("stats").$type<ClusterStats>(),
    status: publicationStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    searchTextEn: text("search_text_en").notNull(),
    searchTextZh: text("search_text_zh").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("clusters_id_nanoid_length", sql`length(${table.id}) = 21`),
    index("clusters_centroid_gist").using("gist", table.centroid),
    index("clusters_status_published_at_id_idx").on(
      table.status,
      table.publishedAt.desc(),
      table.id.desc(),
    ),
    index("clusters_search_text_en_fts_gin").using(
      "gin",
      sql`to_tsvector('english', ${table.searchTextEn})`,
    ),
    index("clusters_search_text_en_trgm_gin").using(
      "gin",
      table.searchTextEn.op("gin_trgm_ops"),
    ),
    index("clusters_search_text_zh_trgm_gin").using(
      "gin",
      table.searchTextZh.op("gin_trgm_ops"),
    ),
  ],
);

export const clusterCategories = pgTable(
  "cluster_categories",
  {
    clusterId: text("cluster_id")
      .notNull()
      .references(() => clusters.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      columns: [table.clusterId, table.categoryId],
      name: "cluster_categories_pk",
    }),
  ],
);

export const factories = pgTable(
  "factories",
  {
    id: text("id").primaryKey().$defaultFn(createCoreId),
    slug: text("slug").notNull().unique(),
    name: jsonb("name").$type<LocalizedText>().notNull(),
    clusterId: text("cluster_id").references(() => clusters.id, {
      onDelete: "restrict",
    }),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    address: jsonb("address").$type<LocalizedText>().notNull(),
    location: point4326("location").notNull(),
    locationGcj02: jsonb("location_gcj02").$type<Coordinate>(),
    mainProducts: jsonb("main_products").$type<LocalizedText[]>().notNull(),
    certifications: text("certifications")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    moq: text("moq"),
    establishedYear: integer("established_year"),
    employeeRange: text("employee_range"),
    contact: jsonb("contact").$type<FactoryContact>(),
    images: jsonb("images").$type<FactoryImage[]>().default([]).notNull(),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    verified: boolean("verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    status: publicationStatusEnum("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    searchTextEn: text("search_text_en").notNull(),
    searchTextZh: text("search_text_zh").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("factories_id_nanoid_length", sql`length(${table.id}) = 21`),
    index("factories_location_gist").using("gist", table.location),
    index("factories_status_cluster_id_idx").on(table.status, table.clusterId),
    index("factories_status_published_at_id_idx").on(
      table.status,
      table.publishedAt.desc(),
      table.id.desc(),
    ),
    index("factories_search_text_en_fts_gin").using(
      "gin",
      sql`to_tsvector('english', ${table.searchTextEn})`,
    ),
    index("factories_search_text_en_trgm_gin").using(
      "gin",
      table.searchTextEn.op("gin_trgm_ops"),
    ),
    index("factories_search_text_zh_trgm_gin").using(
      "gin",
      table.searchTextZh.op("gin_trgm_ops"),
    ),
  ],
);

export const factoryCategories = pgTable(
  "factory_categories",
  {
    factoryId: text("factory_id")
      .notNull()
      .references(() => factories.id, { onDelete: "restrict" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      columns: [table.factoryId, table.categoryId],
      name: "factory_categories_pk",
    }),
  ],
);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  locale: text("locale").default("en").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: text("id").primaryKey().$defaultFn(createCoreId),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetType: favoriteTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("favorites_id_nanoid_length", sql`length(${table.id}) = 21`),
    check(
      "favorites_target_id_nanoid_length",
      sql`length(${table.targetId}) = 21`,
    ),
    unique("favorites_user_target_unique").on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  ],
);

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
});

export const regionsRelations = relations(regions, ({ one, many }) => ({
  parent: one(regions, {
    fields: [regions.parentId],
    references: [regions.id],
    relationName: "regionHierarchy",
  }),
  children: many(regions, { relationName: "regionHierarchy" }),
  clusters: many(clusters),
  factories: many(factories),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  children: many(categories, { relationName: "categoryHierarchy" }),
  primaryClusters: many(clusters),
  clusterCategories: many(clusterCategories),
  factoryCategories: many(factoryCategories),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  region: one(regions, {
    fields: [clusters.regionId],
    references: [regions.id],
  }),
  primaryCategory: one(categories, {
    fields: [clusters.primaryCategoryId],
    references: [categories.id],
  }),
  categories: many(clusterCategories),
  factories: many(factories),
}));

export const clusterCategoriesRelations = relations(
  clusterCategories,
  ({ one }) => ({
    cluster: one(clusters, {
      fields: [clusterCategories.clusterId],
      references: [clusters.id],
    }),
    category: one(categories, {
      fields: [clusterCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const factoriesRelations = relations(factories, ({ one, many }) => ({
  cluster: one(clusters, {
    fields: [factories.clusterId],
    references: [clusters.id],
  }),
  region: one(regions, {
    fields: [factories.regionId],
    references: [regions.id],
  }),
  categories: many(factoryCategories),
}));

export const factoryCategoriesRelations = relations(
  factoryCategories,
  ({ one }) => ({
    factory: one(factories, {
      fields: [factoryCategories.factoryId],
      references: [factories.id],
    }),
    category: one(categories, {
      fields: [factoryCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));
