import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { createSitemap } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap({ appUrl: env.APP_URL, isPreview: env.IS_PREVIEW });
}
