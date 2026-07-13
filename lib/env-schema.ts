import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const rawEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    VERCEL_URL: optionalText,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    AUTH_SECRET: z.string().min(32),
    AUTH_GOOGLE_ID: optionalText,
    AUTH_GOOGLE_SECRET: optionalText,
    DATABASE_URL: z.string().min(1),
  })
  .superRefine((value, context) => {
    const hasGoogleId = Boolean(value.AUTH_GOOGLE_ID);
    const hasGoogleSecret = Boolean(value.AUTH_GOOGLE_SECRET);

    if (hasGoogleId !== hasGoogleSecret) {
      context.addIssue({
        code: "custom",
        message: "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be set together.",
        path: [hasGoogleId ? "AUTH_GOOGLE_SECRET" : "AUTH_GOOGLE_ID"],
      });
    }

    if (value.VERCEL_ENV === "production") {
      if (!value.NEXT_PUBLIC_APP_URL) {
        context.addIssue({
          code: "custom",
          message: "NEXT_PUBLIC_APP_URL is required for Vercel Production.",
          path: ["NEXT_PUBLIC_APP_URL"],
        });
      }

      if (!hasGoogleId || !hasGoogleSecret) {
        context.addIssue({
          code: "custom",
          message: "Google OAuth credentials are required for Vercel Production.",
          path: ["AUTH_GOOGLE_ID"],
        });
      }
    }

    const isLocalGoogleOAuth =
      !value.VERCEL_ENV && hasGoogleId && hasGoogleSecret;

    if (isLocalGoogleOAuth && !value.NEXT_PUBLIC_APP_URL) {
      context.addIssue({
        code: "custom",
        message: "NEXT_PUBLIC_APP_URL is required for local Google OAuth.",
        path: ["NEXT_PUBLIC_APP_URL"],
      });
    }
  });

export function parseEnvironment(source: NodeJS.ProcessEnv) {
  const parsed = rawEnvSchema.parse(source);
  const isPreview = parsed.VERCEL_ENV === "preview";
  const inferredVercelUrl = parsed.VERCEL_URL
    ? `https://${parsed.VERCEL_URL}`
    : undefined;
  const appUrl =
    parsed.NEXT_PUBLIC_APP_URL ??
    inferredVercelUrl ??
    "http://localhost:3000";

  return {
    ...parsed,
    APP_URL: appUrl.replace(/\/+$/, ""),
    GOOGLE_AUTH_ENABLED:
      !isPreview &&
      Boolean(parsed.AUTH_GOOGLE_ID && parsed.AUTH_GOOGLE_SECRET),
    IS_PREVIEW: isPreview,
    IS_PRODUCTION: parsed.VERCEL_ENV === "production",
  };
}
