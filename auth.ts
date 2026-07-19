import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { deleteDemoUser } from "@/features/demo/lifecycle";
import { authAdapter } from "@/lib/auth-adapter";
import { authSessionCookie } from "@/lib/auth-session";
import { env } from "@/lib/env";

const providers = env.GOOGLE_AUTH_ENABLED
  ? [
      Google({
        clientId: env.AUTH_GOOGLE_ID!,
        clientSecret: env.AUTH_GOOGLE_SECRET!,
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: {
    strategy: "database",
  },
  cookies: {
    sessionToken: authSessionCookie,
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
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
