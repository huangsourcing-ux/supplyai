import type { MetadataRoute } from "next";

import { buildRobots } from "../seo/sitemap";

export default function robots(): MetadataRoute.Robots {
  return buildRobots(
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.NEXT_PUBLIC_SITE_URL!,
  );
}
