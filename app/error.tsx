"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <section className="page-header">
        <p className="eyebrow">Error</p>
        <h1>Something went wrong</h1>
        <p className="lede">{error.message || "The page failed to load."}</p>
        <div className="actions">
          <button className="button" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
