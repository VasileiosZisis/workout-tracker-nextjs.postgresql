import type { Metadata } from "next";
import Link from "next/link";

const pageDescription =
  "Read the terms that apply when you use Workout Trackr to record and review your training data.";
const pageTitle = "Terms of Service";
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
    canonical: "/terms",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    images: [socialImage],
    type: "website",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="page legal-page">
      <header className="page-header legal-header">
        <p className="eyebrow">Using the service</p>
        <h1>Terms of Service</h1>
        <p className="legal-updated">
          Last updated: <time dateTime="2026-08-09">August 9, 2026</time>
        </p>
        <p className="legal-intro">
          These Terms are an agreement between you and Vasilis Zisis, the
          operator of Workout Trackr in Cyprus. They explain the rules that
          apply when you access or use the service.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section" aria-labelledby="terms-acceptance">
          <h2 id="terms-acceptance">Accepting these Terms</h2>
          <p>
            By signing in, starting a demo workspace, or otherwise using Workout
            Trackr, you agree to these Terms. If you do not agree, do not use the
            service. These Terms apply each time you access Workout Trackr.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-eligibility">
          <h2 id="terms-eligibility">Eligibility and accounts</h2>
          <p>
            You must be at least 16 years old and legally able to enter into
            these Terms. Workout Trackr uses Google sign-in, so you must also
            comply with the terms that apply to your Google Account.
          </p>
          <p>
            You are responsible for activity under your account and for keeping
            access to your Google Account and devices secure. Tell us promptly
            at{" "}
            <a href="mailto:admin@workouttrackr.com">
              admin@workouttrackr.com
            </a>{" "}
            if you believe your Workout Trackr account has been accessed without
            permission.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-service">
          <h2 id="terms-service">The service</h2>
          <p>
            Workout Trackr is currently a free service for personal,
            non-commercial use. It lets you organise exercises, record
            weightlifting and pace sessions, calculate training metrics, and
            review progress over time.
          </p>
          <p>
            We may maintain, improve, add, or remove features for legitimate
            product, security, operational, or legal reasons. We do not promise
            that any current feature will always remain available. If paid
            features are introduced, their price and any additional terms will
            be presented before you purchase them.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-use">
          <h2 id="terms-use">Acceptable use</h2>
          <p>You must not:</p>
          <ul>
            <li>use the service for unlawful, fraudulent, or abusive activity;</li>
            <li>access or attempt to access another person&apos;s account or data;</li>
            <li>
              bypass security controls, probe for vulnerabilities without
              permission, or interfere with the service&apos;s operation;
            </li>
            <li>
              distribute malware or use automated activity that unreasonably
              burdens the service or extracts non-public data; or
            </li>
            <li>
              submit content that infringes another person&apos;s rights or that you
              do not have permission to use.
            </li>
          </ul>
        </section>

        <section className="legal-section" aria-labelledby="terms-data">
          <h2 id="terms-data">Your training data</h2>
          <p>
            You retain ownership of the training data and other content you
            enter. You give us a limited, non-exclusive, worldwide licence to
            host, copy, process, and transmit that content only as needed to
            provide, secure, maintain, and support Workout Trackr or comply with
            law. This licence ends when the content is deleted, except for
            limited backup retention or legal obligations described in the
            Privacy Policy.
          </p>
          <p>
            You are responsible for the accuracy of your entries and for having
            the right to submit them. Your account data is private by default.
            Our collection and handling of personal data are explained in the{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section
          className="legal-section legal-notice"
          aria-labelledby="terms-health"
        >
          <h2 id="terms-health">Not medical or professional advice</h2>
          <p>
            Workout Trackr is a recordkeeping and calculation tool. Its metrics,
            charts, and other information are not medical advice, diagnosis,
            treatment, or personalised coaching, and they do not guarantee that
            an activity is safe or suitable for you.
          </p>
          <p>
            Use your own judgement and consult an appropriately qualified health
            or fitness professional when needed. Stop exercising and seek
            appropriate medical help if you experience pain, illness, or another
            concerning symptom. Contact local emergency services in an
            emergency.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-providers">
          <h2 id="terms-providers">Third-party services</h2>
          <p>
            Workout Trackr depends on services such as Google sign-in, Vercel
            hosting, and Neon/Databricks database infrastructure. Your direct use
            of a third-party service may also be governed by that provider&apos;s
            terms. We are not responsible for changes to or outages of services
            outside our reasonable control, but this does not limit rights that
            cannot lawfully be limited.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-availability">
          <h2 id="terms-availability">Availability and changes</h2>
          <p>
            We use reasonable care and skill in operating Workout Trackr, but no
            online service is uninterrupted or error-free. Maintenance,
            technical problems, security incidents, or provider outages may
            temporarily affect access. Calculations also depend on the data you
            enter, so you should review important results and retain your own
            copy of information you cannot afford to lose.
          </p>
          <p>
            If we plan to discontinue the service or materially reduce its core
            functionality, we will provide reasonable notice where practical and
            continue to honour data-access and deletion rights required by law.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-ending">
          <h2 id="terms-ending">Suspension and ending use</h2>
          <p>
            You may stop using Workout Trackr at any time and may request account
            deletion as described in the Privacy Policy. We may restrict or
            suspend access when reasonably necessary to address a breach of
            these Terms, a security risk, unlawful activity, legal requirements,
            or harm to other users or the service.
          </p>
          <p>
            Where appropriate, we will explain the reason and provide a
            reasonable opportunity to correct the issue. We may act immediately
            when delay would create a security, legal, or safety risk.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-liability">
          <h2 id="terms-liability">Disclaimers and liability</h2>
          <p>
            Workout Trackr is provided free of charge and as available. To the
            extent permitted by law, we are not responsible for losses that were
            not reasonably foreseeable when you accepted these Terms or for
            business losses arising from use of a service intended for personal
            use.
          </p>
          <p>
            Nothing in these Terms excludes or limits mandatory consumer rights
            or liability that cannot legally be excluded or limited, including
            liability for fraud or fraudulent misrepresentation, gross
            negligence, or death or personal injury caused by negligence.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-updates">
          <h2 id="terms-updates">Changes to these Terms</h2>
          <p>
            We may update these Terms for valid legal, security, operational, or
            product reasons. The revision date will be updated, and material
            changes will be communicated with reasonable advance notice where
            practical. Changes apply prospectively. If you do not accept an
            update, you may stop using the service and request your data or
            account deletion before it takes effect.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-law">
          <h2 id="terms-law">Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of Cyprus. This choice does not
            deprive you of mandatory consumer protections available under the
            law of your country of residence. Cyprus courts may hear disputes,
            but consumers may also use courts or remedies available to them
            under mandatory local law.
          </p>
          <p>
            Please contact us first so we can try to resolve a concern
            informally. You are not required to use an informal process before
            exercising a legal right.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-general">
          <h2 id="terms-general">General terms</h2>
          <p>
            If a provision of these Terms is found unenforceable, the remaining
            provisions continue to apply. A delay in enforcing a provision does
            not waive the right to enforce it later.
          </p>
        </section>

        <section className="legal-section" aria-labelledby="terms-contact">
          <h2 id="terms-contact">Contact</h2>
          <p>
            For questions about these Terms, contact Vasilis Zisis at{" "}
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
