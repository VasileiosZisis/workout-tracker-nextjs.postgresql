import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { startDemoAction } from "@/features/demo/actions";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Temporary demo",
};

const statusMessages = {
  capacity: {
    title: "The demo is currently full",
    copy: "All temporary workspaces are in use. Please try again later.",
  },
  disabled: {
    title: "The demo is currently unavailable",
    copy: "Temporary workspaces are not enabled in this environment.",
  },
  unavailable: {
    title: "The demo could not be created",
    copy: "Please try again in a moment.",
  },
} as const;

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (session?.user?.id) {
    redirect("/logs");
  }

  const status = params.status as keyof typeof statusMessages | undefined;
  const message = status ? statusMessages[status] : undefined;
  const demoAvailable = env.DEMO_ENABLED && status !== "disabled";

  return (
    <main className="login-page">
      <div className="login-stage">
        <section className="login-story" aria-labelledby="demo-title">
          <div className="login-story-copy">
            <p className="login-kicker">Temporary workspace</p>
            <h1 id="demo-title">Explore the complete training workflow.</h1>
            <p>
              Start with realistic strength and running history, then create,
              edit, and delete anything without connecting a Google account.
            </p>
          </div>

          <figure className="login-preview">
            <Image
              src="/home/tempo-progress.png"
              alt="Tempo Run progress with pace, distance, speed, and historical charts"
              width={1016}
              height={837}
              priority
              sizes="(max-width: 820px) 100vw, 62vw"
            />
            <figcaption>
              <span>Private sandbox</span>
              Seeded data for one visitor only
            </figcaption>
          </figure>
        </section>

        <section className="login-access" aria-labelledby="demo-access-title">
          <div className="login-access-inner">
            <div className="login-access-heading">
              <p className="login-status">
                <span aria-hidden="true" />
                No sign-in required
              </p>
              <h2 id="demo-access-title">Try Workout Trackr</h2>
            </div>

            {message ? (
              <div className="login-unavailable" role="status">
                <strong>{message.title}</strong>
                <p>{message.copy}</p>
              </div>
            ) : null}

            {demoAvailable ? (
              <form className="login-form" action={startDemoAction}>
                <button className="button login-google-button" type="submit">
                  Start temporary demo
                </button>
              </form>
            ) : null}

            <p className="login-trust">
              Your workspace is isolated from other visitors and permanently
              deleted after two hours or when you exit the demo.
            </p>
            <Link className="login-back" href="/login">
              <span aria-hidden="true">←</span> Sign in with Google instead
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
