import {
  clerkWebhookBodySchema,
  clerkWebhookHeadersSchema,
  type ClerkWebhookEvent,
} from "@chinasupply/schemas";
import { verifyWebhook } from "@clerk/backend/webhooks";
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { ZodValidationException } from "nestjs-zod";

import {
  RUNTIME_CONFIG,
  type RuntimeConfig,
} from "../config/runtime-config.module.js";
import { DatabaseService } from "../database/database.service.js";
import { favorites, users, webhookEvents } from "../database/schema.js";
import {
  formatClerkName,
  getPrimaryEmail as findPrimaryEmail,
} from "../users/clerk-user-profile.js";

type RequestHeaders = Record<string, string | string[] | undefined>;
type ClerkUserEvent = Extract<
  ClerkWebhookEvent,
  { type: "user.created" | "user.updated" }
>;

function parseWithZod<Output>(
  schema: {
    safeParse: (value: unknown) => {
      data?: Output;
      error?: unknown;
      success: boolean;
    };
  },
  value: unknown,
): Output {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ZodValidationException(result.error);
  }

  return result.data as Output;
}

export function getPrimaryEmail(event: ClerkUserEvent): string {
  const primaryEmail = findPrimaryEmail({
    emailAddresses: event.data.email_addresses.map((email) => ({
      emailAddress: email.email_address,
      id: email.id,
    })),
    firstName: event.data.first_name,
    lastName: event.data.last_name,
    primaryEmailAddressId: event.data.primary_email_address_id,
  });
  if (primaryEmail === null) {
    throw new InternalServerErrorException();
  }

  return primaryEmail;
}

@Injectable()
export class ClerkWebhookService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  async handle(
    rawBody: Buffer | undefined,
    headers: RequestHeaders,
  ): Promise<{ duplicate: boolean; processed: boolean }> {
    if (rawBody === undefined) {
      throw new BadRequestException();
    }

    const verifiedHeaders = parseWithZod<{
      "svix-id": string;
      "svix-signature": string;
      "svix-timestamp": string;
    }>(clerkWebhookHeadersSchema, {
      "svix-id": headers["svix-id"],
      "svix-signature": headers["svix-signature"],
      "svix-timestamp": headers["svix-timestamp"],
    });
    const secret = this.config.CLERK_WEBHOOK_SECRET;
    if (secret === undefined) {
      throw new ServiceUnavailableException();
    }

    const request = new Request("http://localhost/api/v1/webhooks/clerk", {
      body: new Uint8Array(rawBody),
      headers: verifiedHeaders,
      method: "POST",
    });
    try {
      await verifyWebhook(request, { signingSecret: secret });
    } catch {
      throw new BadRequestException();
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException();
    }
    const event = parseWithZod<ClerkWebhookEvent>(clerkWebhookBodySchema, body);

    return this.database.db.transaction(async (transaction) => {
      const insertedEvents = await transaction
        .insert(webhookEvents)
        .values({
          id: verifiedHeaders["svix-id"],
          processedAt: sql`now()`,
          type: event.type,
        })
        .onConflictDoNothing({ target: webhookEvents.id })
        .returning({ id: webhookEvents.id });
      if (insertedEvents.length === 0) {
        return { duplicate: true, processed: false };
      }

      if (event.type === "user.deleted") {
        const deletedUsers = await transaction
          .update(users)
          .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
          .where(eq(users.id, event.data.id))
          .returning({ id: users.id });
        if (deletedUsers.length === 0) {
          throw new InternalServerErrorException();
        }

        await transaction
          .delete(favorites)
          .where(eq(favorites.userId, event.data.id));
      } else {
        await transaction
          .insert(users)
          .values({
            email: getPrimaryEmail(event),
            id: event.data.id,
            name: formatClerkName(event.data.first_name, event.data.last_name),
          })
          .onConflictDoUpdate({
            set: {
              email: getPrimaryEmail(event),
              name: formatClerkName(
                event.data.first_name,
                event.data.last_name,
              ),
              updatedAt: sql`now()`,
            },
            target: users.id,
          });
      }

      return { duplicate: false, processed: true };
    });
  }
}
