import type { Metadata } from "next";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
};

function getSafeRedirectTo(callbackUrl: string | undefined) {
  if (!callbackUrl) {
    return "/logs";
  }

  if (callbackUrl.startsWith("/")) {
    return callbackUrl;
  }

  try {
    const url = new URL(callbackUrl);
    const appUrl = new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
    );

    if (url.origin === appUrl.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return "/logs";
  }

  return "/logs";
}

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
        <p className="eyebrow">Auth foundation</p>
        <h1>Login</h1>
        <p className="lede">
          Continue with Google to access your workout logs.
        </p>
        <form
          className="actions"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button className="button" type="submit">
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}
