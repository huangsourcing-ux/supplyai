import { updateMeBodySchema, userSchema } from "@chinasupply/schemas";
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";

import { DatabaseService } from "../database/database.service.js";
import { users } from "../database/schema.js";
import {
  CLERK_USER_DELETER,
  type ClerkUserDeleter,
} from "./clerk-user-deleter.js";

type UpdateMeBody = z.output<typeof updateMeBodySchema>;

@Injectable()
export class AccountService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CLERK_USER_DELETER)
    private readonly deleteClerkUser: ClerkUserDeleter,
  ) {}

  async update(userId: string, body: UpdateMeBody) {
    const [user] = await this.database.db
      .update(users)
      .set({
        ...(body.locale === undefined ? {} : { locale: body.locale }),
        ...(body.name === undefined ? {} : { name: body.name }),
        updatedAt: sql`now()`,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        email: users.email,
        id: users.id,
        locale: users.locale,
        name: users.name,
      });
    if (user === undefined) {
      throw new UnauthorizedException();
    }

    return userSchema.parse(user);
  }

  async delete(userId: string) {
    try {
      await this.deleteClerkUser(userId);
    } catch {
      throw new ServiceUnavailableException();
    }

    return { deletionRequested: true as const };
  }
}
