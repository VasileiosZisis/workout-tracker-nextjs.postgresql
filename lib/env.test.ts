import { parseEnvironment } from "./env-schema";

const baseEnvironment = {
  AUTH_SECRET: "a".repeat(32),
  DATABASE_URL: "postgresql://development.example/workout_trackr",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

describe("environment validation", () => {
  it("allows previews without Google OAuth credentials", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      VERCEL_ENV: "preview",
      VERCEL_URL: "workout-trackr-preview.vercel.app",
    });

    expect(result.APP_URL).toBe(
      "https://workout-trackr-preview.vercel.app",
    );
    expect(result.GOOGLE_AUTH_ENABLED).toBe(false);
    expect(result.IS_PREVIEW).toBe(true);
  });

  it("treats empty optional OAuth variables as unset", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
    });

    expect(result.GOOGLE_AUTH_ENABLED).toBe(false);
    expect(result.DEMO_ENABLED).toBe(false);
  });

  it("enables the temporary demo only with a cron secret", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      DEMO_ENABLED: "true",
      CRON_SECRET: "c".repeat(32),
    });

    expect(result.DEMO_ENABLED).toBe(true);

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        DEMO_ENABLED: "true",
      }),
    ).toThrow();
  });

  it("requires production URL and Google OAuth credentials in production", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        VERCEL_ENV: "production",
      }),
    ).toThrow();
  });

  it("enables Google OAuth for a valid production environment", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      AUTH_GOOGLE_ID: "production-client-id",
      AUTH_GOOGLE_SECRET: "production-client-secret",
      NEXT_PUBLIC_APP_URL: "https://workout-trackr.vercel.app",
      VERCEL_ENV: "production",
    });

    expect(result.GOOGLE_AUTH_ENABLED).toBe(true);
    expect(result.IS_PRODUCTION).toBe(true);
  });

  it("requires an explicit app URL when local Google OAuth is enabled", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_GOOGLE_ID: "development-client-id",
        AUTH_GOOGLE_SECRET: "development-client-secret",
      }),
    ).toThrow();

    expect(
      parseEnvironment({
        ...baseEnvironment,
        AUTH_GOOGLE_ID: "development-client-id",
        AUTH_GOOGLE_SECRET: "development-client-secret",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000/",
      }).APP_URL,
    ).toBe("http://localhost:3000");
  });

  it("rejects short auth secrets and incomplete Google credentials", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_SECRET: "too-short",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_GOOGLE_ID: "client-id-without-secret",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        CRON_SECRET: "too-short",
      }),
    ).toThrow();
  });
});
