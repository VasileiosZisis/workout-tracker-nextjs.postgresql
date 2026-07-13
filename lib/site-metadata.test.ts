import { createRobotsPolicy, createSitemap } from "./site-metadata";

describe("site metadata", () => {
  it("prevents preview deployments from being indexed", () => {
    expect(
      createRobotsPolicy({
        appUrl: "https://preview.vercel.app",
        isPreview: true,
      }),
    ).toEqual({ rules: { disallow: "/", userAgent: "*" } });
    expect(
      createSitemap({
        appUrl: "https://preview.vercel.app",
        isPreview: true,
      }),
    ).toEqual([]);
  });

  it("publishes only the public production homepage", () => {
    const appUrl = "https://workout-trackr.vercel.app";

    expect(createRobotsPolicy({ appUrl, isPreview: false })).toMatchObject({
      sitemap: `${appUrl}/sitemap.xml`,
    });
    expect(createSitemap({ appUrl, isPreview: false })).toEqual([
      {
        changeFrequency: "weekly",
        priority: 1,
        url: appUrl,
      },
    ]);
  });
});
