import Link from "next/link";
import { auth } from "@/auth";
import { PublicHeader } from "@/components/public-header";
import { env } from "@/lib/env";

export default async function NotFound() {
  const session = await auth();

  return (
    <>
      <PublicHeader
        demoEnabled={env.DEMO_ENABLED}
        signedIn={Boolean(session?.user?.id)}
      />
      <main id="content" className="page" tabIndex={-1}>
        <section className="state-panel">
          <h1>Page not found</h1>
          <p className="lede">
            This route does not point to available training evidence.
          </p>
          <div className="actions">
            <Link className="button" href="/">
              Go home
            </Link>
            <Link className="button-secondary" href="/logs">
              Open logs
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
