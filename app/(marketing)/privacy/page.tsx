import type { Metadata } from "next";

const pageDescription =
  "Learn how Workout Trackr collects, uses, stores, and protects your account and training data.";
const pageTitle = "Privacy Policy";
const socialImage = {
  alt: "Workout Trackr homepage alongside a Bench Press progress dashboard",
  height: 630,
  type: "image/png",
  url: "/brand/social-preview.png",
  width: 1201,
};

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    images: [socialImage],
    type: "website",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="page legal-page">
      <header className="page-header legal-header">
        <p className="eyebrow">Your data</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">
          Last updated: <time dateTime="2026-08-09">August 9, 2026</time>
        </p>
        <p className="legal-intro">
          Workout Trackr is operated by Vasilis Zisis in Cyprus. This policy
          explains what personal data the service processes, why it is needed,
          and the choices you have.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section" aria-labelledby="privacy-data">
          <h2 id="privacy-data">Data we collect</h2>
          <p>Depending on how you use Workout Trackr, we process:</p>
          <ul>
            <li>
              <strong>Google account data:</strong> your Google account
              identifier, name, email address, email verification status, and
              profile image when available.
            </li>
            <li>
              <strong>Authentication data:</strong> session identifiers and the
              OAuth credentials Google provides to keep your account signed in
              securely. Workout Trackr does not receive your Google password.
            </li>
            <li>
              <strong>Training data:</strong> log and exercise names, workout
              dates, repetitions, weights, hard-set selections, durations,
              distances, and calculated performance metrics.
            </li>
            <li>
              <strong>Technical data:</strong> hosting and security logs may
              include your IP address, browser or device information, requested
              pages, timestamps, and diagnostic information.
            </li>
            <li>
              <strong>Correspondence:</strong> information you include when you
              contact us about support, privacy, or another request.
            </li>
          </ul>
        </section>

        <section className="legal-section" aria-labelledby="privacy-use">
          <h2 id="privacy-use">How and why we use your data</h2>
          <p>We use personal data to:</p>
          <ul>
            <li>authenticate you and protect your account;</li>
            <li>save, calculate, and display your private training record;</li>
            <li>operate, troubleshoot, secure, and improve the service;</li>
            <li>respond to support and privacy requests; and</li>
            <li>comply with legal obligations and enforce legal rights.</li>
          </ul>
          <p>
            Where the GDPR applies, these activities rely on performing the
            service you request, our legitimate interests in running a secure
            and reliable service, compliance with legal obligations, and consent
            where we specifically ask for it. You may withdraw consent at any
            time when processing depends on consent.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-google">
          <h2 id="privacy-google">Google sign-in</h2>
          <p>
            Workout Trackr uses Google OAuth to create and secure your account.
            Google account data received through sign-in is used only for
            authentication, account security, and retrieving your private
            training data. It is not sold, used for advertising, or transferred
            for unrelated purposes.
          </p>
          <p>
            Google processes information under its own{" "}
            <a href="https://policies.google.com/privacy">Privacy Policy</a>
            . You can also review or revoke Workout Trackr&apos;s access through
            your Google Account settings.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-cookies">
          <h2 id="privacy-cookies">Cookies</h2>
          <p>
            Workout Trackr uses a strictly necessary Auth.js session cookie to
            keep you signed in and associate requests with your private account.
            It is HTTP-only, uses secure settings in production, and expires
            when the authentication session ends. Blocking it prevents sign-in
            and authenticated features from working.
          </p>
          <p>
            Workout Trackr currently does not use analytics, advertising,
            behavioural-tracking, or marketing cookies. Because the session
            cookie is necessary to provide the service you request, it is not
            presented as an optional cookie.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-sharing">
          <h2 id="privacy-sharing">Service providers and sharing</h2>
          <p>
            We do not sell personal data or share it for targeted advertising.
            We use the following providers to operate Workout Trackr:
          </p>
          <ul>
            <li>
              <strong>Google</strong> for sign-in and account authentication:{" "}
              <a href="https://policies.google.com/privacy">privacy policy</a>.
            </li>
            <li>
              <strong>Vercel</strong> for application hosting, delivery, and
              operational logs:{" "}
              <a href="https://vercel.com/legal/privacy-notice">
                privacy notice
              </a>
              .
            </li>
            <li>
              <strong>Neon/Databricks</strong> for managed PostgreSQL database
              services:{" "}
              <a href="https://www.databricks.com/legal/privacynotice">
                privacy notice
              </a>
              .
            </li>
          </ul>
          <p>
            Data may also be disclosed when required by law, to protect users or
            the service, or as part of a business reorganisation where
            appropriate safeguards apply.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-retention">
          <h2 id="privacy-retention">How long we keep data</h2>
          <ul>
            <li>
              Account and training data are retained while your account is in
              use and until you ask us to delete the account.
            </li>
            <li>
              Training records you delete through the app are removed from the
              active database with their related data.
            </li>
            <li>
              Temporary demo workspaces expire after two hours and are removed
              when you exit the demo or by scheduled cleanup after expiration.
            </li>
            <li>
              Authentication sessions are retained until they expire, are
              replaced, or you sign out.
            </li>
            <li>
              Technical logs and backup copies may remain for a limited period
              under provider retention schedules or where required for security
              and legal obligations.
            </li>
          </ul>
        </section>

        <section className="legal-section" aria-labelledby="privacy-rights">
          <h2 id="privacy-rights">Your rights and choices</h2>
          <p>
            Depending on where you live, you may have the right to access,
            correct, export, or delete your personal data; restrict or object to
            processing; and withdraw consent where consent is the legal basis.
            You may also complain to your local data-protection authority.
          </p>
          <p>
            To request account deletion, a copy of your data, or help exercising
            another privacy right, email{" "}
            <a href="mailto:admin@workouttrackr.com">
              admin@workouttrackr.com
            </a>
            . We may need to verify that the request belongs to you before
            acting on it.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-transfers">
          <h2 id="privacy-transfers">International processing</h2>
          <p>
            Our service providers may process data in countries outside your
            own. Where required, we rely on contractual and other safeguards
            intended to protect personal data during international transfers.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-security">
          <h2 id="privacy-security">Security</h2>
          <p>
            We use reasonable technical and organisational safeguards, including
            encrypted connections, restricted database access, secure session
            cookies, and access controls. No online service can guarantee
            absolute security.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-children">
          <h2 id="privacy-children">Children&apos;s privacy</h2>
          <p>
            Workout Trackr is not intended for children under 16, and we do not
            knowingly collect their personal data. If you believe a child under
            16 has provided personal data, contact us so we can investigate and
            delete it where appropriate.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="privacy-changes">
          <h2 id="privacy-changes">Changes and contact</h2>
          <p>
            We may update this policy when the service or legal requirements
            change. The date at the top shows the latest revision. Material
            changes will be communicated through an appropriate notice.
          </p>
          <p>
            For questions or privacy requests, contact Vasilis Zisis at{" "}
            <a href="mailto:admin@workouttrackr.com">
              admin@workouttrackr.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
