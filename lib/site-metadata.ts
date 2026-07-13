import type { MetadataRoute } from "next";

export function createRobotsPolicy({
  appUrl,
  isPreview,
}: {
  appUrl: string;
  isPreview: boolean;
}): MetadataRoute.Robots {
  if (isPreview) {
    return {
      rules: { disallow: "/", userAgent: "*" },
    };
  }

  return {
    rules: {
      allow: "/",
      disallow: ["/api/", "/login", "/logs", "/profile"],
      userAgent: "*",
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}

export function createSitemap({
  appUrl,
  isPreview,
}: {
  appUrl: string;
  isPreview: boolean;
}): MetadataRoute.Sitemap {
  if (isPreview) {
    return [];
  }

  return [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: appUrl,
    },
  ];
}
