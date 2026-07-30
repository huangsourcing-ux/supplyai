import { revalidatePath, revalidateTag } from "next/cache";
import { APIError, type CollectionConfig, type PayloadRequest } from "payload";

import { verifyCmsMediaObject } from "./media-storage";
import { assertPublishedClusterCards } from "./published-clusters";

interface ArticleRecord {
  _status?: "draft" | "published";
  body?: unknown;
  cover?: number | string | { id?: number | string } | null;
  publishedAt?: null | string;
  slug?: string;
}

interface MediaRecord {
  filesize?: null | number;
  id: number | string;
  mimeType?: null | string;
  objectKey?: null | string;
}

function relationId(
  value: ArticleRecord["cover"],
): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && (typeof value.id === "number" || typeof value.id === "string")) {
    return value.id;
  }
  return undefined;
}

async function verifyCover(
  cover: ArticleRecord["cover"],
  req: PayloadRequest,
): Promise<void> {
  const id = relationId(cover);
  if (id === undefined) throw new APIError("A cover image is required", 400);

  const media = (await req.payload.findByID({
    collection: "media",
    depth: 0,
    id,
    overrideAccess: true,
    req,
  })) as MediaRecord;

  if (
    typeof media.objectKey !== "string" ||
    typeof media.mimeType !== "string" ||
    typeof media.filesize !== "number"
  ) {
    throw new APIError("The cover media is incomplete", 400);
  }

  await verifyCmsMediaObject({
    contentLength: media.filesize,
    contentType: media.mimeType,
    objectKey: media.objectKey,
  });
}

export const articleHooks: NonNullable<CollectionConfig["hooks"]> = {
  afterChange: [
    ({ doc, previousDoc }) => {
      const current = doc as ArticleRecord;
      const previous = previousDoc as ArticleRecord;
      const slugChanged = current.slug !== previous.slug;
      if (
        !slugChanged &&
        current._status !== "published" &&
        previous._status !== "published"
      ) {
        return doc;
      }

      revalidatePath("/guides");
      revalidateTag("guides", "max");

      if (previous.slug) revalidatePath(`/guides/${previous.slug}`);
      if (current.slug && slugChanged) {
        revalidatePath(`/guides/${current.slug}`);
      }
      return doc;
    },
  ],
  afterDelete: [
    ({ doc }) => {
      const article = doc as ArticleRecord;
      revalidatePath("/guides");
      revalidateTag("guides", "max");
      if (article.slug) revalidatePath(`/guides/${article.slug}`);
      return doc;
    },
  ],
  beforeChange: [
    async ({ data, originalDoc, req }) => {
      const original = (originalDoc ?? {}) as ArticleRecord;
      const next = data as ArticleRecord;
      const nextStatus = next._status ?? original._status ?? "draft";

      if (nextStatus !== "published") return data;

      const body = next.body ?? original.body;
      const cover = next.cover ?? original.cover;
      try {
        await Promise.all([
          assertPublishedClusterCards(body),
          verifyCover(cover, req),
        ]);
      } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError(
          error instanceof Error ? error.message : "Article validation failed",
          400,
        );
      }

      next.publishedAt = original.publishedAt ?? new Date().toISOString();
      return next;
    },
  ],
};
