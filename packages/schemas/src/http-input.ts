import { z } from "zod";

import {
  coreIdSchema,
  favoriteTargetTypeSchema,
  slugSchema,
} from "./primitives.js";

export const emptyRequestSchema = z.strictObject({});

export const idParamsSchema = z.strictObject({
  id: coreIdSchema,
});

export const slugParamsSchema = z.strictObject({
  slug: slugSchema,
});

export const favoriteTargetParamsSchema = z.strictObject({
  targetType: favoriteTargetTypeSchema,
  targetId: coreIdSchema,
});

export const booleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

function parseBbox(value: string): [number, number, number, number] | null {
  const parts = value.split(",");
  if (parts.length !== 4) {
    return null;
  }

  const numbers = parts.map((part) => Number(part.trim()));
  if (numbers.some((number) => !Number.isFinite(number))) {
    return null;
  }

  const [west, south, east, north] = numbers;
  if (
    west === undefined ||
    south === undefined ||
    east === undefined ||
    north === undefined ||
    west < -180 ||
    west > 180 ||
    east < -180 ||
    east > 180 ||
    south < -90 ||
    south > 90 ||
    north < -90 ||
    north > 90 ||
    west >= east ||
    south >= north
  ) {
    return null;
  }

  return [west, south, east, north];
}

export const bboxQueryValueSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    if (parseBbox(value) === null) {
      context.addIssue({
        code: "custom",
        message: "bbox must be west,south,east,north in WGS-84",
      });
    }
  })
  .transform((value) => {
    const bbox = parseBbox(value);
    if (bbox === null) {
      throw new TypeError("Invalid bbox");
    }
    return bbox;
  });

export const zoomQueryValueSchema = z.coerce.number().int().min(0).max(24);

export type Bbox = z.infer<typeof bboxQueryValueSchema>;
