import { Inject, Injectable } from "@nestjs/common";
import { asc } from "drizzle-orm";

import { DatabaseService } from "../database/database.service.js";
import { categories } from "../database/schema.js";
import {
  buildPublicCategoryTree,
  type PublicCategoryTree,
} from "./category.mapper.js";

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async list(): Promise<PublicCategoryTree[]> {
    const rows = await this.database.db
      .select({
        color: categories.color,
        icon: categories.icon,
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        slug: categories.slug,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    return buildPublicCategoryTree(rows);
  }
}
