"use server";

import { revalidatePath } from "next/cache";

const FACTORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export async function retryFactoryPage(slug: string): Promise<void> {
  if (!FACTORY_SLUG_PATTERN.test(slug)) return;
  revalidatePath(`/factories/${slug}`);
}
