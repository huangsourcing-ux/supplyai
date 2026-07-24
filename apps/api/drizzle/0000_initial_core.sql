CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."favorite_target_type" AS ENUM('factory', 'cluster');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."region_level" AS ENUM('province', 'city', 'county');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"name" jsonb NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"color" text,
	"aliases" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"search_text_en" text NOT NULL,
	"search_text_zh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_id_nanoid_length" CHECK (length("categories"."id") = 21),
	CONSTRAINT "categories_parent_not_self" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id"),
	CONSTRAINT "categories_color_by_level" CHECK ((
        "categories"."parent_id" is null
        and "categories"."color" ~ '^#[0-9A-Fa-f]{6}$'
      ) or (
        "categories"."parent_id" is not null
        and "categories"."color" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "cluster_categories" (
	"cluster_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "cluster_categories_pk" PRIMARY KEY("cluster_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"region_id" text NOT NULL,
	"primary_category_id" text NOT NULL,
	"centroid" geometry(Point,4326) NOT NULL,
	"boundary" geometry(MultiPolygon,4326),
	"summary" jsonb NOT NULL,
	"description" jsonb,
	"main_products" jsonb NOT NULL,
	"cover_image" text,
	"stats" jsonb,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"search_text_en" text NOT NULL,
	"search_text_zh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clusters_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clusters_id_nanoid_length" CHECK (length("clusters"."id") = 21)
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"cluster_id" text,
	"region_id" text NOT NULL,
	"address" jsonb NOT NULL,
	"location" geometry(Point,4326) NOT NULL,
	"location_gcj02" jsonb,
	"main_products" jsonb NOT NULL,
	"certifications" text[] DEFAULT '{}'::text[] NOT NULL,
	"moq" text,
	"established_year" integer,
	"employee_range" text,
	"contact" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_name" text,
	"source_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"verified_by" text,
	"status" "publication_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"search_text_en" text NOT NULL,
	"search_text_zh" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "factories_id_nanoid_length" CHECK (length("factories"."id") = 21)
);
--> statement-breakpoint
CREATE TABLE "factory_categories" (
	"factory_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "factory_categories_pk" PRIMARY KEY("factory_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_type" "favorite_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_target_unique" UNIQUE("user_id","target_type","target_id"),
	CONSTRAINT "favorites_id_nanoid_length" CHECK (length("favorites"."id") = 21),
	CONSTRAINT "favorites_target_id_nanoid_length" CHECK (length("favorites"."target_id") = 21)
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"level" "region_level" NOT NULL,
	"parent_id" text,
	"name" jsonb NOT NULL,
	"centroid" geometry(Point,4326) NOT NULL,
	"boundary" geometry(MultiPolygon,4326),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_id_nanoid_length" CHECK (length("regions"."id") = 21),
	CONSTRAINT "regions_parent_not_self" CHECK ("regions"."parent_id" is null or "regions"."parent_id" <> "regions"."id"),
	CONSTRAINT "regions_province_boundary_required" CHECK ("regions"."level" <> 'province' or "regions"."boundary" is not null)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_categories" ADD CONSTRAINT "cluster_categories_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_categories" ADD CONSTRAINT "cluster_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_primary_category_id_categories_id_fk" FOREIGN KEY ("primary_category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factories" ADD CONSTRAINT "factories_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_categories" ADD CONSTRAINT "factory_categories_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_categories" ADD CONSTRAINT "factory_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_id_regions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_search_text_en_fts_gin" ON "categories" USING gin (to_tsvector('english', "search_text_en"));--> statement-breakpoint
CREATE INDEX "categories_search_text_en_trgm_gin" ON "categories" USING gin ("search_text_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "categories_search_text_zh_trgm_gin" ON "categories" USING gin ("search_text_zh" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "clusters_centroid_gist" ON "clusters" USING gist ("centroid");--> statement-breakpoint
CREATE INDEX "clusters_status_published_at_id_idx" ON "clusters" USING btree ("status","published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "clusters_search_text_en_fts_gin" ON "clusters" USING gin (to_tsvector('english', "search_text_en"));--> statement-breakpoint
CREATE INDEX "clusters_search_text_en_trgm_gin" ON "clusters" USING gin ("search_text_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "clusters_search_text_zh_trgm_gin" ON "clusters" USING gin ("search_text_zh" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "factories_location_gist" ON "factories" USING gist ("location");--> statement-breakpoint
CREATE INDEX "factories_status_cluster_id_idx" ON "factories" USING btree ("status","cluster_id");--> statement-breakpoint
CREATE INDEX "factories_status_published_at_id_idx" ON "factories" USING btree ("status","published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "factories_search_text_en_fts_gin" ON "factories" USING gin (to_tsvector('english', "search_text_en"));--> statement-breakpoint
CREATE INDEX "factories_search_text_en_trgm_gin" ON "factories" USING gin ("search_text_en" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "factories_search_text_zh_trgm_gin" ON "factories" USING gin ("search_text_zh" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "regions_boundary_gist" ON "regions" USING gist ("boundary");--> statement-breakpoint
CREATE FUNCTION assert_category_two_levels(target_category_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_parent_id text;
BEGIN
  SELECT parent_id
  INTO target_parent_id
  FROM categories
  WHERE id = target_category_id;

  IF NOT FOUND OR target_parent_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM categories
    WHERE id = target_parent_id
      AND parent_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'categories_two_levels',
        MESSAGE = 'category parent must be a root category';
  END IF;
END;
$$;--> statement-breakpoint
CREATE FUNCTION check_category_two_levels()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  child_category_id text;
BEGIN
  PERFORM assert_category_two_levels(NEW.id);

  FOR child_category_id IN
    SELECT id
    FROM categories
    WHERE parent_id = NEW.id
  LOOP
    PERFORM assert_category_two_levels(child_category_id);
  END LOOP;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE FUNCTION assert_cluster_primary_category(target_cluster_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_primary_category_id text;
BEGIN
  SELECT primary_category_id
  INTO target_primary_category_id
  FROM clusters
  WHERE id = target_cluster_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM categories
    WHERE id = target_primary_category_id
      AND parent_id IS NULL
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'clusters_primary_category_must_be_root',
        MESSAGE = 'cluster primary category must be a root category';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM cluster_categories
    WHERE cluster_id = target_cluster_id
      AND category_id = target_primary_category_id
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'clusters_primary_category_membership',
        MESSAGE = 'cluster primary category must exist in cluster_categories';
  END IF;
END;
$$;--> statement-breakpoint
CREATE FUNCTION check_cluster_primary_category_from_cluster()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_cluster_primary_category(NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE FUNCTION check_cluster_primary_category_from_join()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM assert_cluster_primary_category(OLD.cluster_id);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    PERFORM assert_cluster_primary_category(NEW.cluster_id);
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE FUNCTION check_cluster_primary_category_from_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_cluster_id text;
BEGIN
  FOR target_cluster_id IN
    SELECT id
    FROM clusters
    WHERE primary_category_id = NEW.id
  LOOP
    PERFORM assert_cluster_primary_category(target_cluster_id);
  END LOOP;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER clusters_primary_category_constraint
AFTER INSERT OR UPDATE ON clusters
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_cluster_primary_category_from_cluster();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER categories_two_levels_constraint
AFTER INSERT OR UPDATE ON categories
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_category_two_levels();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER cluster_categories_primary_category_constraint
AFTER INSERT OR UPDATE OR DELETE ON cluster_categories
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_cluster_primary_category_from_join();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER categories_primary_category_constraint
AFTER UPDATE ON categories
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_cluster_primary_category_from_category();
