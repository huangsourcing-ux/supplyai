"use server";

import { revalidatePath } from "next/cache";

const CLUSTER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export async function retryClusterPage(slug: string): Promise<void> {
  if (!CLUSTER_SLUG_PATTERN.test(slug)) return;
  revalidatePath(`/clusters/${slug}`);
}
