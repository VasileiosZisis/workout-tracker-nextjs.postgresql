import type { Metadata } from "next";
import { auth, signIn } from "@/auth";
import { getSafeRedirectTo } from "@/lib/auth-redirect";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const redirectTo = getSafeRedirectTo(callbackUrl);

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <main className="page">
      <section className="page-header">
        <h1>Sign in</h1>
        {env.GOOGLE_AUTH_ENABLED ? (
          <form
            className="actions"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button className="button" type="submit">
              Sign in with Google
            </button>
          </form>
        ) : (
          <p className="lede">
            {env.IS_PREVIEW
              ? "Google sign-in is disabled for preview deployments."
              : "Google sign-in is not configured for this environment."}
          </p>
        )}
      </section>
    </main>
  );
}
