import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { getSafeRedirectTo } from "@/lib/auth-redirect";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
};

// Temporarily hidden while Postmark investigates accepted emails that are not delivered.
const EMAIL_SIGN_IN_VISIBLE = false;

const loginErrorMessages: Record<string, string> = {
  EmailRateLimited:
    "Too many sign-in links were requested. Wait 15 minutes and try again.",
  EmailSignin:
    "We could not send the sign-in email. Check the address and try again.",
  OAuthAccountNotLinked:
    "This email is already associated with another sign-in method. Use your original sign-in option.",
  Verification:
    "This sign-in link is invalid, expired, or has already been used.",
};

function getLoginErrorMessage(error: string | string[] | undefined) {
  const errorCode = Array.isArray(error) ? error[0] : error;

  if (!errorCode) {
    return undefined;
  }

  return (
    loginErrorMessages[errorCode] ??
    "We could not sign you in. Try again or use another sign-in option."
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    error?: string | string[];
  }>;
}) {
  const [session, { callbackUrl, error }] = await Promise.all([
    auth(),
    searchParams,
  ]);
  const redirectTo = getSafeRedirectTo(callbackUrl);
  const errorMessage = getLoginErrorMessage(error);
  const emailSignInVisible =
    EMAIL_SIGN_IN_VISIBLE && env.EMAIL_AUTH_ENABLED;
  const signInAvailable = env.GOOGLE_AUTH_ENABLED || emailSignInVisible;

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <main className="login-page">
      <div className="login-stage">
        <section className="login-story" aria-labelledby="login-title">
          <div className="login-story-copy">
            <h1 id="login-title">Pick up where your training left off.</h1>
          </div>

          <figure className="login-preview">
            <Image
              src="/home/bench-progress.png"
              alt="Bench Press progress view showing training metrics and a performance chart"
              width={1016}
              height={840}
              priority
              sizes="(max-width: 820px) 100vw, 62vw"
            />
            <figcaption>
              <span>Bench Press</span>
              Progress backed by recorded sessions
            </figcaption>
          </figure>
        </section>

        <section className="login-access" aria-labelledby="login-access-title">
          <div className="login-access-inner">
            <div className="login-access-heading">
              <p className="login-status">
                <span aria-hidden="true" />
                Your private training record
              </p>
              <h2 id="login-access-title">Sign in</h2>
            </div>

            {errorMessage ? (
              <div className="login-error" role="alert">
                <strong>Sign-in unsuccessful</strong>
                <p>{errorMessage}</p>
              </div>
            ) : null}

            {signInAvailable ? (
              <div className="login-options">
                {env.GOOGLE_AUTH_ENABLED ? (
                  <form
                    className="login-form"
                    action={async () => {
                      "use server";
                      await signIn("google", { redirectTo });
                    }}
                  >
                    <button
                      className="button login-google-button"
                      type="submit"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                      >
                        <path
                          fill="currentColor"
                          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.97-3.39.97-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
                        />
                        <path
                          fill="currentColor"
                          d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 6c1.47 0 2.79.51 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  </form>
                ) : null}

                {env.GOOGLE_AUTH_ENABLED && emailSignInVisible ? (
                  <div className="login-separator" aria-hidden="true">
                    <span />
                    or
                    <span />
                  </div>
                ) : null}

                {emailSignInVisible ? (
                  <form
                    className="login-form login-email-form"
                    action={async (formData) => {
                      "use server";
                      const email = formData.get("email");

                      await signIn("postmark", {
                        email: typeof email === "string" ? email : "",
                        redirectTo,
                      });
                    }}
                  >
                    <label className="login-email-label" htmlFor="login-email">
                      Email address
                    </label>
                    <input
                      autoComplete="email"
                      className="login-email-input"
                      id="login-email"
                      inputMode="email"
                      maxLength={320}
                      name="email"
                      placeholder="you@example.com"
                      required
                      spellCheck={false}
                      type="email"
                    />
                    <button
                      className="button-secondary login-email-button"
                      type="submit"
                    >
                      Continue with email
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="login-unavailable" role="status">
                <strong>Sign-in is currently unavailable</strong>
                <p>
                  {env.IS_PREVIEW
                    ? "Sign-in is disabled for preview deployments."
                    : "No sign-in provider is configured for this environment."}
                </p>
              </div>
            )}

            {env.DEMO_ENABLED ? (
              <Link className="button-secondary login-demo-button" href="/demo">
                Try the temporary demo
              </Link>
            ) : null}

            <p className="login-trust">
              Your account is used only to secure and retrieve your personal
              training data. By continuing, you agree to the{" "}
              <Link href="/terms">Terms of Service</Link> and acknowledge the{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <Link className="login-back" href="/">
              <span aria-hidden="true">←</span> Back to homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
