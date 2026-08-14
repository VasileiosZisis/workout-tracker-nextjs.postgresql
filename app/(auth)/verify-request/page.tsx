import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email",
};

export default function VerifyRequestPage() {
  return (
    <main className="page auth-message-page">
      <section className="auth-message-card" aria-labelledby="verify-title">
        <p className="eyebrow">Email sent</p>
        <h1 id="verify-title">Check your inbox</h1>
        <p>
          Open the sign-in link we sent to your email address. The link can be
          used once and expires after 24 hours.
        </p>
        <p className="auth-message-note">
          If it does not arrive, check your spam folder or request another
          link. You can safely ignore the email if you did not request it.
        </p>
        <Link className="button-secondary auth-message-action" href="/login">
          Use another email
        </Link>
      </section>
    </main>
  );
}
