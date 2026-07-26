import { z } from "zod";

import { createStandardSuccessEnvelopeSchema } from "./envelope.js";

export const clerkWebhookHeadersSchema = z.strictObject({
  "svix-id": z.string().min(1),
  "svix-timestamp": z.string().regex(/^\d+$/u),
  "svix-signature": z.string().min(1),
});

const clerkEmailSchema = z.looseObject({
  id: z.string().min(1),
  email_address: z.email(),
});

const clerkUserDataSchema = z
  .looseObject({
    id: z.string().min(1),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    primary_email_address_id: z.string().min(1),
    email_addresses: z.array(clerkEmailSchema).min(1),
  })
  .superRefine((user, context) => {
    if (
      !user.email_addresses.some(
        (email) => email.id === user.primary_email_address_id,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Primary email address is missing",
        path: ["primary_email_address_id"],
      });
    }
  });

const clerkDeletedUserDataSchema = z.looseObject({
  id: z.string().min(1),
  object: z.literal("user"),
  deleted: z.literal(true),
});

const clerkEventBaseShape = {
  object: z.literal("event"),
  instance_id: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
};

export const clerkUserCreatedEventSchema = z.looseObject({
  ...clerkEventBaseShape,
  type: z.literal("user.created"),
  data: clerkUserDataSchema,
});

export const clerkUserUpdatedEventSchema = z.looseObject({
  ...clerkEventBaseShape,
  type: z.literal("user.updated"),
  data: clerkUserDataSchema,
});

export const clerkUserDeletedEventSchema = z.looseObject({
  ...clerkEventBaseShape,
  type: z.literal("user.deleted"),
  data: clerkDeletedUserDataSchema,
});

export const clerkWebhookBodySchema = z.discriminatedUnion("type", [
  clerkUserCreatedEventSchema,
  clerkUserUpdatedEventSchema,
  clerkUserDeletedEventSchema,
]);

export const clerkWebhookReceiptSchema = z.strictObject({
  processed: z.boolean(),
  duplicate: z.boolean(),
});

export const clerkWebhookResponseSchema = createStandardSuccessEnvelopeSchema(
  clerkWebhookReceiptSchema,
);

export type ClerkWebhookEvent = z.infer<typeof clerkWebhookBodySchema>;
