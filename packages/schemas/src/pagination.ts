import { z } from "zod";

import { coreIdSchema, utcDateTimeSchema } from "./primitives.js";

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export const cursorPayloadSchema = z.strictObject({
  v: z.literal(1),
  sort: z.tuple([utcDateTimeSchema, coreIdSchema]),
});

function encodeUtf8Ascii(value: string): string {
  let result = "";

  for (let index = 0; index < value.length; index += 3) {
    const first = value.charCodeAt(index);
    const second =
      index + 1 < value.length ? value.charCodeAt(index + 1) : undefined;
    const third =
      index + 2 < value.length ? value.charCodeAt(index + 2) : undefined;

    if (
      first > 0x7f ||
      (second !== undefined && second > 0x7f) ||
      (third !== undefined && third > 0x7f)
    ) {
      throw new TypeError("Cursor payload must contain ASCII only");
    }

    const buffer = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += BASE64URL_ALPHABET[(buffer >> 18) & 63];
    result += BASE64URL_ALPHABET[(buffer >> 12) & 63];

    if (second !== undefined) {
      result += BASE64URL_ALPHABET[(buffer >> 6) & 63];
    }
    if (third !== undefined) {
      result += BASE64URL_ALPHABET[buffer & 63];
    }
  }

  return result;
}

function decodeUtf8Ascii(value: string): string {
  let result = "";

  for (let index = 0; index < value.length; index += 4) {
    const chunk = value.slice(index, index + 4);
    const values = [...chunk].map((character) =>
      BASE64URL_ALPHABET.indexOf(character),
    );

    if (values.some((item) => item < 0) || chunk.length === 1) {
      throw new TypeError("Invalid Base64URL cursor");
    }

    const first = values[0] ?? 0;
    const second = values[1] ?? 0;
    const third = values[2] ?? 0;
    const fourth = values[3] ?? 0;
    const buffer = (first << 18) | (second << 12) | (third << 6) | fourth;

    result += String.fromCharCode((buffer >> 16) & 0xff);
    if (chunk.length >= 3) {
      result += String.fromCharCode((buffer >> 8) & 0xff);
    }
    if (chunk.length === 4) {
      result += String.fromCharCode(buffer & 0xff);
    }
  }

  return result;
}

function decodeCursorPayload(value: string): unknown {
  return JSON.parse(decodeUtf8Ascii(value)) as unknown;
}

export const cursorSchema = z
  .base64url()
  .min(1)
  .superRefine((value, context) => {
    try {
      const result = cursorPayloadSchema.safeParse(decodeCursorPayload(value));
      if (!result.success) {
        context.addIssue({
          code: "custom",
          message: "Invalid cursor payload",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Invalid cursor payload",
      });
    }
  });

const decodedCursorSchema = cursorSchema.transform((value) =>
  cursorPayloadSchema.parse(decodeCursorPayload(value)),
);

export const paginationQuerySchema = z.strictObject({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function encodeCursor(payload: CursorPayload): string {
  return encodeUtf8Ascii(JSON.stringify(cursorPayloadSchema.parse(payload)));
}

export function decodeCursor(value: string): CursorPayload {
  return decodedCursorSchema.parse(value);
}

export function safeDecodeCursor(value: unknown) {
  return decodedCursorSchema.safeParse(value);
}

export type CursorPayload = z.infer<typeof cursorPayloadSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
