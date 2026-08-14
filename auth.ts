import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Postmark from "next-auth/providers/postmark";
import { headers } from "next/headers";
import { deleteDemoUser } from "@/features/demo/lifecycle";
import { authAdapter } from "@/lib/auth-adapter";
import { checkEmailSignInRateLimit } from "@/lib/auth-email-rate-limit";
import { authSessionCookie } from "@/lib/auth-session";
import { env } from "@/lib/env";

const providers = [
  ...(env.GOOGLE_AUTH_ENABLED
    ? [
        Google({
          clientId: env.AUTH_GOOGLE_ID!,
          clientSecret: env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : []),
  ...(env.EMAIL_AUTH_ENABLED
    ? [
        Postmark({
          apiKey: env.POSTMARK_SERVER_TOKEN!,
          from: env.AUTH_EMAIL_FROM!,
          maxAge: 24 * 60 * 60,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: {
    strategy: "database",
  },
  cookies: {
    sessionToken: authSessionCookie,
  },
  pages: {
    error: "/login",
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  providers,
  callbacks: {
    async signIn({ account, email, user }) {
      if (
        account?.provider === "postmark" &&
        email?.verificationRequest
      ) {
        if (!user.email) {
          return false;
        }

        const requestHeaders = await headers();
        const isAllowed = await checkEmailSignInRateLimit(
          user.email,
          requestHeaders,
        );

        if (!isAllowed) {
          return "/login?error=EmailRateLimited";
        }
      }

      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.isDemo = Boolean(user.demoExpiresAt);
        session.user.demoExpiresAt = user.demoExpiresAt ?? null;
      }

      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("session" in message && message.session?.userId) {
        await deleteDemoUser(message.session.userId);
      }
    },
  },
});
