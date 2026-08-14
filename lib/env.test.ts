import { parseEnvironment } from "./env-schema";

const baseEnvironment = {
  AUTH_SECRET: "a".repeat(32),
  DATABASE_URL: "postgresql://development.example/workout_trackr",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

describe("environment validation", () => {
  it("allows previews without authentication credentials", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      VERCEL_ENV: "preview",
      VERCEL_URL: "workout-trackr-preview.vercel.app",
    });

    expect(result.APP_URL).toBe(
      "https://workout-trackr-preview.vercel.app",
    );
    expect(result.GOOGLE_AUTH_ENABLED).toBe(false);
    expect(result.EMAIL_AUTH_ENABLED).toBe(false);
    expect(result.IS_PREVIEW).toBe(true);
  });

  it("treats empty optional authentication variables as unset", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      POSTMARK_SERVER_TOKEN: "",
      AUTH_EMAIL_FROM: "",
    });

    expect(result.GOOGLE_AUTH_ENABLED).toBe(false);
    expect(result.EMAIL_AUTH_ENABLED).toBe(false);
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

  it("requires the app URL and both providers in production", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        VERCEL_ENV: "production",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_GOOGLE_ID: "production-client-id",
        AUTH_GOOGLE_SECRET: "production-client-secret",
        NEXT_PUBLIC_APP_URL: "https://workouttrackr.com",
        VERCEL_ENV: "production",
      }),
    ).toThrow();
  });

  it("enables Google and email authentication in production", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      AUTH_GOOGLE_ID: "production-client-id",
      AUTH_GOOGLE_SECRET: "production-client-secret",
      POSTMARK_SERVER_TOKEN: "production-server-token",
      AUTH_EMAIL_FROM: "Workout Trackr <admin@workouttrackr.com>",
      NEXT_PUBLIC_APP_URL: "https://workout-trackr.vercel.app",
      VERCEL_ENV: "production",
    });

    expect(result.GOOGLE_AUTH_ENABLED).toBe(true);
    expect(result.EMAIL_AUTH_ENABLED).toBe(true);
    expect(result.IS_PRODUCTION).toBe(true);
  });

  it("requires an explicit app URL when local authentication is enabled", () => {
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

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        POSTMARK_SERVER_TOKEN: "development-server-token",
        AUTH_EMAIL_FROM: "Workout Trackr <admin@workouttrackr.com>",
      }),
    ).toThrow();

  });

  it("enables email authentication with complete local credentials", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      POSTMARK_SERVER_TOKEN: "development-server-token",
      AUTH_EMAIL_FROM: "Workout Trackr <admin@workouttrackr.com>",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(result.EMAIL_AUTH_ENABLED).toBe(true);
  });

  it("disables configured providers on previews", () => {
    const result = parseEnvironment({
      ...baseEnvironment,
      AUTH_GOOGLE_ID: "preview-client-id",
      AUTH_GOOGLE_SECRET: "preview-client-secret",
      POSTMARK_SERVER_TOKEN: "preview-server-token",
      AUTH_EMAIL_FROM: "Workout Trackr <admin@workouttrackr.com>",
      VERCEL_ENV: "preview",
      VERCEL_URL: "workout-trackr-preview.vercel.app",
    });

    expect(result.GOOGLE_AUTH_ENABLED).toBe(false);
    expect(result.EMAIL_AUTH_ENABLED).toBe(false);
  });

  it("rejects invalid secrets and incomplete provider credentials", () => {
    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_SECRET: "too-short",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        POSTMARK_SERVER_TOKEN: "server-token-without-sender",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_EMAIL_FROM: "Workout Trackr <admin@workouttrackr.com>",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    ).toThrow();

    expect(() =>
      parseEnvironment({
        ...baseEnvironment,
        AUTH_EMAIL_FROM: "Workout Trackr admin@workouttrackr.com",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        POSTMARK_SERVER_TOKEN: "development-server-token",
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
