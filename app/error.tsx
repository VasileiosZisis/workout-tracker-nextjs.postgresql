"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <section className="state-panel">
        <h1>Something went wrong</h1>
        <p className="lede">
          The page failed while loading training evidence. Try again or return
          to your logs.
        </p>
        <div className="actions">
          <button className="button" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="button-secondary" href="/logs">
            Open logs
          </Link>
        </div>
      </section>
    </main>
  );
}
