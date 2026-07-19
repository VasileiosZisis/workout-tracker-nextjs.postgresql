import { env } from "@/lib/env";

const useSecureCookies = env.APP_URL.startsWith("https://");

export const authSessionCookie = {
  name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: useSecureCookies,
  },
};
