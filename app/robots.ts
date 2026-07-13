import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { createRobotsPolicy } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return createRobotsPolicy({ appUrl: env.APP_URL, isPreview: env.IS_PREVIEW });
}
